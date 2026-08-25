import type { ScriptMeta } from '../lib/meta';

export const meta: ScriptMeta = {
  name: 'Deny Geolocation',
  version: '0.2.4',
  description: 'Sites asking for location get an instant PERMISSION_DENIED, no prompt.',
  match: ['*://*/*'],
  runAt: 'document-start',
  icon: 'geo',
  grant: ['GM_registerMenuCommand', 'GM_getValue', 'GM_setValue'],
};

import { menuCommand, openPanel, toast } from '../lib/ui';

// granted scripts run sandboxed; patch the real page window through unsafeWindow
const W = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as typeof unsafeWindow;

const STORE_KEY = 'denyGeo.allows';
const MUTE_KEY = 'denyGeo.mute';

/** Expiry epoch ms, or "always". */
type Allow = number | 'always';
type Allows = Record<string, Allow>;

// { "example.com": epochMs | "always" } — deny is the default, only allows are stored
const store = (): Allows => {
  try {
    return JSON.parse(GM_getValue(STORE_KEY, '{}'));
  } catch {
    return {};
  }
};
const save = (a: Allows) => GM_setValue(STORE_KEY, JSON.stringify(a));

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
const matchEntry = (allows: Allows) =>
  Object.keys(allows).find(
    (d) => location.hostname === d || location.hostname.endsWith(`.${d}`) || baseHost === d,
  );

const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

const setAllow = (domain: string, durSec: number | 'always') => {
  const a = store();
  a[domain] = durSec === 'always' ? 'always' : Date.now() + durSec * 1000;
  save(a);
};
const removeAllow = (domain: string) => {
  const a = store();
  delete a[domain];
  save(a);
};
const allowSite = (durSec: number | 'always') => {
  setAllow(baseHost, durSec);
  location.reload();
};

const btn = (label: string, onclick: () => void) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onclick);
  return b;
};

const fmtExpiry = (v: Allow) => (v === 'always' ? 'always' : new Date(v).toLocaleString());

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
        site.append(
          `${location.hostname}: allowed`,
          btn('block again', () => {
            removeAllow(current);
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
      body.appendChild(site);

      const entries = Object.entries(allows).sort(([a], [b]) => a.localeCompare(b));
      if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'no allowed sites — everything is denied';
        body.appendChild(empty);
      } else {
        const table = document.createElement('table');
        for (const [domain, expiry] of entries) {
          const tr = document.createElement('tr');
          const cell = (content: string | Node, css?: string) => {
            const td = document.createElement('td');
            if (css) td.style.cssText = css;
            if (typeof content === 'string') td.textContent = content;
            else td.appendChild(content);
            return td;
          };
          const remove = btn('✕', () => {
            removeAllow(domain);
            // Dropping the entry that allows *this* page has to take effect now.
            if (domain === matchEntry({ [domain]: expiry })) location.reload();
            else panel.refresh();
          });
          remove.className = 'plain';
          tr.append(
            cell(domain),
            cell(fmtExpiry(expiry), 'color:var(--muted)'),
            cell(remove, 'text-align:right'),
          );
          table.appendChild(tr);
        }
        body.appendChild(table);
      }

      const addRow = document.createElement('div');
      addRow.className = 'row';
      const input = document.createElement('input');
      input.placeholder = 'add domain, e.g. example.com';
      const addFor = (dur: number | 'always') => {
        const d = input.value
          .trim()
          .toLowerCase()
          .replace(/^www\./, '');
        if (!d) return;
        setAllow(d, dur);
        panel.refresh();
      };
      addRow.append(
        input,
        btn('1d', () => addFor(86400)),
        btn('always', () => addFor('always')),
      );
      body.appendChild(addRow);

      const mute = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isMuted();
      cb.addEventListener('change', () => {
        try {
          localStorage.setItem(MUTE_KEY, cb.checked ? '1' : '0');
        } catch {}
      });
      mute.append(cb, 'mute toasts on this site (still blocks)');
      body.appendChild(mute);
    },
  });
}

menuCommand('Configure ⚙', openConfig);
try {
  W.denyGeoConfig = openConfig;
} catch {}

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
    if (isMuted() || Date.now() - lastToast < 3000) return;
    lastToast = Date.now();
    const url = location.href.length > 64 ? `${location.href.slice(0, 61)}...` : location.href;
    toast({
      text: `⛔ Blocked geolocation request from: ${url}`,
      tone: 'danger',
      actions: [
        { label: 'allow 1d', onClick: () => allowSite(86400) },
        { label: 'allow always', onClick: () => allowSite('always') },
        { label: '⚙', onClick: openConfig },
      ],
    });
  };

  const deny = (_ok: unknown, err: unknown) => {
    notify();
    if (typeof err === 'function')
      setTimeout(() => {
        try {
          err(ERR);
        } catch {}
      }, 0);
  };

  Object.defineProperty(W.navigator, 'geolocation', {
    value: {
      getCurrentPosition: (ok: unknown, err: unknown) => deny(ok, err),
      watchPosition: (ok: unknown, err: unknown) => {
        deny(ok, err);
        return 0;
      },
      clearWatch: () => {},
    },
    configurable: false,
  });

  try {
    const perms = W.navigator.permissions as Permissions | undefined;
    if (perms?.query) {
      const realQuery = perms.query.bind(perms);
      perms.query = ((desc: PermissionDescriptor) =>
        desc?.name === 'geolocation'
          ? Promise.resolve({ state: 'denied', onchange: null } as unknown as PermissionStatus)
          : realQuery(desc)) as Permissions['query'];
    }
  } catch {}
}
