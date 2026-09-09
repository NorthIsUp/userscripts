// HOW THIS WORKS — two halves, and only the first one is JavaScript.
//
//  1. Which PRs are accepted? The list's markup carries no review state, so
//     rather than scrape rows we ask GitHub the question it already answers in
//     its own filter bar: re-run the page's query with `review:approved` bolted
//     on (plus `reviewed-by:@me` for the "mine" mode) as a same-origin fetch,
//     and mark every row that comes back.
//
//     `review:approved` is GitHub's review DECISION, not a raw approval count:
//     on a repo that requires review from code owners it only flips once those
//     owners have approved — which is what "accepted by a codeowner" means
//     here. GitHub has no `approved-by:` qualifier, so "accepted by me" is the
//     closest it can express: approved overall AND I am one of its reviewers.
//
//  2. What does an accepted row look like? Pure CSS. JS sets one attribute on
//     the row and one on <html>; the stylesheet below does the green tint, the
//     dimming, the collapse to a single line, and the hover-to-expand. Nothing
//     is written to element.style, so switching between collapse/dim/hide is a
//     single attribute flip and GitHub re-rendering a row costs us nothing.

import { DataStore, GMStorageEngine } from '@sv443-network/userutils';
import { observeDom, octicon } from '../lib/dom';
import { currentUser } from '../lib/github';
import type { ScriptMeta } from '../lib/meta';
import { menuCommand, openPanel, settingsEditor, toast } from '../lib/ui';

export const meta: ScriptMeta = {
  name: 'Code Helpers: GitHub PR list — Accepted PRs',
  version: '1.1.0',
  description:
    'Tints accepted pull requests green and collapses them to one line on a repo\'s PR list — "accepted" being GitHub\'s review decision (code owners) or your own approval.',
  match: ['https://github.com/*/*/pulls*'],
  runAt: 'document-idle',
  icon: 'github',
  // GM.* (not GM_*) — that is what DataStore's GMStorageEngine calls.
  grant: [
    'GM.getValue',
    'GM.setValue',
    'GM.deleteValue',
    'GM.listValues',
    'GM_registerMenuCommand',
  ],
};
/** Whose approval counts as "accepted". */
type Mode = 'approved' | 'mine';
/** What an accepted row looks like. */
type Display = 'collapse' | 'dim' | 'hide';

type Config = {
  mode: Mode;
  display: Display;
  /** In `approved` mode, badge the ones you reviewed yourself. Costs one fetch. */
  markMine: boolean;
  /** Result pages to scan, 25 PRs each. */
  pages: number;
};

const DEFAULTS: Config = { mode: 'approved', display: 'collapse', markMine: true, pages: 2 };

// Set on each accepted row (value: the Mode that matched) …
const ROW = 'data-accepted-pr';
// … and on <html>, so one attribute switches every row's treatment at once.
const DISPLAY = 'data-accepted-pr-display';
const BADGE = 'data-accepted-pr-badge';
const BAR = 'accepted-pr-bar';
const STYLE = 'accepted-pr-style';

// Octicon path, lifted from the rendered page so it matches GitHub's own check.
const CHECK =
  'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z';

// The whole visual treatment. GitHub's row styles are plain author rules, so
// these win on specificity alone — !important is only on the hover escape
// hatch, which has to beat the collapsed rule it overrides.
const CSS = `
  [${ROW}] {
    transition: opacity .12s ease, background-color .12s ease;
    background-color: var(--bgColor-success-muted, rgba(46, 160, 67, 0.12));
    box-shadow: inset 3px 0 0 var(--fgColor-success, #3fb950);
    opacity: .6;
  }
  [${ROW}]:hover { opacity: 1; }

  [${DISPLAY}="collapse"] [${ROW}] {
    max-height: 2.4em;
    overflow: hidden;
  }
  /* Hovering a collapsed row gives the whole thing back, labels and all. */
  [${DISPLAY}="collapse"] [${ROW}]:hover {
    max-height: none !important;
    overflow: visible !important;
  }

  [${DISPLAY}="hide"] [${ROW}] { display: none; }

  [${BADGE}] {
    display: inline-flex;
    align-items: center;
    margin-right: 6px;
    vertical-align: text-bottom;
  }

  #${BAR} {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 6px 16px;
    font-size: 12px;
    color: var(--fgColor-muted, #848d97);
    border-bottom: 1px solid var(--borderColor-muted, rgba(128, 128, 128, .25));
  }
  #${BAR} button {
    font: inherit;
    cursor: pointer;
    padding: 1px 6px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: none;
    color: inherit;
  }
  #${BAR} button:hover { border-color: var(--borderColor-default, rgba(128, 128, 128, .4)); }
  #${BAR} button[aria-pressed="true"] {
    color: var(--fgColor-default, inherit);
    border-color: var(--borderColor-default, rgba(128, 128, 128, .4));
    background: var(--bgColor-neutral-muted, rgba(128, 128, 128, .15));
  }
`;

