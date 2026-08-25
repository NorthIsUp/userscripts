import { observeDom, octicon } from '../lib/dom';
import { parsePr } from '../lib/github';
import type { ScriptMeta } from '../lib/meta';

export const meta: ScriptMeta = {
  name: 'Code Helpers: GitHub PR — Open in Graphite',
  version: '1.8.4',
  description:
    'Adds an "Open in Graphite" icon link next to the copy-branch button in the PR header.',
  match: ['https://github.com/*/*/pull/*'],
  runAt: 'document-end',
  icon: 'github',
};
const MARKER = 'data-graphite-link';
const TIP_ID = 'graphite-link-tooltip';
const STACK_PATH =
  'M7.122.392a1.75 1.75 0 0 1 1.756 0l5.003 2.902c.83.481.83 1.68 0 2.162L8.878 8.358a1.75 1.75 0 0 1-1.756 0L2.119 5.456a1.251 1.251 0 0 1 0-2.162ZM8.125 1.69a.248.248 0 0 0-.25 0l-4.63 2.685 4.63 2.685a.248.248 0 0 0 .25 0l4.63-2.685ZM1.601 7.789a.75.75 0 0 1 1.025-.273l5.249 3.044a.248.248 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0L1.874 8.814A.75.75 0 0 1 1.6 7.789Zm0 3.5a.75.75 0 0 1 1.025-.273l5.249 3.044a.248.248 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0l-5.248-3.044a.75.75 0 0 1-.273-1.025Z';

function graphiteUrl(): string | null {
  const pr = parsePr();
  return pr && `https://app.graphite.dev/github/pr/${pr.owner}/${pr.repo}/${pr.number}`;
}

function decorate() {
  const url = graphiteUrl();
  if (!url) return;

  const copyBtn = document.querySelector('svg.octicon-copy')?.closest('button');
  if (!copyBtn?.parentElement) return;
  const slot = copyBtn.parentElement;
  if (slot.querySelector(`[${MARKER}]`)) return;

  // Reuse GitHub's current TooltipV2 class off the live copy tooltip span.
  const refTip = slot.querySelector('span[role="tooltip"][popover]');
  const tipClass = refTip ? refTip.className : 'prc-TooltipV2-Tooltip-tLeuB';

  const a = document.createElement('a');
  a.setAttribute(MARKER, 'true');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'color-fg-muted ml-1';
  a.style.display = 'inline-flex';
  a.style.alignItems = 'center';
  a.setAttribute('aria-label', 'Open in Graphite');
  a.setAttribute('aria-describedby', TIP_ID);
  a.innerHTML = octicon(STACK_PATH);

  // GitHub's TooltipV2 span + native Popover API; positioned on show.
  const tip = document.createElement('span');
  tip.className = tipClass;
  tip.id = TIP_ID;
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('data-direction', 's');
  tip.setAttribute('data-component', 'Tooltip');
  tip.setAttribute('popover', 'auto');
  tip.textContent = 'Open in Graphite';
  tip.style.margin = '0';

  const show = () => {
    try {
      tip.showPopover();
      const r = a.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      tip.style.position = 'fixed';
      tip.style.left = `${r.left + r.width / 2 - t.width / 2}px`;
      tip.style.top = `${r.bottom + 6}px`;
    } catch {}
  };
  const hide = () => {
    try {
      tip.hidePopover();
    } catch {}
  };
  a.addEventListener('mouseenter', show);
  a.addEventListener('mouseleave', hide);
  a.addEventListener('focus', show);
  a.addEventListener('blur', hide);

  slot.insertBefore(a, copyBtn.nextSibling);
  slot.insertBefore(tip, a.nextSibling);
  console.log('[graphite] inserted icon ->', url);
}

observeDom(() => {
  try {
    decorate();
  } catch (e) {
    console.error('[graphite] decorate error', e);
  }
});
