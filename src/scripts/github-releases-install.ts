// HOW THIS WORKS — a release asset is served with `Content-Disposition:
// attachment`, so navigating to one saves the file: the browser never renders
// it, and a userscript manager never sees a page to offer an install on. We
// can't change that header, so the button doesn't send you there when it has
// anywhere better to go. It reads the asset's own metadata block (the first few
// KB, over GM.xmlHttpRequest) and installs from the `@downloadURL` the author
// declared, which is nearly always a raw/CDN URL served inline as text — the
// shape every manager intercepts. Only with no @downloadURL does it fall back
// to the asset itself.
//
// "Missing" needs to know what you already have. Tampermonkey and Violentmonkey
// both answer that through `external.<Manager>.isInstalled(name, namespace)`,
// so where it is exposed the state on screen is the manager's own truth. Where
// it isn't, the script falls back to its own record of installs made through
// these buttons — shift-click a pill to forget one, or use the menu commands.
//
// The buttons are markup + one stylesheet; nothing is written to element.style.

import { DataStore, GMStorageEngine } from '@sv443-network/userutils';
import { observeDom } from '../lib/dom';
import type { ScriptMeta } from '../lib/meta';
import { menuCommand, toast } from '../lib/ui';
import { compareVersions } from '../lib/version';

export const meta: ScriptMeta = {
  name: 'Code Helpers: GitHub Releases — Install Userscripts',
  version: '1.2.0',
  description:
    'Install buttons beside every .user.js asset on a repo\'s releases page, plus "install all missing", installing from each script\'s own @downloadURL so the browser gets a page instead of a download.',
  match: ['https://github.com/*/*/releases*'],
  runAt: 'document-idle',
  icon: 'github',
  // GM.* (not GM_*) — that is what DataStore's GMStorageEngine calls.
  grant: [
    'GM.getValue',
    'GM.setValue',
    'GM.deleteValue',
    'GM.listValues',
    'GM.openInTab',
    'GM.xmlHttpRequest',
    'GM_registerMenuCommand',
    'unsafeWindow',
  ],
  // Asset URLs redirect off github.com, so both hosts have to be reachable.
  connect: ['github.com', 'objects.githubusercontent.com'],
};
/** One `.user.js` row in a release's assets list. */
type Asset = {
  /** Absolute asset URL — immutable, so it doubles as the header cache key. */
  url: string;
  /** "owner/repo/file.user.js": the identity we track installs by. */
  key: string;
  /** e.g. "github-tokens-link.user.js". */
  file: string;
  /** The release this asset belongs to, e.g. "v13". */
  tag: string;
  row: HTMLElement;
  /** The <ul> of asset rows, one per release on the page. */
  list: HTMLElement;
};

/** What an asset's own metadata block says about it. */
type Header = {
  name: string;
  namespace: string;
  version: string;
  /** Where the author says to install from; the asset URL if they didn't say. */
  downloadURL: string;
};

/** A manager's answer about a script, when it exposes one. */
type Managed = { installed: boolean; version: string | null };

/** Our own record, for managers that answer nothing. Null version: the header
 *  hadn't loaded when you clicked, and gets backfilled when it does. */
type Install = { version: string | null; tag: string; at: number };

type Store = {
  installed: Record<string, Install>;
  /** asset URL → its parsed metadata block. */
  headers: Record<string, Header>;
  /** The "your browser may just download it" explainer, shown once. */
  hintSeen: boolean;
};

const BUTTON = 'data-userscript-install';
const ALL_ROW = 'data-userscript-install-all';
const STYLE = 'userscript-install-style';

const CSS = `
  [${BUTTON}] {
    font: inherit;
    font-size: 12px;
    line-height: 20px;
    cursor: pointer;
    margin-left: 8px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--borderColor-default, rgba(128, 128, 128, .4));
    background: var(--bgColor-default, transparent);
    color: var(--fgColor-default, inherit);
    white-space: nowrap;
  }
  [${BUTTON}]:hover { background: var(--bgColor-neutral-muted, rgba(128, 128, 128, .15)); }
  [${BUTTON}][data-state='install'] {
    border-color: var(--borderColor-success-emphasis, #238636);
    color: var(--fgColor-success, #3fb950);
  }
  [${BUTTON}][data-state='update'] {
    border-color: var(--borderColor-attention-emphasis, #9e6a03);
    color: var(--fgColor-attention, #d29922);
  }
  [${BUTTON}][data-state='installed'],
  [${BUTTON}][data-state='older'] { opacity: .55; }

  [${ALL_ROW}] { display: flex; align-items: center; gap: 10px; }
  [${ALL_ROW}] .note { font-size: 12px; color: var(--fgColor-muted, #848d97); }
`;

