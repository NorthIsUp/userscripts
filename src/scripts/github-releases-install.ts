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
// "Missing" needs to know what you already have, and no manager will say so
// from here: Tampermonkey and Violentmonkey expose `external.<Manager>
// .isInstalled` only on the script-hosting sites they allow-list (Tampermonkey
// 5.6 closed it everywhere else), and one script's storage is invisible to
// another. So the scripts answer for themselves. The build gives every script
// in this repo an extra @match for this repo's releases page and a beacon that
// runs before anything else (build/beacon.mjs): it drops a
// <meta name="userscript-beacon"> tag carrying the script's name, namespace and
// version, then bails out unless the script's own @match covers the page. What
// the buttons show is therefore what is running right now — nothing is
// remembered, and a script that was uninstalled (or disabled) simply isn't
// there. Scripts from other repos don't announce themselves, so on their
// releases pages every button just reads "Install".
//
// The buttons are markup + one stylesheet; nothing is written to element.style.

import { DataStore, GMStorageEngine } from '@sv443-network/userutils';
import { observeDom } from '../lib/dom';
import type { ScriptMeta } from '../lib/meta';
import { toast } from '../lib/ui';
import { compareVersions } from '../lib/version';

export const meta: ScriptMeta = {
  name: 'Code Helpers: GitHub Releases — Install Userscripts',
  version: '1.3.0',
  description:
    'Install buttons beside every .user.js asset on a repo\'s releases page, plus "install all missing", installing from each script\'s own @downloadURL so the browser gets a page instead of a download. Installed state is read live from the scripts running on the page.',
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

/** What a running script says about itself, via its beacon tag. */
type Beacon = { name: string; namespace: string; version: string };

type Store = {
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
  [${BUTTON}][data-state='older'],
  [${BUTTON}][data-state='pending'] { opacity: .55; }

  [${ALL_ROW}] { display: flex; align-items: center; gap: 10px; }
  [${ALL_ROW}] .note { font-size: 12px; color: var(--fgColor-muted, #848d97); }
`;

// Persistence via UserUtils' DataStore: it owns the GM storage keys, the format
// version and the migration chain.
const store = new DataStore<Store>({
  id: 'gh-releases-install',
  defaultData: { headers: {}, hintSeen: false },
  formatVersion: 2,
  engine: new GMStorageEngine(),
  compressionFormat: null,
  migrations: {
    // v1 also kept `installed`, our own record of clicks; the beacons made it
    // redundant, and a stale record is worse than none.
    2: (old: Partial<Store>) => ({ headers: old.headers ?? {}, hintSeen: Boolean(old.hintSeen) }),
  },
});

let data: Store = { headers: {}, hintSeen: false };
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

type State = 'install' | 'update' | 'installed' | 'older' | 'pending';

// ────────────────────────────────────────────────────────────────────────
//  What is running on this page. Every script built from this repo announces
//  itself with a <meta name="userscript-beacon"> tag (see the note up top).
//  Seen tags are kept in memory: GitHub's soft navigation rewrites <head>,
//  but a script that announced once is still running in this document.
// ────────────────────────────────────────────────────────────────────────
const beacons = new Map<string, Beacon>();

/** A manager identifies a script by @namespace + @name; so do we. */
function identity(namespace: string, name: string): string {
  return `${namespace}\u0000${name}`;
}

function collectBeacons() {
  for (const tag of document.querySelectorAll<HTMLElement>('meta[name="userscript-beacon"]')) {
    const { name = '', namespace = '', version = '' } = tag.dataset;
    if (!name && !namespace) continue;
    beacons.set(identity(namespace, name), { name, namespace, version });
  }
}

/** Assets whose install tab was opened in this page's lifetime. In memory only:
 *  whether the install actually happened is the beacon's to say, after a reload. */
const pending = new Set<string>();

function stateOf(asset: Asset): { state: State; label: string; title: string } {
  const header = data.headers[asset.url];

  if (pending.has(asset.url)) {
    return {
      state: 'pending',
      label: 'Installing…',
      title: `${asset.file} — an install tab was opened. Reload this page to see whether it took.`,
    };
  }
  if (!header) {
    return { state: 'install', label: 'Install', title: `${asset.file} — reading its version…` };
  }

  const running = beacons.get(identity(header.namespace, header.name));
  if (!running) {
    return {
      state: 'install',
      label: `Install ${header.version}`,
      title:
        `${header.name} ${header.version} — not running on this page (not installed, disabled, ` +
        `or a script that doesn't announce itself). Installs from ${header.downloadURL}`,
    };
  }

  const order = compareVersions(header.version, running.version);
  if (order === 0) {
    return {
      state: 'installed',
      label: `Installed ${running.version}`,
      title: `Up to date — ${running.name} ${running.version} is running on this page. Click to install again.`,
    };
  }
  if (order > 0) {
    return {
      state: 'update',
      label: `Update → ${header.version}`,
      title: `You have ${running.version} running; this release has ${header.version}.`,
    };
  }
  return {
    state: 'older',
    label: `Older ${header.version}`,
    title: `This release predates what you have running (${running.version}).`,
  };
}

function needsInstall(asset: Asset): boolean {
  const state = stateOf(asset).state;
  return state === 'install' || state === 'update';
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
  // The author's own install URL is served inline as text where the release
  // asset is served as a download, so prefer it whenever the header gave us one.
  GM.openInTab(header?.downloadURL ?? asset.url, background);
  hintOnce();

  // Whatever the manager does with that tab, this page can't see it: a newly
  // installed script only announces itself on the next load.
  pending.add(asset.url);
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
      save();
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
  // Before storage answers, no header is cached and every row would read a
  // bare "Install" — a label that would then flip under the pointer.
  if (!loaded) return;

  const assets = assetsOnPage();
  if (!assets.length) return;
  ensureStyle();
  collectBeacons();

  const missing = new Map<HTMLElement, number>();
  for (const asset of assets) {
    readHeader(asset);
    button(asset);
    missing.set(asset.list, (missing.get(asset.list) ?? 0) + (needsInstall(asset) ? 1 : 0));
  }
  for (const [list, count] of missing) allRow(list, count);
}

// Assets live behind a lazily-loaded <include-fragment>, so the rows appear
// well after load — on the releases index, only once a release is expanded.
observeDom(render);