// Persistence via UserUtils' DataStore: it owns the GM storage keys, the format
// version and the migration chain, so a later config change is a numbered
// migration instead of hand-written ?? fallbacks.
const store = new DataStore<Config>({
  id: 'gh-pr-list-accepted',
  defaultData: { ...DEFAULTS },
  formatVersion: 1,
  engine: new GMStorageEngine(),
  compressionFormat: null,
  migrations: {},
});

let config: Config = { ...DEFAULTS };

/** The settings that decide WHICH PRs are accepted, as opposed to how they look. */
function lookupKey(cfg: Config): string {
  return [cfg.mode, cfg.markMine, cfg.pages].join('|');
}

async function saveConfig(next: Config) {
  // Switching collapse/dim/hide is one attribute on <html> — re-running the
  // lookup for it would cost four page fetches to change a stylesheet match.
  const relook = lookupKey(next) !== lookupKey(config);
  config = next;
  if (relook) void refresh(true);
  else decorate();
  await store.setData(next);
}

let loaded = false;

// Nothing is looked up until this resolves: firing the fetches under the
// defaults and again under the stored config would double every page view.
// A storage failure still lands in finally, so the defaults go live either way.
store
  .loadData()
  .then((saved) => {
    config = { ...DEFAULTS, ...saved };
  })
  .catch((e) => console.error('[accepted-pr] config load failed', e))
  .finally(() => {
    loaded = true;
    void refresh(true);
  });

const DEFAULT_QUERY = 'is:open is:pr';
const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+$/;
// Classic rows carry id="issue_123"; the React list marks its own list items.
// Deliberately no bare `li`: that matched sub-lists inside a row, and any PR
// link elsewhere on the page (a nav item, a recently-viewed widget) would have
// dragged an unrelated container in as if it were a row.
const ROW_SELECTOR = '.js-issue-row, [id^="issue_"], [data-testid="list-view-item"], .Box-row';

/** The query the list is currently showing, as typed into GitHub's search box. */
function currentQuery(): string {
  return (new URLSearchParams(location.search).get('q') || '').trim() || DEFAULT_QUERY;
}

/** Which page of that query is on screen. */
function currentPage(): number {
  const page = Number.parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
  return Number.isNaN(page) || page < 1 ? 1 : page;
}

/** That query, with our own review qualifiers swapped in for any it had. */
function acceptedQuery(mode: Mode): string {
  const terms = currentQuery()
    .split(/\s+/)
    .filter((term) => term && !/^-?(review|reviewed-by):/i.test(term));
  terms.push('review:approved');
  if (mode === 'mine') terms.push('reviewed-by:@me');
  return terms.join(' ');
}