// Persistence via UserUtils' DataStore: it owns the GM storage keys, the format
// version and the migration chain.
const store = new DataStore<Store>({
  id: 'gh-releases-install',
  defaultData: { installed: {}, headers: {}, hintSeen: false },
  formatVersion: 1,
  engine: new GMStorageEngine(),
  compressionFormat: null,
  migrations: {},
});

let data: Store = { installed: {}, headers: {}, hintSeen: false };
let loaded = false;

function save() {
  // Fire and forget: the in-memory copy is what the page renders from, and a
  // storage failure must not take the buttons down.
  store.setData(data).catch((e) => console.error('[releases-install] save failed', e));
}

store
  .loadData()
  .then((saved) => {
    // Field-wise, and ours wins: rendering starts before this resolves, so a
    // header read or an install click may already have written to `data`.
    data = {
      installed: { ...saved.installed, ...data.installed },
      headers: { ...saved.headers, ...data.headers },
      hintSeen: saved.hintSeen || data.hintSeen,
    };
  })
  .catch((e) => console.error('[releases-install] load failed', e))
  .finally(() => {
    loaded = true;
    render();
  });

const ASSET_PATH = /^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/([^/]+\.user\.js)$/;

/** Every `.user.js` asset row rendered right now, one entry per asset URL. */
function assetsOnPage(): Asset[] {
  const assets = new Map<string, Asset>();
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/releases/download/"]',
  )) {
    const href = link.getAttribute('href') || '';
    const match = ASSET_PATH.exec(href.split(/[?#]/)[0]);
    if (!match) continue;
    const row = link.closest<HTMLElement>('li');
    const list = row?.closest<HTMLElement>('ul');
    if (!row || !list) continue;
    const [, owner, repo, tag, file] = match;
    const url = new URL(href, location.origin).href;
    // A row can carry more than one link to the same asset; first one wins.
    if (!assets.has(url)) {
      assets.set(url, { url, key: `${owner}/${repo}/${file}`, file, tag, row, list });
    }
  }
  return [...assets.values()];
}

type State = 'install' | 'update' | 'installed' | 'older';

/** What we believe is installed: the manager's answer, else our own record. */
function have(asset: Asset): { version: string | null; source: string } | null {
  const managed = managers.get(asset.key);
  if (managed)
    return managed.installed ? { version: managed.version, source: 'your manager' } : null;
  const record = data.installed[asset.key];
  return record ? { version: record.version, source: `recorded from ${record.tag}` } : null;
}

function stateOf(asset: Asset): { state: State; label: string; title: string } {
  const header = data.headers[asset.url];
  const installed = have(asset);

  if (!installed) {
    return {
      state: 'install',
      label: header ? `Install ${header.version}` : 'Install',
      title: header
        ? `${header.name} ${header.version} — installs from ${header.downloadURL}`
        : `${asset.file} — reading its version…`,
    };
  }
  if (!header || !installed.version) {
    return {
      state: 'installed',
      label: installed.version ? `Installed ${installed.version}` : 'Installed',
      title: `${asset.file} — installed (${installed.source}). Click to install again, shift-click to forget.`,
    };
  }

  const order = compareVersions(header.version, installed.version);
  if (order === 0) {
    return {
      state: 'installed',
      label: `Installed ${installed.version}`,
      title: `Up to date (${installed.source}). Click to install again, shift-click to forget.`,
    };
  }
  if (order > 0) {
    return {
      state: 'update',
      label: `Update → ${header.version}`,
      title: `You have ${installed.version} (${installed.source}); this release has ${header.version}.`,
    };
  }
  return {
    state: 'older',
    label: `Older ${header.version}`,
    title: `This release predates what you have (${installed.version}, ${installed.source}).`,
  };
}

function needsInstall(asset: Asset): boolean {
  const state = stateOf(asset).state;
  return state === 'install' || state === 'update';
}

// ────────────────────────────────────────────────────────────────────────
//  What the manager itself knows. Tampermonkey exposes
//  external.Tampermonkey.isInstalled(name, namespace, callback); Violentmonkey
//  exposes external.Violentmonkey.isInstalled(name, namespace) as a promise.
//  Neither is guaranteed to be exposed on an arbitrary site, so every use is
//  feature-detected and failure just means "fall back to our own record".
// ────────────────────────────────────────────────────────────────────────
const managers = new Map<string, Managed>();
const probed = new Set<string>();

type Answer = { installed: boolean; version?: string | null };
type Bridge = {
  isInstalled?: (
    name: string,
    namespace: string,
    cb?: (res: Answer) => void,
  ) => Promise<Answer> | undefined;
};

function bridge(): Bridge | null {
  // The managers hang their object off the page's window, so reach past the
  // sandbox where the userscript manager gives us a way to.
  const win = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
  const ext = (win as unknown as { external?: Record<string, Bridge> }).external;
  const found = ext?.Tampermonkey ?? ext?.Violentmonkey;
  return typeof found?.isInstalled === 'function' ? found : null;
}

function record(key: string, answer: Answer) {
  managers.set(key, { installed: Boolean(answer?.installed), version: answer?.version ?? null });
  render();
}

/** Drop every cached answer so the next render asks the manager again. */
function forgetProbes() {
  probed.clear();
  render();
}

// Coming back from an install tab is exactly when the answer changes.
addEventListener('focus', forgetProbes);
addEventListener('visibilitychange', () => {
  if (!document.hidden) forgetProbes();
});

/** Ask the manager about one script; answers are re-asked on every focus. */
function askManager(asset: Asset) {
  const header = data.headers[asset.url];
  if (!header || probed.has(asset.key)) return;
  const api = bridge();
  if (!api?.isInstalled) return;
  probed.add(asset.key);

  try {
    const maybe = api.isInstalled(header.name, header.namespace, (res) => record(asset.key, res));
    // Violentmonkey answers with a promise and ignores the callback.
    if (maybe && typeof (maybe as Promise<Answer>).then === 'function') {
      (maybe as Promise<Answer>).then((res) => record(asset.key, res)).catch(() => {});
    }
  } catch (e) {
    console.debug('[releases-install] manager lookup unavailable', e);
  }
}

/** Chrome's MV3 Tampermonkey can't intercept .user.js without developer mode. */
function hintOnce() {
  if (data.hintSeen) return;
  data.hintSeen = true;
  save();
  toast({
    text: 'If a tab downloads the file instead of offering to install it, your manager could not intercept the URL — on Chrome, enable Developer mode at chrome://extensions, or paste the URL into the dashboard\'s "Install from URL".',
    duration: 20_000,
  });
}

function install(asset: Asset, background = false) {
  const header = data.headers[asset.url];
  // Only guess where nothing can be asked: with a manager bridge the state is
  // read back from the manager, and a note saying "installed" for an install
  // you cancelled would be worse than no note at all.
  if (!bridge()) {
    data.installed[asset.key] = {
      // Null until the header lands; readHeader backfills it.
      version: header?.version ?? null,
      tag: asset.tag,
      at: Date.now(),
    };
    save();
  }

  // The author's own install URL is served inline as text where the release
  // asset is served as a download, so prefer it whenever the header gave us one.
  GM.openInTab(header?.downloadURL ?? asset.url, background);
  hintOnce();

  // Whatever the manager said before is now stale. It only becomes true once
  // you confirm the install, which takes as long as it takes.
  managers.delete(asset.key);
  probed.delete(asset.key);
  for (const delay of [2_000, 5_000, 10_000, 20_000]) {
    setTimeout(() => {
      probed.delete(asset.key);
      askManager(asset);
      render();
    }, delay);
  }

  render();
}

function forget(asset: Asset) {
  delete data.installed[asset.key];
  save();
  render();
}

function installAll(list: HTMLElement) {
  const missing = assetsOnPage().filter((a) => a.list === list && needsInstall(a));
  if (!missing.length) return;

  toast({
    text: `Opening ${missing.length} install${missing.length === 1 ? '' : 's'} — confirm each in its own tab.`,
    duration: 6_000,
  });
  // Staggered: managers queue their install pages badly when a burst of tabs
  // opens at once, and the browser treats it as a popup flood.
  missing.forEach((asset, i) => setTimeout(() => install(asset, true), i * 700));
}

/** URLs whose header we have asked for: in flight, done, or failed for good. */
const asked = new Set<string>();

function field(text: string, key: string): string {
  return new RegExp(`^//\\s*@${key}\\s+(.+)$`, 'm').exec(text)?.[1]?.trim() ?? '';
}

/** Read the metadata block out of an asset, once per URL, ever. */
function readHeader(asset: Asset) {
  if (data.headers[asset.url] || asked.has(asset.url)) return;
  // Never cleared on failure: render() runs on every DOM mutation, and a
  // cleared guard would turn one dead host into a request storm.
  asked.add(asset.url);

  GM.xmlHttpRequest({
    method: 'GET',
    url: asset.url,
    // The metadata block is the first few lines; no need for the whole bundle
    // (a server that ignores the range just sends everything, which still works).
    headers: { Range: 'bytes=0-4095' },
    onload: (res) => {
      // GM routes HTTP errors here too, and an error body is not a userscript.
      if (res.status >= 400) {
        console.warn('[releases-install] could not read', asset.url, res.status);
        return;
      }
      const text = res.responseText || '';
      const version = field(text, 'version');
      if (!version) return;

      data.headers[asset.url] = {
        name: field(text, 'name') || asset.file,
        namespace: field(text, 'namespace'),
        version,
        downloadURL: field(text, 'downloadURL') || asset.url,
      };
      // An install clicked before the version was known is backfilled here.
      const ours = data.installed[asset.key];
      if (ours && ours.version === null && ours.tag === asset.tag) ours.version = version;

      save();
      askManager(asset);
      render();
    },
    onerror: () => console.warn('[releases-install] could not reach', asset.url),
  });
}

function ensureStyle() {
  if (document.getElementById(STYLE)) return;
  const style = document.createElement('style');
  style.id = STYLE;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function button(asset: Asset) {
  const { state, label, title } = stateOf(asset);
  const existing = asset.row.querySelector<HTMLButtonElement>(`[${BUTTON}]`);
  // Rewriting on every mutation would loop: we're inside a MutationObserver.
  if (existing && existing.textContent === label && existing.dataset.state === state) return;

  const btn = existing ?? document.createElement('button');
  btn.setAttribute(BUTTON, asset.key);
  btn.type = 'button';
  btn.dataset.state = state;
  btn.textContent = label;
  btn.title = title;

  if (!existing) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.shiftKey && data.installed[asset.key]) return forget(asset);
      install(asset);
    });
    // Beside the file name, inside the row's own left-hand cell.
    const link = asset.row.querySelector('a[href*="/releases/download/"]');
    link?.parentElement?.appendChild(btn);
  }
}

