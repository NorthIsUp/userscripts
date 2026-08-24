import { observeDom } from '../lib/dom';

const MARKER = 'data-github-link';
// GitHub mark, viewBox 0 0 48 48 (same artwork as the script's @icon).
const GH_PATH =
  'M24 1.9a21.6 21.6 0 0 0-6.8 42.2c1 .2 1.8-.9 1.8-1.8v-2.9c-6 1.3-7.9-2.9-7.9-2.9a6.5 6.5 0 0 0-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3 4.3 0 0 1 3.3 2c1.7 2.9 5.5 2.6 6.7 2.1a5.4 5.4 0 0 1 .5-2.9C12.7 32 9 28 9 22.6a10.7 10.7 0 0 1 2.9-7.6 6.2 6.2 0 0 1 .3-6.4 8.9 8.9 0 0 1 6.4 2.9 15.1 15.1 0 0 1 5.4-.8 17.1 17.1 0 0 1 5.4.7 9 9 0 0 1 6.4-2.8 6.5 6.5 0 0 1 .4 6.4 10.7 10.7 0 0 1 2.8 7.6c0 5.4-3.7 9.4-10.5 10.6a5.4 5.4 0 0 1 .5 2.9v6.2a1.8 1.8 0 0 0 1.9 1.8A21.7 21.7 0 0 0 24 1.9Z';

function githubUrl(graphitePath: string): string | null {
  const m = graphitePath.match(/\/github\/pr\/([^/]+)\/([^/]+)\/(\d+)/);
  return m && `https://github.com/${m[1]}/${m[2]}/pull/${m[3]}`;
}

function decorate() {
  const row = document.querySelector('a[aria-current="true"][href*="/github/pr/"]');
  if (!row) return;
  const url = githubUrl(row.getAttribute('href') || '');
  if (!url) return;

  // Graphite's action slot lives inside the row <a>; nest a <button>, not an <a>.
  const slot = row.querySelector('[class*="currentRowActions"]') || row;
  if (slot.querySelector(`[${MARKER}]`)) return;

  const btn = document.createElement('button');
  btn.setAttribute(MARKER, 'true');
  btn.type = 'button';
  btn.title = 'Open in GitHub';
  btn.setAttribute('aria-label', 'Open in GitHub');
  btn.style.cssText =
    'display:inline-flex;align-items:center;background:none;border:0;' +
    'padding:2px;margin:0 2px;cursor:pointer;color:inherit;opacity:.7';
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" ' +
    `viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="${GH_PATH}"></path></svg>`;
  btn.addEventListener('click', (e) => {
    // Don't let the row's own anchor navigation fire.
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener');
  });

  slot.appendChild(btn);
}

// Graphite is a SPA; re-decorate on DOM changes / row switches.
observeDom(decorate);
