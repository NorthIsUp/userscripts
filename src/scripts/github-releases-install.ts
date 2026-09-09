// HOW THIS WORKS — a release asset is served with `Content-Disposition:
// attachment`, so clicking one saves the file instead of handing it to your
// userscript manager. This script can't change that header, but it can make the
// page useful anyway: an Install button per `.user.js` asset that opens the
// asset in a tab (which is the navigation a manager intercepts), and one
// "Install all missing" per release.
//
// "Missing" needs two facts. The release's version comes from the asset itself
// — GM.xmlHttpRequest reads the first few KB and parses the @version out of the
// header, cached forever because a release asset URL never changes. What you
// have installed can't be read at all: no manager exposes its script list to a
// page, so this keeps its own record of what you installed through these
// buttons. Shift-click a pill to correct it, or use the menu commands.
//
// The buttons are markup + one stylesheet; nothing is written to element.style.

import { DataStore, GMStorageEngine } from '@sv443-network/userutils';
import { observeDom } from '../lib/dom';
import type { ScriptMeta } from '../lib/meta';
import { menuCommand, toast } from '../lib/ui';
import { compareVersions } from '../lib/version';

export const meta: ScriptMeta = {
  name: 'Code Helpers: GitHub Releases — Install Userscripts',
  version: '1.0.0',
  description:
    'Install buttons beside every .user.js asset on a repo\'s releases page, plus "install all missing" per release, with what you already have tracked by version.',
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
  ],
  // Asset URLs redirect off github.com, so both hosts have to be reachable.
  connect: ['github.com', 'objects.githubusercontent.com'],
};
/** One `.user.js` row in a release's assets list. */
type Asset = {
  /** Absolute asset URL — immutable, so it doubles as the header cache key. */
  url: string;
  /** e.g. "github-tokens-link.user.js" — the identity we track installs by. */
  file: string;
  /** The release this asset belongs to, e.g. "v13". */
  tag: string;
  row: HTMLElement;
  /** The <ul> of asset rows, one per release on the page. */
  list: HTMLElement;
};

type Header = { name: string; version: string };
type Install = { version: string; tag: string; at: number };

type Store = {
  /** file → what we last opened an install for. */
  installed: Record<string, Install>;
  /** asset URL → the @name/@version parsed out of it. */
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

function save() {
  // Fire and forget: the in-memory copy is what the page renders from, and a
  // storage failure must not take the buttons down.
  store.setData(data).catch((e) => console.error('[releases-install] save failed', e));
}

store
  .loadData()
  .then((saved) => {
    data = { ...data, ...saved };
    render();
  })
  .catch((e) => console.error('[releases-install] load failed', e));

const ASSET_PATH = /^\/[^/]+\/[^/]+\/releases\/download\/([^/]+)\/([^/]+\.user\.js)$/;

/** Every `.user.js` asset row rendered right now. */
function assetsOnPage(): Asset[] {
  const assets: Asset[] = [];
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/releases/download/"]',
  )) {
    const href = link.getAttribute('href') || '';
    const match = ASSET_PATH.exec(href.split(/[?#]/)[0]);
    if (!match) continue;
    const row = link.closest<HTMLElement>('li');
    const list = row?.closest<HTMLElement>('ul');
    if (!row || !list) continue;
    assets.push({ url: new URL(href, location.origin).href, tag: match[1], file: match[2], row, list });
  }
  return assets;
}

type State = 'install' | 'update' | 'installed' | 'older';

function stateOf(asset: Asset): { state: State; label: string; title: string } {
  const header = data.headers[asset.url];
  const have = data.installed[asset.file];

  if (!header) {
    return {
      state: have ? 'installed' : 'install',
      label: have ? `Installed ${have.version}` : 'Install',
      title: `${asset.file} — reading its version…`,
    };
  }
  if (!have) {
    return {
      state: 'install',
      label: `Install ${header.version}`,
      title: `${header.name || asset.file} ${header.version} — open the install page`,
    };
  }
  const order = compareVersions(header.version, have.version);
  if (order === 0) {
    return {
      state: 'installed',
      label: `Installed ${have.version}`,
      title: `Installed from ${have.tag}. Click to install again, shift-click to forget this record.`,
    };
  }
  if (order > 0) {
    return {
      state: 'update',
      label: `Update → ${header.version}`,
      title: `You have ${have.version} (from ${have.tag}); this release has ${header.version}.`,
    };
  }
  return {
    state: 'older',
    label: `Older ${header.version}`,
    title: `This release predates what you have (${have.version} from ${have.tag}).`,
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
    text: 'If the browser downloads the file instead of showing an install page, your manager could not intercept it — on Chrome, enable Developer mode at chrome://extensions; otherwise paste the URL into the dashboard\'s "Install from URL".',
    duration: 20_000,
  });
}

function install(asset: Asset, background = false) {
  const header = data.headers[asset.url];
  data.installed[asset.file] = {
    version: header?.version ?? '?',
    tag: asset.tag,
    at: Date.now(),
  };
  save();
  GM.openInTab(asset.url, background);
  hintOnce();
  render();
}

function forget(asset: Asset) {
  delete data.installed[asset.file];
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

const reading = new Set<string>();

/** Read @name/@version out of an asset, once per URL, ever. */
function readHeader(asset: Asset) {
  if (data.headers[asset.url] || reading.has(asset.url)) return;
  reading.add(asset.url);

  GM.xmlHttpRequest({
    method: 'GET',
    url: asset.url,
    // The metadata block is the first few lines; no need for the whole bundle
    // (a server that ignores the range just sends everything, which still works).
    headers: { Range: 'bytes=0-4095' },
    onload: (res) => {
      const text = res.responseText || '';
      const version = /^\/\/\s*@version\s+(.+)$/m.exec(text)?.[1]?.trim();
      const name = /^\/\/\s*@name\s+(.+)$/m.exec(text)?.[1]?.trim();
      if (version) {
        data.headers[asset.url] = { name: name || asset.file, version };
        save();
        render();
      }
    },
    onerror: () => reading.delete(asset.url),
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
  btn.setAttribute(BUTTON, asset.file);
  btn.type = 'button';
  btn.dataset.state = state;
  btn.textContent = label;
  btn.title = title;

  if (!existing) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.shiftKey && data.installed[asset.file]) return forget(asset);
      install(asset);
    });
    // Beside the file name, inside the row's own left-hand cell.
    const link = asset.row.querySelector('a[href*="/releases/download/"]');
    link?.parentElement?.appendChild(btn);
  }
}

function allRow(list: HTMLElement, missing: number) {
  const existing = list.querySelector<HTMLElement>(`[${ALL_ROW}]`);
  const label = missing
    ? `Install all missing (${missing})`
    : 'Everything here is installed';
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
  const assets = assetsOnPage();
  if (!assets.length) return;
  ensureStyle();

  const missing = new Map<HTMLElement, number>();
  for (const asset of assets) {
    readHeader(asset);
    button(asset);
    missing.set(asset.list, (missing.get(asset.list) ?? 0) + (needsInstall(asset) ? 1 : 0));
  }
  for (const [list, count] of missing) allRow(list, count);
}

menuCommand('✅ Mark every asset on this page as installed', () => {
  for (const asset of assetsOnPage()) {
    data.installed[asset.file] = {
      version: data.headers[asset.url]?.version ?? '?',
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