/** The `/owner/repo/pull/123` an anchor points at, or null for anything else. */
function prPath(link: Element): string | null {
  const path = (link.getAttribute('href') || '').split(/[?#]/)[0].replace(/\/$/, '');
  return PR_PATH.test(path) ? path : null;
}

/** Re-run the list's query with `review:approved`; collect what comes back. */
async function acceptedPaths(mode: Mode): Promise<Set<string>> {
  const query = acceptedQuery(mode);
  const found = new Set<string>();

  // The approved subset paginates on its own, so page 4 of the list is not
  // covered by page 4 of this query — only by scanning from the top. Deeper
  // pages therefore need a deeper scan, still bounded by the setting.
  const depth = config.pages + currentPage() - 1;

  for (let page = 1; page <= depth; page++) {
    const url = `${location.pathname}?q=${encodeURIComponent(query)}&page=${page}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);

    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const before = found.size;
    for (const link of doc.querySelectorAll('a[href*="/pull/"]')) {
      const path = prPath(link);
      if (path) found.add(path);
    }
    // A page that adds nearly nothing is the last one — GitHub clamps `page`
    // past the end rather than 404ing, so this is the only stop signal.
    if (found.size - before < 10) break;
  }
  return found;
}

/** Every PR row rendered right now, keyed by the PR's path. */
function rowsOnPage(): Map<string, HTMLElement> {
  const rows = new Map<string, HTMLElement>();
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href*="/pull/"]')) {
    const path = prPath(link);
    // The title link comes first in DOM order, so the first hit wins the row.
    if (!path || rows.has(path)) continue;
    const row = link.closest<HTMLElement>(ROW_SELECTOR);
    if (row) rows.set(path, row);
  }
  return rows;
}

function ensureStyle() {
  if (document.getElementById(STYLE)) return;
  const style = document.createElement('style');
  style.id = STYLE;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function badge(row: HTMLElement, mode: Mode) {
  const existing = row.querySelector<HTMLElement>(`[${BADGE}]`);
  if (existing?.getAttribute(BADGE) === mode) return;
  existing?.remove();

  const title = row.querySelector<HTMLElement>('a[href*="/pull/"]');
  if (!title?.parentElement) return;

  const mark = document.createElement('span');
  mark.setAttribute(BADGE, mode);
  mark.title =
    mode === 'mine'
      ? 'You reviewed this pull request, and it is approved'
      : 'Approved — GitHub’s review decision, so the required reviewers (code owners, where they are required) have signed off';
  mark.innerHTML = octicon(CHECK, { color: 'success' });
  title.parentElement.insertBefore(mark, title);
}

function unmark(row: HTMLElement) {
  row.removeAttribute(ROW);
  row.querySelector(`[${BADGE}]`)?.remove();
}

/** Row count, and where the bar goes, in one pass over the rendered rows. */
function decorate() {
  ensureStyle();
  document.documentElement.setAttribute(DISPLAY, config.display);

  let accepted = 0;
  let list: HTMLElement | null = null;

  for (const [path, row] of rowsOnPage()) {
    if (!list) list = row.parentElement;
    const mode = state.paths.get(path);
    if (!mode) {
      if (row.hasAttribute(ROW)) unmark(row);
      continue;
    }
    accepted++;
    // Setting an attribute fires a mutation record even when the value is
    // unchanged, and we're inside a MutationObserver — so only touch a row
    // whose marking actually changed, or observeDom spins forever.
    if (row.getAttribute(ROW) !== mode) row.setAttribute(ROW, mode);
    badge(row, mode);
  }

  renderBar(accepted, list);
}

const DISPLAYS: { value: Display; label: string; title: string }[] = [
  { value: 'collapse', label: 'Collapse', title: 'Green, dimmed, one line — hover to expand' },
  { value: 'dim', label: 'Dim', title: 'Green and dimmed, full height' },
  { value: 'hide', label: 'Hide', title: 'Drop accepted PRs from the list' },
];

/** A line above the list: how many are accepted, and what to do with them. */
function renderBar(accepted: number, list: HTMLElement | null) {
  const existing = document.getElementById(BAR);
  // A <div> spliced into a <ul> is invalid markup, and React drops any child it
  // did not render — so the bar goes immediately before the list instead.
  const anchor = list?.parentElement;
  if (!list || !anchor || accepted === 0) {
    existing?.remove();
    return;
  }

  const summary =
    `${accepted} accepted ${accepted === 1 ? 'PR' : 'PRs'}` +
    (config.mode === 'mine' ? ' (approved, reviewed by you)' : ' (approved)');
  const signature = `${summary}|${config.display}`;
  // Same reason as the row marking: rebuilding on every mutation would loop.
  if (existing?.dataset.signature === signature) return;

  const bar = existing ?? document.createElement('div');
  bar.id = BAR;
  bar.dataset.signature = signature;
  bar.replaceChildren();

  const label = document.createElement('span');
  label.textContent = summary;
  bar.appendChild(label);

  for (const option of DISPLAYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    button.title = option.title;
    button.setAttribute('aria-pressed', String(config.display === option.value));
    button.addEventListener('click', () => void saveConfig({ ...config, display: option.value }));
    bar.appendChild(button);
  }

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.textContent = '⚙';
  settings.title = 'Accepted PR settings';
  settings.addEventListener('click', openConfig);
  bar.appendChild(settings);

  if (!existing) anchor.insertBefore(bar, list);
}

const state = { key: '', paths: new Map<string, Mode>(), retryAt: 0 };
let run = 0;

/** Look acceptance up again — once per (query, settings), unless forced. */
async function refresh(force = false) {
  if (!loaded) return;

  const key = [location.pathname, currentQuery(), currentPage(), lookupKey(config)].join('|');
  if (!force && key === state.key) return;
  // decorate() runs on every DOM mutation, so a failing lookup gets a cooldown
  // rather than one retry per frame.
  if (!force && Date.now() < state.retryAt) return;
  // Claimed, not committed: a failed lookup clears it below so the next DOM
  // tick can retry, rather than leaving the list unmarked until you navigate.
  state.key = key;
  const token = ++run;

  // `reviewed-by:@me` needs a signed-in session to resolve; without one the
  // "mine" query would quietly match nothing at all.
  const mode: Mode = config.mode === 'mine' && !currentUser() ? 'approved' : config.mode;

  try {
    const paths = new Map<string, Mode>();
    for (const path of await acceptedPaths(mode)) paths.set(path, mode);

    // A second pass so the ones you signed off on read differently from the
    // ones somebody else did. Pointless when `mine` is already the whole set.
    if (mode === 'approved' && config.markMine && currentUser()) {
      for (const path of await acceptedPaths('mine')) {
        if (paths.has(path)) paths.set(path, 'mine');
      }
    }

    if (token !== run) return;
    state.paths = paths;
    state.retryAt = 0;
  } catch (e) {
    if (token !== run) return;
    // Drop the key so a later tick tries again, but keep the stale set from
    // being painted onto a list it no longer describes.
    state.key = '';
    state.paths = new Map();
    state.retryAt = Date.now() + 30_000;
    console.error('[accepted-pr] lookup failed', e);
    toast({
      text: 'Could not read approval state from GitHub — the PR list is left as-is.',
      tone: 'danger',
    });
  }

  // Outside the try: a DOM failure here is our bug, not a failed lookup, and
  // must not be reported to the user as one.
  decorate();
}

function openConfig() {
  const settings = settingsEditor<Config>(
    [
      {
        key: 'mode',
        kind: 'select',
        label: 'Accepted means',
        options: [
          { value: 'approved', label: 'Approved (code owners, where required)' },
          { value: 'mine', label: 'Approved, and I reviewed it' },
        ],
      },
      {
        key: 'display',
        kind: 'select',
        label: 'Show them',
        options: DISPLAYS.map((d) => ({ value: d.value, label: d.label })),
      },
      { key: 'markMine', kind: 'boolean', label: 'Badge the ones I reviewed' },
      { key: 'pages', kind: 'number', label: 'Pages to scan', min: 1, max: 10 },
    ],
    config,
  );

  openPanel({
    id: 'accepted-pr-config-host',
    title: 'Accepted pull requests',
    hint: 'Acceptance comes from GitHub’s own search: this list’s query, re-run with review:approved — its review decision, which on a repo that requires code owner review means the code owners have signed off. GitHub has no “approved-by:” qualifier, so “I reviewed it” (reviewed-by:@me) is as close as it gets to “I approved it”.',
    build: (body) => body.append(settings.el),
    footer: [
      { label: 'Cancel', onClick: (panel) => panel.close() },
      {
        label: 'Save',
        primary: true,
        onClick: (panel) => {
          void saveConfig({ ...config, ...settings.read() });
          panel.close();
        },
      },
    ],
  });
}

menuCommand('✅ Accepted PRs…', openConfig);

// The list is a SPA route: rows re-render, and the query changes under us.
// refresh() is deduped by query + settings, so it only fetches when it must.
observeDom(() => {
  void refresh();
  decorate();
});