function allRow(list: HTMLElement, missing: number) {
  const existing = list.querySelector<HTMLElement>(`[${ALL_ROW}]`);
  const label = missing ? `Install all missing (${missing})` : 'Everything here is installed';
  if (existing?.dataset.label === label) return;

  const row = existing ?? document.createElement('li');
  row.setAttribute(ALL_ROW, 'true');
  row.dataset.label = label;
  // Borrow the assets list's own row class so it lines up with the real rows.
  row.className = list.querySelector('li')?.className || '';
  row.replaceChildren();

  const btn = document.createElement('button');
  btn.setAttribute(BUTTON, 'all');
  btn.type = 'button';
  btn.dataset.state = missing ? 'install' : 'installed';
  btn.textContent = label;
  btn.disabled = missing === 0;
  btn.addEventListener('click', () => installAll(list));
  row.appendChild(btn);

  const note = document.createElement('span');
  note.className = 'note';
  note.textContent = 'Installs open one tab each — confirm them in your userscript manager.';
  row.appendChild(note);

  if (!existing) list.appendChild(row);
}

function render() {
  // Before storage answers, `installed` is empty and every row would read
  // "Install" — a label that would then flip under the pointer.
  if (!loaded) return;

  const assets = assetsOnPage();
  if (!assets.length) return;
  ensureStyle();

  const missing = new Map<HTMLElement, number>();
  for (const asset of assets) {
    readHeader(asset);
    askManager(asset);
    button(asset);
    missing.set(asset.list, (missing.get(asset.list) ?? 0) + (needsInstall(asset) ? 1 : 0));
  }
  for (const [list, count] of missing) allRow(list, count);
}

menuCommand('✅ Mark every asset on this page as installed', () => {
  for (const asset of assetsOnPage()) {
    data.installed[asset.key] = {
      version: data.headers[asset.url]?.version ?? null,
      tag: asset.tag,
      at: Date.now(),
    };
  }
  save();
  render();
  toast({ text: 'Recorded everything on this page as installed.' });
});

menuCommand('🧹 Forget what I have installed', () => {
  data.installed = {};
  save();
  render();
  toast({ text: 'Install records cleared.' });
});

// Assets live behind a lazily-loaded <include-fragment>, so the rows appear
// well after load — on the releases index, only once a release is expanded.
observeDom(render);
