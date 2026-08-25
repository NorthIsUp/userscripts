import type { ScriptMeta } from '../lib/meta';

export const meta: ScriptMeta = {
  name: 'HAProxy Stats: Section Header Emojis',
  version: '1.0.3',
  description: 'Add 🟢/🔴 to HAProxy proxy headers based on server row health in that section',
  match: ['http://haproxy.tailf01e20.ts.net:8404/*'],
  runAt: 'document-idle',
};

const DEAD_ROW_SELECTOR = 'tr.active_down, tr.backup_down';
const LIVE_ROW_SELECTOR = 'tr.active_up, tr.backup_up, tr.active_going_up, tr.active_going_down';

const DEAD_EMOJI = '🔴';
const LIVE_EMOJI = '🟢';

function setHeaderEmoji(linkEl: HTMLElement, emoji: string) {
  // linkEl is <a class="px">proxy_name</a>
  const raw = (linkEl.textContent || '').replace(/^[🟢🔴]\s+/u, '');
  linkEl.textContent = `${emoji} ${raw}`;
  linkEl.style.fontWeight = '900';
}

function findSectionRootFromAnchorName(anchorName: string): HTMLTableElement | null {
  // Anchor is: <a name="socks5_ohd_clinic"></a> inside th.pxname
  const anchor = document.querySelector(`a[name="${CSS.escape(anchorName)}"]`);
  if (!anchor) return null;

  // The header table is the closest .tbl; the content (servers) is after it.
  return anchor.closest('table.tbl');
}

function collectSectionTables(headerTable: HTMLTableElement): Element[] {
  // After the header table, HAProxy renders another table (the stats rows), then repeats for next section.
  // We collect sibling tables until the next header table that contains th.pxname.
  const tables: Element[] = [];
  let el = headerTable.nextElementSibling;

  while (el) {
    if (el.tagName === 'TABLE' && el.classList.contains('tbl')) {
      // If this table is a new section header (has th.pxname), stop.
      if (el.querySelector('th.pxname')) break;
      tables.push(el);
    }
    el = el.nextElementSibling;
  }
  return tables;
}

function sectionStatus(sectionTables: Element[]): 'dead' | 'live' | 'unknown' {
  // If any DOWN row exists => DEAD
  for (const t of sectionTables) {
    if (t.querySelector(DEAD_ROW_SELECTOR)) return 'dead';
  }
  // If any LIVE-ish row exists => LIVE
  for (const t of sectionTables) {
    if (t.querySelector(LIVE_ROW_SELECTOR)) return 'live';
  }
  // Otherwise unknown/empty (no servers)
  return 'unknown';
}

function updateAllSectionHeaders() {
  const headerLinks = document.querySelectorAll<HTMLElement>('tr.titre th.pxname a.px');

  for (const link of headerLinks) {
    const th = link.closest('th.pxname');
    if (!th) continue;

    const anchorName = th.querySelector('a[name]')?.getAttribute('name');
    if (!anchorName) continue;

    const headerTable = findSectionRootFromAnchorName(anchorName);
    if (!headerTable) continue;

    const status = sectionStatus(collectSectionTables(headerTable));

    if (status === 'dead') setHeaderEmoji(link, DEAD_EMOJI);
    else if (status === 'live') setHeaderEmoji(link, LIVE_EMOJI);
    // unknown => leave it alone
  }
}

function updateTabTitle() {
  const anyDead = document.querySelector(DEAD_ROW_SELECTOR);
  const base = 'HAProxy Stats';
  document.title = anyDead ? `🔴 DEAD — ${base}` : `🟢 ALIVE — ${base}`;
}

function run() {
  updateAllSectionHeaders();
  updateTabTitle();
}

run();

// HAProxy can refresh sections / hide/show; MutationObserver keeps this correct
new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
