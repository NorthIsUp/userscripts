// ==UserScript==
// @name         Deny Geolocation
// @namespace    https://github.com/NorthIsUp/userscripts/deny-geolocation
// @version      0.2.5
// @description  Sites asking for location get an instant PERMISSION_DENIED, no prompt.
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%238a8f98' d='M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z'/%3E%3Cpath fill='none' stroke='%23e5484d' stroke-width='2.4' stroke-linecap='round' d='M4.5 3.5l15 17'/%3E%3C/svg%3E
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/deny-geolocation.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/deny-geolocation.user.js
// ==/UserScript==

(function () {
  'use strict';

  /**
   * Shared UI for the scripts: toasts and settings panels.
   *
   * Everything renders inside a shadow root with `all: initial`, because these
   * are injected into pages whose CSS we don't control (GitHub's Primer resets
   * are especially aggressive). Colors come from one token block that follows the
   * page's color scheme.
   */
  const TOAST_HOST_ID = 'us-toast-host';
  const TOKENS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  :host {
    --bg: #ffffff;
    --fg: #1f2328;
    --muted: rgba(31, 35, 40, 0.62);
    --line: rgba(128, 128, 128, 0.3);
    --btn-bg: #f6f8fa;
    --accent: #1f883d;
    --danger: #e5484d;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #161b22;
      --fg: #e6edf3;
      --muted: rgba(230, 237, 243, 0.6);
      --line: rgba(128, 128, 128, 0.35);
      --btn-bg: #21262d;
      --accent: #238636;
    }
  }
  button {
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    color: var(--fg);
    background: var(--btn-bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 10px;
  }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.plain { background: none; border: none; opacity: 0.6; padding: 2px 6px; }
  button.plain:hover { opacity: 1; }
  input, select {
    font: inherit;
    font-size: 13px;
    color: var(--fg);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 8px;
  }
  label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
`;
  /** Run once the body exists — scripts running at document-start have none yet. */
  function whenBody(fn) {
      if (document.body)
          return fn();
      addEventListener('DOMContentLoaded', fn, { once: true });
  }
  function shadowHost(id, css) {
      const host = document.createElement('div');
      host.id = id;
      const root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = TOKENS + css;
      root.appendChild(style);
      return { host, root };
  }
  const TOAST_CSS = `
  .stack {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    max-width: min(560px, 90vw);
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--line);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    font-size: 13px;
    line-height: 1.4;
  }
  .toast.danger { background: var(--danger); color: #fff; border-color: transparent; }
  .toast.danger button { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.6); color: #fff; }
  .msg { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
`;
  let toastStack = null;
  function ensureToastStack() {
      if (toastStack?.isConnected)
          return toastStack;
      const { host, root } = shadowHost(TOAST_HOST_ID, TOAST_CSS);
      const stack = document.createElement('div');
      stack.className = 'stack';
      root.appendChild(stack);
      document.body.appendChild(host);
      toastStack = stack;
      return stack;
  }
  /** A dismissible message in the corner of the page, with optional buttons. */
  function toast(opts) {
      whenBody(() => {
          const stack = ensureToastStack();
          const node = document.createElement('div');
          node.className = `toast${' danger' }`;
          const msg = document.createElement('span');
          msg.className = 'msg';
          msg.textContent = opts.text;
          node.appendChild(msg);
          for (const action of opts.actions ?? []) {
              const btn = document.createElement('button');
              btn.textContent = action.label;
              btn.addEventListener('click', action.onClick);
              node.appendChild(btn);
          }
          const dismiss = document.createElement('button');
          dismiss.className = 'plain';
          dismiss.textContent = '✕';
          dismiss.title = 'Dismiss';
          dismiss.addEventListener('click', () => node.remove());
          node.appendChild(dismiss);
          stack.appendChild(node);
          const duration = opts.duration ?? 10_000;
          if (duration > 0)
              setTimeout(() => node.remove(), duration);
      });
  }
  const PANEL_CSS = `
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 2147483646; }
  .panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483647;
    width: min(700px, 92vw);
    max-height: 88vh;
    overflow: auto;
    padding: 16px 18px;
    border-radius: 12px;
    background: var(--bg);
    color: var(--fg);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    font-size: 13px;
  }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  h2 { font-size: 16px; margin: 0; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
  .body { display: flex; flex-direction: column; gap: 10px; }
  footer { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .spacer { flex: 1; }
  .settings { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .settings input[type='number'] { width: 64px; }
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 8px; }
  .row input { flex: 1 1 auto; min-width: 0; }
  .row img { width: 24px; height: 24px; border-radius: 50%; flex: 0 0 auto; object-fit: cover; background: var(--line); }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 3px 8px 3px 0; border-top: 1px solid var(--line); }
`;
  /** A modal settings panel, isolated from the host page's CSS. */
  function openPanel(opts) {
      if (document.getElementById(opts.id))
          return null;
      const { host, root } = shadowHost(opts.id, PANEL_CSS);
      const backdrop = document.createElement('div');
      backdrop.className = 'backdrop';
      const panelEl = document.createElement('div');
      panelEl.className = 'panel';
      panelEl.setAttribute('role', 'dialog');
      panelEl.setAttribute('aria-modal', 'true');
      panelEl.setAttribute('aria-label', opts.title);
      const head = document.createElement('header');
      const title = document.createElement('h2');
      title.textContent = opts.title;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'plain';
      closeBtn.textContent = '✕';
      closeBtn.title = 'Close';
      head.append(title, closeBtn);
      panelEl.appendChild(head);
      if (opts.hint) {
          const hint = document.createElement('p');
          hint.className = 'hint';
          hint.textContent = opts.hint;
          panelEl.appendChild(hint);
      }
      const body = document.createElement('div');
      body.className = 'body';
      panelEl.appendChild(body);
      const panel = {
          body,
          close: () => host.remove(),
          refresh: () => {
              body.replaceChildren();
              opts.build(body, panel);
          },
      };
      if (opts.footer?.length) {
          const footer = document.createElement('footer');
          const spacer = document.createElement('span');
          spacer.className = 'spacer';
          footer.appendChild(spacer);
          for (const spec of opts.footer) {
              const btn = document.createElement('button');
              btn.textContent = spec.label;
              if (spec.primary)
                  btn.className = 'primary';
              btn.addEventListener('click', () => spec.onClick(panel));
              footer.appendChild(btn);
          }
          panelEl.appendChild(footer);
      }
      closeBtn.addEventListener('click', panel.close);
      backdrop.addEventListener('click', panel.close);
      root.addEventListener('keydown', (e) => {
          if (e.key === 'Escape')
              panel.close();
      });
      root.append(backdrop, panelEl);
      opts.build(body, panel);
      document.body.appendChild(host);
      return panel;
  }
  /** Register a userscript-manager menu entry, where the manager supports it. */
  function menuCommand(label, fn) {
      if (typeof GM_registerMenuCommand === 'function')
          GM_registerMenuCommand(label, fn);
  }

  // granted scripts run sandboxed; patch the real page window through unsafeWindow
  const W = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
  const STORE_KEY = 'denyGeo.allows';
  const MUTE_KEY = 'denyGeo.mute';
  // { "example.com": epochMs | "always" } — deny is the default, only allows are stored
  const store = () => {
      try {
          return JSON.parse(GM_getValue(STORE_KEY, '{}'));
      }
      catch {
          return {};
      }
  };
  const save = (a) => GM_setValue(STORE_KEY, JSON.stringify(a));
  const pruned = store();
  let dirty = false;
  for (const [d, v] of Object.entries(pruned)) {
      if (v !== 'always' && Date.now() > v) {
          delete pruned[d];
          dirty = true;
      }
  }
  if (dirty)
      save(pruned);
  // ponytail: "www." strip + suffix match instead of a public-suffix list;
  // allowing on maps.foo.co.uk won't cover www.foo.co.uk — remove/re-add or add foo.co.uk by hand
  const baseHost = location.hostname.replace(/^www\./, '');
  const matchEntry = (allows) => Object.keys(allows).find((d) => location.hostname === d || location.hostname.endsWith(`.${d}`) || baseHost === d);
  const isMuted = () => {
      try {
          return localStorage.getItem(MUTE_KEY) === '1';
      }
      catch {
          return false;
      }
  };
  const setAllow = (domain, durSec) => {
      const a = store();
      a[domain] = durSec === 'always' ? 'always' : Date.now() + durSec * 1000;
      save(a);
  };
  const removeAllow = (domain) => {
      const a = store();
      delete a[domain];
      save(a);
  };
  const allowSite = (durSec) => {
      setAllow(baseHost, durSec);
      location.reload();
  };
  const btn = (label, onclick) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', onclick);
      return b;
  };
  const fmtExpiry = (v) => (v === 'always' ? 'always' : new Date(v).toLocaleString());
  function openConfig() {
      openPanel({
          id: 'deny-geo-cfg',
          title: 'Deny geolocation',
          hint: 'Geolocation is denied everywhere by default; only the sites listed here are allowed.',
          build: (body, panel) => {
              const allows = store();
              const site = document.createElement('div');
              site.className = 'row';
              const current = matchEntry(allows);
              if (current) {
                  site.append(`${location.hostname}: allowed`, btn('block again', () => {
                      removeAllow(current);
                      location.reload();
                  }));
              }
              else {
                  site.append(`${location.hostname}: blocked · allow for:`, btn('1d', () => allowSite(86400)), btn('always', () => allowSite('always')));
              }
              body.appendChild(site);
              const entries = Object.entries(allows).sort(([a], [b]) => a.localeCompare(b));
              if (entries.length === 0) {
                  const empty = document.createElement('p');
                  empty.className = 'hint';
                  empty.textContent = 'no allowed sites — everything is denied';
                  body.appendChild(empty);
              }
              else {
                  const table = document.createElement('table');
                  for (const [domain, expiry] of entries) {
                      const tr = document.createElement('tr');
                      const cell = (content, css) => {
                          const td = document.createElement('td');
                          if (css)
                              td.style.cssText = css;
                          if (typeof content === 'string')
                              td.textContent = content;
                          else
                              td.appendChild(content);
                          return td;
                      };
                      const remove = btn('✕', () => {
                          removeAllow(domain);
                          // Dropping the entry that allows *this* page has to take effect now.
                          if (domain === matchEntry({ [domain]: expiry }))
                              location.reload();
                          else
                              panel.refresh();
                      });
                      remove.className = 'plain';
                      tr.append(cell(domain), cell(fmtExpiry(expiry), 'color:var(--muted)'), cell(remove, 'text-align:right'));
                      table.appendChild(tr);
                  }
                  body.appendChild(table);
              }
              const addRow = document.createElement('div');
              addRow.className = 'row';
              const input = document.createElement('input');
              input.placeholder = 'add domain, e.g. example.com';
              const addFor = (dur) => {
                  const d = input.value
                      .trim()
                      .toLowerCase()
                      .replace(/^www\./, '');
                  if (!d)
                      return;
                  setAllow(d, dur);
                  panel.refresh();
              };
              addRow.append(input, btn('1d', () => addFor(86400)), btn('always', () => addFor('always')));
              body.appendChild(addRow);
              const mute = document.createElement('label');
              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.checked = isMuted();
              cb.addEventListener('change', () => {
                  try {
                      localStorage.setItem(MUTE_KEY, cb.checked ? '1' : '0');
                  }
                  catch { }
              });
              mute.append(cb, 'mute toasts on this site (still blocks)');
              body.appendChild(mute);
          },
      });
  }
  menuCommand('Configure ⚙', openConfig);
  try {
      W.denyGeoConfig = openConfig;
  }
  catch { }
  if (!matchEntry(pruned)) {
      // not allowed here: replace geolocation with an instant denial
      const ERR = {
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
      };
      let lastToast = 0;
      const notify = () => {
          if (isMuted() || Date.now() - lastToast < 3000)
              return;
          lastToast = Date.now();
          const url = location.href.length > 64 ? `${location.href.slice(0, 61)}...` : location.href;
          toast({
              text: `⛔ Blocked geolocation request from: ${url}`,
              actions: [
                  { label: 'allow 1d', onClick: () => allowSite(86400) },
                  { label: 'allow always', onClick: () => allowSite('always') },
                  { label: '⚙', onClick: openConfig },
              ],
          });
      };
      const deny = (_ok, err) => {
          notify();
          if (typeof err === 'function')
              setTimeout(() => {
                  try {
                      err(ERR);
                  }
                  catch { }
              }, 0);
      };
      Object.defineProperty(W.navigator, 'geolocation', {
          value: {
              getCurrentPosition: (ok, err) => deny(ok, err),
              watchPosition: (ok, err) => {
                  deny(ok, err);
                  return 0;
              },
              clearWatch: () => { },
          },
          configurable: false,
      });
      try {
          const perms = W.navigator.permissions;
          if (perms?.query) {
              const realQuery = perms.query.bind(perms);
              perms.query = ((desc) => desc?.name === 'geolocation'
                  ? Promise.resolve({ state: 'denied', onchange: null })
                  : realQuery(desc));
          }
      }
      catch { }
  }

})();
