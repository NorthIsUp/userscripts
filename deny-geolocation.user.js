// ==UserScript==
// @name         Deny Geolocation
// @description  Sites asking for location get an instant PERMISSION_DENIED, no prompt.
// @version      0.2.0
// @match        *://*/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.js
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%238a8f98' d='M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z'/%3E%3Cpath fill='none' stroke='%23e5484d' stroke-width='2.4' stroke-linecap='round' d='M4.5 3.5l15 17'/%3E%3C/svg%3E
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/deny-geolocation.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/deny-geolocation.user.js
// ==/UserScript==

(() => {
  // granted scripts run sandboxed; patch the real page window through unsafeWindow
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  const STORE_KEY = 'denyGeo.allows';
  const MUTE_KEY = 'denyGeo.mute';

  // { "example.com": epochMs | "always" } — deny is the default, only allows are stored
  const store = () => {
    try {
      return JSON.parse(GM_getValue(STORE_KEY, '{}'));
    } catch (_e) {
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
  if (dirty) save(pruned);

  // ponytail: "www." strip + suffix match instead of a public-suffix list;
  // allowing on maps.foo.co.uk won't cover www.foo.co.uk — remove/re-add or add foo.co.uk by hand
  const baseHost = location.hostname.replace(/^www\./, '');
  const matchEntry = (allows) =>
    Object.keys(allows).find(
      (d) => location.hostname === d || location.hostname.endsWith('.' + d) || baseHost === d,
    );

  const isMuted = () => {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch (_e) {
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
    b.style.cssText =
      'background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.6);color:#fff;' +
      'border-radius:6px;padding:2px 10px;cursor:pointer;font:inherit;';
    b.onclick = onclick;
    return b;
  };

  const fmtExpiry = (v) => (v === 'always' ? 'always' : new Date(v).toLocaleString());

  const openConfig = () => {
    document.getElementById('deny-geo-cfg')?.remove();
    const allows = store();
    const p = document.createElement('div');
    p.id = 'deny-geo-cfg';
    p.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#26272b;color:#fff;' +
      'padding:14px 16px;border-radius:10px;font:13px/1.5 system-ui,sans-serif;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:10px;' +
      'min-width:300px;max-width:420px;max-height:70vh;overflow:auto;';

    const head = document.createElement('div');
    head.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;gap:12px;font-weight:600;';
    const title = document.createElement('span');
    title.textContent = 'Deny geolocation';
    const x = btn('✕', () => p.remove());
    x.style.border = 'none';
    x.style.background = 'transparent';
    head.append(title, x);

    const site = document.createElement('div');
    site.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
    const cur = matchEntry(allows);
    if (cur) {
      site.append(
        `${location.hostname}: allowed`,
        btn('block again', () => {
          removeAllow(cur);
          location.reload();
        }),
      );
    } else {
      site.append(
        `${location.hostname}: blocked · allow for:`,
        btn('1d', () => allowSite(86400)),
        btn('always', () => allowSite('always')),
      );
    }

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%;';
    const entries = Object.entries(allows).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.7';
      empty.textContent = 'no allowed sites — everything is denied';
      table.replaceWith(empty);
      p.append(head, site, empty);
    } else {
      for (const [domain, v] of entries) {
        const tr = document.createElement('tr');
        const td = (content, css) => {
          const c = document.createElement('td');
          c.style.cssText =
            'padding:3px 8px 3px 0;border-top:1px solid rgba(255,255,255,.12);' + (css || '');
          typeof content === 'string' ? (c.textContent = content) : c.appendChild(content);
          return c;
        };
        const rm = btn('✕', () => {
          removeAllow(domain);
          if (domain === matchEntry({ [domain]: 1 }) && matchEntry({ [domain]: 1 }))
            location.reload();
          else openConfig();
        });
        rm.style.padding = '0 8px';
        tr.append(td(domain), td(fmtExpiry(v), 'opacity:.7;'), td(rm, 'text-align:right;'));
        table.appendChild(tr);
      }
      p.append(head, site, table);
    }

    const addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
    const input = document.createElement('input');
    input.placeholder = 'add domain, e.g. example.com';
    input.style.cssText =
      'flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff;' +
      'border-radius:6px;padding:3px 8px;font:inherit;';
    const addFor = (dur) => {
      const d = input.value
        .trim()
        .toLowerCase()
        .replace(/^www\./, '');
      if (!d) return;
      setAllow(d, dur);
      openConfig();
    };
    addRow.append(
      input,
      btn('1d', () => addFor(86400)),
      btn('always', () => addFor('always')),
    );

    const mute = document.createElement('label');
    mute.style.cssText = 'display:flex;gap:6px;align-items:center;cursor:pointer;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isMuted();
    cb.onchange = () => {
      try {
        localStorage.setItem(MUTE_KEY, cb.checked ? '1' : '0');
      } catch (_e) {}
    };
    mute.append(cb, 'mute toasts on this site (still blocks)');

    p.append(addRow, mute);
    document.body.appendChild(p);
  };

  if (typeof GM_registerMenuCommand === 'function')
    GM_registerMenuCommand('Configure ⚙', openConfig);
  try {
    W.denyGeoConfig = openConfig;
  } catch (_e) {}

  if (matchEntry(pruned)) return; // allowed: leave real geolocation untouched

  const ERR = {
    code: 1,
    message: 'User denied Geolocation',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };

  let lastToast = 0;
  const notify = () => {
    if (isMuted() || Date.now() - lastToast < 3000) return;
    lastToast = Date.now();
    const show = () => {
      if (!document.getElementById('deny-geo-css')) {
        const css = document.createElement('link');
        css.id = 'deny-geo-css';
        css.rel = 'stylesheet';
        css.href = 'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.css';
        document.head.appendChild(css);
      }
      const node = document.createElement('div');
      node.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
      const msg = document.createElement('span');
      const url = location.href.length > 64 ? location.href.slice(0, 61) + '...' : location.href;
      msg.textContent = `⛔ Blocked geolocation request from: ${url}`;
      const sep = document.createElement('span');
      sep.textContent = 'allow for:';
      sep.style.opacity = '0.8';
      node.append(
        msg,
        sep,
        btn('1d', () => allowSite(86400)),
        btn('always', () => allowSite('always')),
        btn('⚙', openConfig),
      );
      Toastify({
        node,
        duration: 10000,
        close: true,
        gravity: 'bottom',
        position: 'right',
        style: { background: '#e5484d', borderRadius: '8px' },
      }).showToast();
    };
    document.body ? show() : addEventListener('DOMContentLoaded', show, { once: true });
  };

  const deny = (_ok, err) => {
    notify();
    if (typeof err === 'function')
      setTimeout(() => {
        try {
          err(ERR);
        } catch (_e) {}
      }, 0);
  };

  Object.defineProperty(W.navigator, 'geolocation', {
    value: {
      getCurrentPosition: (ok, err) => deny(ok, err),
      watchPosition: (ok, err) => {
        deny(ok, err);
        return 0;
      },
      clearWatch: () => {},
    },
    configurable: false,
  });

  try {
    const perms = W.navigator.permissions;
    if (perms?.query) {
      const realQuery = perms.query.bind(perms);
      perms.query = (desc) =>
        desc?.name === 'geolocation'
          ? Promise.resolve({ state: 'denied', onchange: null })
          : realQuery(desc);
    }
  } catch (_e) {}
})();
