// ==UserScript==
// @name         Code Helpers — GitHub @-mention Bots
// @namespace    https://askclara.com/userscripts
// @version      3.1.0
// @description  Adds configurable "bots" to the @-mention autocomplete on GitHub, with a config panel + storage.
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @author       NorthIsUp
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-mention-bots.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-mention-bots.user.js
// @match        https://github.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

// HOW THIS WORKS — one method: DOM injection.
//
// The "edit the data" approach (wrap fetch, splice bots into the JSON GitHub
// renders) is cleaner, but it CANNOT work on Safari: GitHub is a strict-CSP site
// and Tampermonkey-Safari has no way to run our code in the page's MAIN world
// (no "Modify CSP headers" / no Inject-Mode setting in the Safari build), so a
// fetch wrap lands in an isolated sandbox the page never calls. The ONLY surface
// the Safari sandbox shares with the page is the DOM. So we work at the DOM:
// watch for the @-mention popup and inject bot rows into it.
//
// Two DOM strategies, switchable via the config panel:
//
//  • ownPopup (default): render our OWN dropdown at the caret — GitHub's users
//    (scraped from its popup) + matching bots — and hide GitHub's. We own the
//    keyboard fully. Only kicks in when a bot matches; pure user mentions stay
//    100% native. Fixes the two limits below.
//
//  • injection (ownPopup off): inject bot rows into GitHub's own popup, cloning
//    a *live* native row as the template (no hardcoded classes) so it tracks
//    GitHub's markup. Lighter, but two limits: GitHub CLOSES its popup when only
//    a bot matches (no native user) so the bot vanishes, and its keyboard nav
//    doesn't fully own our injected rows.

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────
  //  CUSTOM_BOTS — your own, code-defined bots. These are PINNED: they're
  //  merged in on every load (code wins over storage) so they always appear,
  //  regardless of what's in saved config. Edit them here, not in the panel.
  // ────────────────────────────────────────────────────────────────────────
  const CUSTOM_BOTS = [
    { login: 'claraclaw', name: 'ClaraClaw', avatar: '' },
    {
      login: 'errandd',
      name: 'Errandd',
      avatar: 'https://avatars.githubusercontent.com/u/122612?v=4',
    },
  ];

  // ────────────────────────────────────────────────────────────────────────
  //  Defaults — seed a fresh install, back "Reset to defaults", and (via
  //  SEED_VERSION, a hash of the default logins computed below) additively top
  //  up existing installs whenever the set changes. Curate via the panel after.
  // ────────────────────────────────────────────────────────────────────────
  const DEFAULTS = {
    maxResults: 100,
    showOnEmpty: true, // list all bots the moment "@" is typed
    showBadge: true, // small "bot" tag on the right of each entry
    // ownPopup: render our OWN dropdown (GitHub's users + bots) instead of
    // injecting into GitHub's popup. Kills the "disappears when only a bot
    // matches" limit and gives us full keyboard control. Off → classic DOM
    // injection into GitHub's own popup.
    ownPopup: true,
    bots: [
      {
        login: 'claude',
        name: 'Claude Code — Anthropic',
        avatar: 'https://avatars.githubusercontent.com/u/81847?v=4',
      },
      {
        login: 'copilot',
        name: 'GitHub Copilot',
        avatar: 'https://avatars.githubusercontent.com/u/9919?v=4',
      },
      {
        login: 'coderabbitai',
        name: 'CodeRabbit — AI review',
        avatar: 'https://avatars.githubusercontent.com/u/132028505?v=4',
      },
      {
        login: 'greptile',
        name: 'Greptile — AI review',
        avatar: 'https://avatars.githubusercontent.com/u/161434094?v=4',
      },
      {
        login: 'dependabot',
        name: 'Dependabot',
        avatar: 'https://avatars.githubusercontent.com/u/27347476?v=4',
      },
      {
        login: 'renovate',
        name: 'Renovate',
        avatar: 'https://avatars.githubusercontent.com/u/38656520?v=4',
      },
      {
        login: 'github-actions',
        name: 'GitHub Actions',
        avatar: 'https://avatars.githubusercontent.com/u/9919?v=4',
      },
      {
        login: 'codecov',
        name: 'Codecov',
        avatar: 'https://avatars.githubusercontent.com/u/8226205?v=4',
      },
      {
        login: 'sonarcloud',
        name: 'SonarCloud',
        avatar: 'https://avatars.githubusercontent.com/u/39168408?v=4',
      },
      {
        login: 'sentry-io',
        name: 'Sentry',
        avatar: 'https://avatars.githubusercontent.com/u/114699524?v=4',
      },
      {
        login: 'allcontributors',
        name: 'All Contributors',
        avatar: 'https://avatars.githubusercontent.com/u/46410174?v=4',
      },
    ],
  };

  const DEFAULT_AVATAR =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20">' +
        '<rect width="16" height="16" rx="4" fill="%236e7781"/>' +
        '<circle cx="5.5" cy="7" r="1.3" fill="white"/><circle cx="10.5" cy="7" r="1.3" fill="white"/>' +
        '<rect x="4.5" y="10" width="7" height="1.4" rx="0.7" fill="white"/></svg>',
    );

  const MENU_SELECTOR = 'ul.suggester, [role="listbox"]';

  // How bot rows are placed relative to GitHub's own results:
  //   'match'  → slotted in by match strength (prefix matches float up).
  //   'top'    → always above all native results.
  //   'bottom' → always appended below native results.
  const SORT_MODE = 'match';

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // SEED_VERSION is derived from the set of default logins (order-independent),
  // so editing DEFAULTS.bots automatically changes it and triggers the additive
  // top-up on existing installs — no manual bumping.
  function botsHash(bots) {
    const key = (bots || [])
      .map((b) => (b && b.login ? b.login.toLowerCase() : ''))
      .filter(Boolean)
      .sort()
      .join(',');
    let h = 0x811c9dc5; // FNV-1a (32-bit)
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  const SEED_VERSION = botsHash(DEFAULTS.bots);

  // ── storage ──────────────────────────────────────────────────────────────
  // Force CUSTOM_BOTS to the front and drop any stored dupes (code wins).
  function mergePinned(bots) {
    const pinned = CUSTOM_BOTS.filter((b) => b && b.login);
    const taken = new Set(pinned.map((b) => b.login.toLowerCase()));
    const rest = (bots || []).filter((b) => b && b.login && !taken.has(b.login.toLowerCase()));
    return [...clone(pinned), ...rest];
  }

  function loadConfig() {
    let saved = null;
    try {
      saved = GM_getValue('config', null);
    } catch (e) {}

    if (!saved || typeof saved !== 'object') {
      const fresh = clone(DEFAULTS);
      fresh.seedVersion = SEED_VERSION;
      fresh.bots = mergePinned(fresh.bots);
      saveConfig(fresh);
      return fresh;
    }

    const cfg = {
      maxResults: saved.maxResults ?? DEFAULTS.maxResults,
      showOnEmpty: saved.showOnEmpty ?? DEFAULTS.showOnEmpty,
      showBadge: saved.showBadge ?? DEFAULTS.showBadge,
      ownPopup: saved.ownPopup ?? DEFAULTS.ownPopup,
      bots: Array.isArray(saved.bots) ? saved.bots : clone(DEFAULTS.bots),
      seedVersion: saved.seedVersion ?? 0,
    };

    // Seed top-up: add any default bots this install has never seen. Additive
    // only — never removes or overwrites the user's own bots/edits.
    if (cfg.seedVersion !== SEED_VERSION) {
      const have = new Set(cfg.bots.map((b) => (b.login || '').toLowerCase()));
      for (const b of DEFAULTS.bots) {
        if (!have.has(b.login.toLowerCase())) cfg.bots.push(clone(b));
      }
      cfg.seedVersion = SEED_VERSION;
      saveConfig(cfg);
    }

    cfg.bots = mergePinned(cfg.bots); // runtime overlay; not persisted
    return cfg;
  }
  function saveConfig(cfg) {
    try {
      GM_setValue('config', cfg);
    } catch (e) {}
  }

  let config = loadConfig();

  // ── styling ────────────────────────────────────────────────────────────────
  // Row layout is applied inline (!important) per-element in buildItemStyled() so
  // GitHub's option CSS can't override it. This block supplies the mouse-hover and
  // our keyboard-cursor highlight, which can't be expressed inline.
  const style = document.createElement('style');
  style.textContent = `
    li[data-gh-bot]:hover,
    li[data-gh-bot][aria-selected="true"]{ background: rgba(128,128,128,.16) !important; }
    [role="option"][data-ghb-cursor]{ background: rgba(128,128,128,.16) !important; }
  `;
  (document.head || document.documentElement).appendChild(style);

  // ── read the current "@query" from the focused textarea/input ─────────────
  // Returns null when the caret is NOT inside an @-mention token (so #issue and
  // :emoji menus are left untouched). Focus inside the config panel's shadow
  // root resolves to the host element, which has no .value, so it returns null.
  function activeMentionQuery() {
    const el = document.activeElement;
    if (!el || typeof el.value !== 'string' || el.selectionStart == null) return null;
    const before = el.value.slice(0, el.selectionStart);
    const m = before.match(/(?:^|\s)@([A-Za-z0-9_-]*)$/);
    return m ? { el, q: m[1].toLowerCase() } : null;
  }

  function matchBots(q) {
    const bots = config.bots || [];
    if (q === '') return config.showOnEmpty ? bots.slice(0, config.maxResults) : [];
    return bots
      .map((b) => ({ b, hay: (b.login + ' ' + (b.name || '')).toLowerCase() }))
      .filter((x) => x.hay.includes(q))
      .sort(
        (a, z) =>
          (z.b.login.toLowerCase().startsWith(q) ? 1 : 0) -
          (a.b.login.toLowerCase().startsWith(q) ? 1 : 0),
      )
      .slice(0, config.maxResults)
      .map((x) => x.b);
  }

  // React tracks a controlled <textarea>'s value via its own setter, so a plain
  // el.value = ... gets reverted. Write through the native prototype setter and
  // dispatch input so React's onChange sees it.
  function setNativeValue(el, value) {
    try {
      const proto =
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        desc.set.call(el, value);
        return;
      }
    } catch (e) {}
    el.value = value;
  }

  function insertMention(bot) {
    const el = document.activeElement;
    if (!el || typeof el.value !== 'string') return;
    const pos = el.selectionStart;
    const before = el.value.slice(0, pos);
    const after = el.value.slice(pos);
    const m = before.match(/@([A-Za-z0-9_-]*)$/);
    if (!m) return;
    const start = pos - m[0].length;
    const insert = '@' + bot.login + ' ';
    setNativeValue(el, before.slice(0, start) + insert + after);
    const caret = start + insert.length;
    el.selectionStart = el.selectionEnd = caret;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  // Apply styles as inline !important so GitHub's option CSS can never win.
  function styleImp(el, styles) {
    for (const k in styles) el.style.setProperty(k, styles[k], 'important');
  }

  // Detect GitHub's React/Primer suggestion row (new composer).
  function isPrimerItem(li) {
    return !!(
      li &&
      (li.matches('[data-component="ActionList.Item"]') ||
        /ActionListItem/.test(li.className || '') ||
        li.querySelector('[data-component="ActionList.Item.Label"]'))
    );
  }

  // Clone a live native suggestion <li> and swap in the bot's avatar + label.
  // Inherits every Primer class + hover style and is robust to GitHub's per-deploy
  // CSS-hash churn, since we copy from a real, current node — no hardcoded classes.
  function buildItemFromTemplate(bot, sample) {
    const li = sample.cloneNode(true);
    li.removeAttribute('id');
    li.removeAttribute('aria-labelledby');
    li.removeAttribute('aria-describedby');
    li.setAttribute('aria-selected', 'false');
    li.removeAttribute('data-active');
    li.dataset.ghBot = '';
    li.dataset.botLogin = bot.login;
    li.dataset.value = '@' + bot.login;
    [...li.classList].forEach((c) => {
      if (c.startsWith('rgh-')) li.classList.remove(c);
    });

    const img = li.querySelector(
      'img[data-testid="github-avatar"], img[data-component="Avatar"], img',
    );
    if (img) {
      img.removeAttribute('srcset');
      img.alt = '@' + bot.login;
      img.onerror = () => {
        img.onerror = null;
        img.src = DEFAULT_AVATAR;
      };
      img.src = bot.avatar || DEFAULT_AVATAR;
    }

    const ident = li.querySelector('[class*="identifierText"]');
    const label = li.querySelector('[data-component="ActionList.Item.Label"]');
    if (ident) ident.textContent = bot.login;
    else if (label) label.textContent = bot.login;

    const desc = li.querySelector('[data-component="ActionList.Description"]');
    let descText = bot.name || '';
    if (config.showBadge) descText = descText ? descText + ' · bot' : 'bot';
    if (desc) {
      desc.textContent = descText;
      desc.setAttribute('title', descText);
    } else if (label) {
      const s = document.createElement('span');
      s.textContent = ' ' + descText;
      styleImp(s, { opacity: '0.6' });
      label.appendChild(s);
    }

    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      insertMention(bot);
    });
    li.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    // Classic composer (@github/combobox-nav) fires this on the selected option
    // when the user presses Enter/Tab — it navigates our injected role=option
    // rows natively, so this is the clean keyboard-commit path there.
    li.addEventListener('combobox-commit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      insertMention(bot);
    });
    return li;
  }

  // Dispatcher: reuse GitHub's own row markup when a native sample is available,
  // otherwise fall back to our self-styled row (classic text-expander composer
  // with no visible sample, or a template clone that failed).
  function buildItem(bot, sample) {
    if (sample) {
      try {
        return buildItemFromTemplate(bot, sample);
      } catch (e) {}
    }
    return buildItemStyled(bot);
  }

  function buildItemStyled(bot) {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.value = '@' + bot.login;
    li.dataset.ghBot = '';
    li.dataset.botLogin = bot.login;
    styleImp(li, {
      display: 'flex',
      'flex-direction': 'row',
      'align-items': 'center',
      gap: '8px',
      width: '100%',
      'box-sizing': 'border-box',
      padding: '6px 8px',
      margin: '0',
      'line-height': '1.2',
      'list-style': 'none',
      cursor: 'pointer',
    });

    const img = document.createElement('img');
    img.onerror = () => {
      img.onerror = null;
      img.src = DEFAULT_AVATAR;
    };
    img.src = bot.avatar || DEFAULT_AVATAR;
    styleImp(img, {
      width: '20px',
      height: '20px',
      'border-radius': '50%',
      flex: '0 0 auto',
      margin: '0',
    });
    li.appendChild(img);

    const login = document.createElement('span');
    login.textContent = bot.login;
    styleImp(login, {
      'font-weight': '600',
      flex: '0 0 auto',
      'white-space': 'nowrap',
      margin: '0',
    });
    li.appendChild(login);

    if (bot.name) {
      const name = document.createElement('span');
      name.textContent = bot.name;
      styleImp(name, {
        flex: '0 1 auto',
        'min-width': '0',
        opacity: '0.6',
        margin: '0',
        'white-space': 'nowrap',
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
      });
      li.appendChild(name);
    }
    if (config.showBadge) {
      const badge = document.createElement('span');
      badge.textContent = 'bot';
      styleImp(badge, {
        flex: '0 0 auto',
        'margin-left': 'auto',
        'font-size': '11px',
        'line-height': '1.4',
        opacity: '0.55',
        border: '1px solid currentColor',
        'border-radius': '4px',
        padding: '0 4px',
      });
      li.appendChild(badge);
    }

    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      insertMention(bot);
    });
    li.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    li.addEventListener('combobox-commit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      insertMention(bot);
    });
    return li;
  }

  // Match tiers (lower = better) for ranking a row against the query.
  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function matchTier(login, text, q) {
    login = (login || '').toLowerCase();
    text = (text || '').toLowerCase();
    if (!q) return 1;
    if (login === q) return 0;
    if (login.startsWith(q)) return 1;
    if (new RegExp('(^|[^a-z0-9])' + escapeRe(q)).test(text)) return 2;
    if (text.includes(q)) return 3;
    return 4;
  }
  // Handle for a native option: data-value is "@octocat" / "@org/team".
  function nativeLogin(li) {
    const dv = (li.getAttribute('data-value') || '').replace(/^@/, '');
    return dv || (li.textContent || '').trim().split(/\s+/)[0] || '';
  }

  function reconcile(menu) {
    const ctx = activeMentionQuery();
    const q = ctx ? ctx.q : null;
    let desired = q !== null ? matchBots(q) : [];

    const natives = [...menu.querySelectorAll('[role="option"]:not([data-gh-bot])')];
    // Don't duplicate a bot GitHub already suggests natively (e.g. copilot).
    if (desired.length && natives.length) {
      const nativeLogins = new Set(natives.map((n) => nativeLogin(n).toLowerCase()));
      desired = desired.filter((b) => !nativeLogins.has(b.login.toLowerCase()));
    }
    // Signature guard: only rebuild when the query, native set, desired bots, or
    // mode changes — and re-inject if GitHub wiped our rows. Setting the signature
    // before mutating makes our own mutations a no-op on re-entry.
    const sig =
      (q || '') +
      '|' +
      natives.map(nativeLogin).join(',') +
      '|' +
      desired.map((b) => b.login).join(',') +
      '|' +
      SORT_MODE;
    const haveBots = !!menu.querySelector('[data-gh-bot]');
    if (menu.__ghbSig === sig && (!desired.length || haveBots)) return;
    menu.__ghbSig = sig;

    menu.querySelectorAll('[data-gh-bot]').forEach((n) => n.remove());
    if (!desired.length) return;

    const sample = natives[0] || null;

    if (SORT_MODE === 'top') {
      [...desired]
        .reverse()
        .forEach((bot) => menu.insertBefore(buildItem(bot, sample), menu.firstChild));
    } else if (SORT_MODE === 'match') {
      desired.forEach((bot) => {
        const bt = matchTier(bot.login, bot.login + ' ' + (bot.name || ''), q);
        const ref = natives.find((n) => matchTier(nativeLogin(n), n.textContent, q) > bt) || null;
        menu.insertBefore(buildItem(bot, sample), ref); // ref=null → appended
      });
    } else {
      desired.forEach((bot) => menu.appendChild(buildItem(bot, sample)));
    }
  }

  // The listbox GitHub is actively driving is the one the focused combobox points
  // at via aria-controls. Using it avoids injecting into stale/duplicate overlays
  // the React composer briefly leaves mounted (the "two boxes" bug).
  function activeMentionMenu() {
    const el = document.activeElement;
    if (!el || !el.getAttribute) return null;
    const id = el.getAttribute('aria-controls');
    if (!id) return null;
    const menu = document.getElementById(id);
    if (menu && menu.matches(MENU_SELECTOR) && menu.offsetParent !== null) return menu;
    return null;
  }

  function sweep() {
    if (config.ownPopup) {
      sweepOwn();
      return;
    }
    const active = activeMentionMenu();
    if (active) {
      // Purge any bot rows we placed in other (stale) menus, then reconcile the
      // live one — so bots never appear in a detached overlay.
      document.querySelectorAll('[data-gh-bot]').forEach((n) => {
        if (!active.contains(n)) n.remove();
      });
      reconcile(active);
      return;
    }
    // Fallback for the classic composer, whose textarea has no aria-controls.
    document.querySelectorAll(MENU_SELECTOR).forEach((menu) => {
      if (menu.offsetParent !== null) reconcile(menu);
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sweep();
    });
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener('input', schedule, true);

  // ────────────────────────────────────────────────────────────────────────
  //  OWN POPUP  (config.ownPopup — default on)
  //  Piggybacking on GitHub's popup can't clear two limits on Safari: GitHub
  //  CLOSES its popup when only bots match (no native user) and its keyboard nav
  //  doesn't own our injected rows. Instead we render OUR OWN dropdown: scrape
  //  GitHub's user rows out of its popup, show them together with matching bots,
  //  hide GitHub's, and own the keyboard fully. Pure DOM → same on Safari/Chrome.
  // ────────────────────────────────────────────────────────────────────────
  let ownPopup = null;
  let ownItems = [];
  let ownIdx = 0;

  function ensureOwnPopup() {
    if (ownPopup && document.body.contains(ownPopup)) return ownPopup;
    ownPopup = document.createElement('div');
    ownPopup.id = 'ghb-own-popup';
    styleImp(ownPopup, {
      position: 'absolute',
      'z-index': '2147483645',
      display: 'none',
      'min-width': '180px',
      'max-width': '440px',
      'max-height': '260px',
      overflow: 'auto',
      background: 'var(--bgColor-default, var(--color-canvas-overlay, #fff))',
      color: 'var(--fgColor-default, var(--color-fg-default, #1f2328))',
      border: '1px solid rgba(128,128,128,.35)',
      'border-radius': '8px',
      'box-shadow': '0 8px 24px rgba(0,0,0,.25)',
      padding: '4px',
      margin: '0',
      font: '13px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
    });
    document.body.appendChild(ownPopup);
    return ownPopup;
  }
  function ownVisible() {
    return !!(ownPopup && ownPopup.style.display !== 'none' && document.body.contains(ownPopup));
  }
  function hideOwnPopup() {
    if (ownPopup) styleImp(ownPopup, { display: 'none' });
    ownItems = [];
    ownIdx = 0;
  }

  // Find GitHub's native mention menu even after we've display:none'd it (it stays
  // in the DOM with its options, which is what we scrape). Excludes our own popup.
  function nativeMentionMenu() {
    const el = document.activeElement;
    const id = el && el.getAttribute ? el.getAttribute('aria-controls') : null;
    if (id) {
      const m = document.getElementById(id);
      if (m && m.matches(MENU_SELECTOR)) return m;
    }
    return (
      [...document.querySelectorAll(MENU_SELECTOR)].find(
        (m) => m.id !== 'ghb-own-popup' && m.querySelector('[role="option"]'),
      ) || null
    );
  }

  // Pixel coords of the caret inside a textarea/input, via a mirror element.
  function caretCoords(el) {
    const cs = getComputedStyle(el);
    const mirror = document.createElement('div');
    const copy = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'letterSpacing',
      'textTransform',
      'lineHeight',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'boxSizing',
      'width',
    ];
    copy.forEach((p) => {
      mirror.style[p] = cs[p];
    });
    styleImp(mirror, {
      position: 'absolute',
      visibility: 'hidden',
      'white-space': 'pre-wrap',
      'overflow-wrap': 'break-word',
      top: '0',
      left: '0',
    });
    mirror.textContent = el.value.slice(0, el.selectionStart);
    const marker = document.createElement('span');
    marker.textContent = el.value.slice(el.selectionStart) || '.';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const rect = el.getBoundingClientRect();
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 18;
    const x = rect.left + window.scrollX + (marker.offsetLeft - el.scrollLeft);
    const y = rect.top + window.scrollY + (marker.offsetTop - el.scrollTop) + lh;
    mirror.remove();
    return { x, y };
  }

  function scrapeUser(o) {
    const dv = (o.getAttribute('data-value') || '').replace(/^@/, '');
    const login = dv || (o.textContent || '').trim().split(/\s+/)[0] || '';
    if (!login) return null;
    const img = o.querySelector('img');
    const txt = (o.textContent || '').replace(/\s+/g, ' ').trim();
    const name = txt.toLowerCase().startsWith(login.toLowerCase())
      ? txt.slice(login.length).trim()
      : txt.replace(login, '').trim();
    return { login, name, avatar: img ? img.src : '', bot: false };
  }

  function ownRow(it, i) {
    const row = document.createElement('div');
    row.className = 'ghb-own-row';
    row.dataset.idx = i;
    styleImp(row, {
      display: 'flex',
      'align-items': 'center',
      gap: '8px',
      padding: '5px 8px',
      'border-radius': '6px',
      cursor: 'pointer',
      'white-space': 'nowrap',
    });
    const img = document.createElement('img');
    img.onerror = () => {
      img.onerror = null;
      img.src = DEFAULT_AVATAR;
    };
    img.src = it.avatar || DEFAULT_AVATAR;
    styleImp(img, { width: '20px', height: '20px', 'border-radius': '50%', flex: '0 0 auto' });
    row.appendChild(img);
    const login = document.createElement('span');
    login.textContent = it.login;
    styleImp(login, { 'font-weight': '600', flex: '0 0 auto' });
    row.appendChild(login);
    if (it.name) {
      const name = document.createElement('span');
      name.textContent = it.name;
      styleImp(name, {
        opacity: '0.6',
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
        'min-width': '0',
        flex: '0 1 auto',
      });
      row.appendChild(name);
    }
    if (it.bot && config.showBadge) {
      const badge = document.createElement('span');
      badge.textContent = 'bot';
      styleImp(badge, {
        'margin-left': 'auto',
        'font-size': '11px',
        opacity: '0.55',
        border: '1px solid currentColor',
        'border-radius': '4px',
        padding: '0 4px',
        flex: '0 0 auto',
      });
      row.appendChild(badge);
    }
    row.addEventListener('mousedown', (e) => {
      e.preventDefault();
      insertMention({ login: it.login });
      hideOwnPopup();
    });
    return row;
  }

  function ownHighlight(idx) {
    ownIdx = idx;
    [...ownPopup.children].forEach((r, i) => {
      styleImp(r, { background: i === idx ? 'rgba(128,128,128,.18)' : 'transparent' });
      if (i === idx) r.scrollIntoView({ block: 'nearest' });
    });
  }
  function ownMove(d) {
    if (!ownItems.length) return;
    ownHighlight((ownIdx + d + ownItems.length) % ownItems.length);
  }
  function ownCommit() {
    const it = ownItems[ownIdx];
    if (it) insertMention({ login: it.login });
    hideOwnPopup();
  }

  let lastOwnSig = '';
  function unhideNative(native) {
    if (native && native.style.display === 'none') native.style.removeProperty('display');
  }
  function sweepOwn() {
    const ctx = activeMentionQuery();
    if (!ctx) {
      if (ownVisible()) hideOwnPopup();
      lastOwnSig = '';
      return;
    }
    const bots = matchBots(ctx.q).map((b) => ({
      login: b.login,
      name: b.name,
      avatar: b.avatar,
      bot: true,
    }));
    const native = nativeMentionMenu();
    // Only take over when a bot actually matches — pure user mentions stay 100%
    // native (GitHub's own popup, untouched).
    if (!bots.length) {
      if (ownVisible()) hideOwnPopup();
      unhideNative(native);
      lastOwnSig = '';
      return;
    }
    const users = native
      ? [...native.querySelectorAll('[role="option"]')].map(scrapeUser).filter(Boolean)
      : [];
    const seen = new Set(bots.map((b) => b.login.toLowerCase()));
    const items = [...bots, ...users.filter((u) => !seen.has(u.login.toLowerCase()))].slice(
      0,
      config.maxResults,
    );
    // Hide GitHub's own popup (only when actually visible, to avoid mutation
    // churn feeding our own observer).
    if (native && native.style.display !== 'none') styleImp(native, { display: 'none' });
    // Signature guard: our own rendering mutates the DOM and would retrigger the
    // observer forever. Re-render only when the query or the result set changes.
    const sig = ctx.q + '|' + items.map((i) => (i.bot ? '*' : '') + i.login).join(',');
    if (sig === lastOwnSig && ownVisible()) return;
    lastOwnSig = sig;
    try {
      const p = ensureOwnPopup();
      p.innerHTML = '';
      ownItems = items;
      items.forEach((it, i) => p.appendChild(ownRow(it, i)));
      const c = caretCoords(ctx.el);
      const maxLeft = window.scrollX + document.documentElement.clientWidth - 450;
      styleImp(p, {
        display: 'block',
        left: Math.max(window.scrollX + 4, Math.min(c.x, maxLeft)) + 'px',
        top: c.y + 'px',
      });
      ownHighlight(0);
    } catch (e) {
      hideOwnPopup();
      unhideNative(native);
      lastOwnSig = '';
    }
  }

  // Dismiss the own popup on an outside click.
  document.addEventListener(
    'mousedown',
    (e) => {
      if (ownVisible() && ownPopup && !ownPopup.contains(e.target)) hideOwnPopup();
    },
    true,
  );

  // ── keyboard navigation ────────────────────────────────────────────────────
  // GitHub's combobox only knows about the rows IT rendered, so our injected rows
  // are invisible to its arrow keys. When a live mention menu contains our rows we
  // take over Arrow/Enter/Tab entirely (capture phase + stopImmediatePropagation,
  // so GitHub never double-handles) and drive one cursor across ALL options —
  // native and injected. Works in both the classic and React composers.
  function ghbOptions(menu) {
    return [...menu.querySelectorAll('[role="option"]')].filter((o) => o.offsetParent !== null);
  }
  function ghbSetCursor(opts, idx) {
    opts.forEach((o, i) => {
      const on = i === idx;
      o.toggleAttribute('data-ghb-cursor', on);
      o.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) o.scrollIntoView({ block: 'nearest' });
    });
  }
  function ghbCommit(opt) {
    const login = opt.dataset.botLogin;
    if (login) {
      const bot = (config.bots || []).find((b) => b.login === login);
      if (bot) insertMention(bot);
      return;
    }
    // Native option: replay a real mouse commit (both composers commit on click).
    for (const type of ['mousedown', 'mouseup', 'click']) {
      opt.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }
  function ghbActiveMenuWithBots() {
    const active = activeMentionMenu();
    if (active && active.querySelector('[data-gh-bot]')) return active;
    return (
      [...document.querySelectorAll(MENU_SELECTOR)].find(
        (m) => m.offsetParent !== null && m.querySelector('[data-gh-bot]'),
      ) || null
    );
  }
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // Own popup owns the keyboard whenever it's showing.
      if (config.ownPopup && ownVisible()) {
        if (e.key === 'Escape') {
          hideOwnPopup();
        } else if (e.key === 'ArrowDown') {
          ownMove(1);
        } else if (e.key === 'ArrowUp') {
          ownMove(-1);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          ownCommit();
        } else {
          return; // let other keys (typing) through
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (config.ownPopup) return; // own-popup mode: skip the DOM-injection nav below
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) return;
      const menu = ghbActiveMenuWithBots();
      if (!menu) return;
      const opts = ghbOptions(menu);
      if (!opts.length) return;
      // Classic composer: GitHub's own @github/combobox-nav navigates ALL
      // [role="option"] rows live (including ours) and fires combobox-commit on
      // Enter, which each injected row handles. Running our nav too would create
      // a SECOND cursor fighting GitHub's. So stand down here and only drive the
      // React/Primer composer, where our rows aren't in GitHub's own nav.
      if (!isPrimerItem(opts[0])) return;
      let idx = opts.findIndex((o) => o.hasAttribute('data-ghb-cursor'));
      if (idx < 0) idx = opts.findIndex((o) => o.getAttribute('aria-selected') === 'true');
      if (idx < 0) idx = 0;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        ghbSetCursor(opts, idx);
      } else {
        ghbCommit(opts[idx]); // Enter / Tab
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );

  // ────────────────────────────────────────────────────────────────────────
  //  Config panel
  // ────────────────────────────────────────────────────────────────────────
  function openConfig() {
    if (document.getElementById('gh-bot-config-host')) return;

    const host = document.createElement('div');
    host.id = 'gh-bot-config-host';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{all:initial;}
        *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;}
        .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646;}
        .panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;
          width:min(700px,92vw);max-height:88vh;overflow:auto;background:#fff;color:#1f2328;
          border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.3);padding:16px 18px;}
        h2{font-size:16px;margin:0;}
        header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
        button{cursor:pointer;border-radius:6px;border:1px solid #d0d7de;background:#f6f8fa;color:inherit;padding:5px 10px;font-size:13px;}
        button.save{background:#1f883d;border-color:#1f883d;color:#fff;}
        button.x,button.del{border:none;background:transparent;font-size:14px;padding:2px 6px;opacity:.6;}
        button.x:hover,button.del:hover{opacity:1;}
        input{border:1px solid #d0d7de;border-radius:6px;padding:5px 8px;font-size:13px;background:#fff;color:#1f2328;}
        .settings{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 0 12px;
          border-bottom:1px solid rgba(128,128,128,.25);margin-bottom:10px;font-size:13px;}
        .settings label{display:flex;align-items:center;gap:6px;}
        .settings input[type=number]{width:56px;}
        .row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
        .row .ava{width:24px;height:24px;border-radius:50%;flex:0 0 auto;object-fit:cover;background:rgba(128,128,128,.4);}
        .row input{flex:1;min-width:0;}
        .row input[data-k=login]{flex:0 0 140px;}
        .add{margin:4px 0 12px;}
        footer{display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:12px;border-top:1px solid rgba(128,128,128,.25);}
        .spacer{flex:1;}
        .hint{font-size:12px;opacity:.6;margin:0 0 10px;}
        @media (prefers-color-scheme: dark){
          .panel{background:#161b22;color:#e6edf3;}
          button{background:#21262d;border-color:#30363d;}
          button.save{background:#238636;border-color:#238636;}
          input{background:#0d1117;color:#e6edf3;border-color:#30363d;}
        }
      </style>
      <div class="backdrop"></div>
      <div class="panel" role="dialog" aria-modal="true" aria-label="Mention bots">
        <header><h2>Mention bots</h2><button class="x" title="Close">&#10005;</button></header>
        <p class="hint">These appear in GitHub's @-autocomplete. "login" is what gets inserted (as @login).</p>
        <section class="settings">
          <label><input type="checkbox" data-s="ownPopup"> Own popup (bots + users; fixes bot-only queries)</label>
          <label><input type="checkbox" data-s="showOnEmpty"> Show all on &ldquo;@&rdquo;</label>
          <label><input type="checkbox" data-s="showBadge"> Show &ldquo;bot&rdquo; badge</label>
          <label>Max results <input type="number" min="1" max="500" data-s="maxResults"></label>
        </section>
        <section class="bots"></section>
        <button class="add">+ Add bot</button>
        <footer>
          <button class="reset">Reset to defaults</button>
          <span class="spacer"></span>
          <button class="cancel">Cancel</button>
          <button class="save">Save</button>
        </footer>
      </div>`;
    document.body.appendChild(host);

    const $ = (s) => root.querySelector(s);
    const botsWrap = $('.bots');

    $('[data-s="ownPopup"]').checked = !!config.ownPopup;
    $('[data-s="showOnEmpty"]').checked = !!config.showOnEmpty;
    $('[data-s="showBadge"]').checked = !!config.showBadge;
    $('[data-s="maxResults"]').value = config.maxResults;

    function mkInput(key, val, ph) {
      const i = document.createElement('input');
      i.dataset.k = key;
      i.value = val || '';
      i.placeholder = ph;
      return i;
    }
    function addRow(bot = { login: '', name: '', avatar: '' }) {
      const row = document.createElement('div');
      row.className = 'row';
      const img = document.createElement('img');
      img.className = 'ava';
      img.onerror = () => {
        img.src = DEFAULT_AVATAR;
      };
      img.src = bot.avatar || DEFAULT_AVATAR;
      const login = mkInput('login', bot.login, 'login');
      const name = mkInput('name', bot.name, 'display name (optional)');
      const avatar = mkInput('avatar', bot.avatar, 'avatar URL (optional)');
      avatar.addEventListener('input', () => {
        img.src = avatar.value || DEFAULT_AVATAR;
      });
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.title = 'Remove';
      del.addEventListener('click', () => row.remove());
      row.append(img, login, name, avatar, del);
      botsWrap.appendChild(row);
    }

    const pinnedLogins = new Set(CUSTOM_BOTS.map((b) => (b.login || '').toLowerCase()));
    (config.bots || [])
      .filter((b) => !pinnedLogins.has((b.login || '').toLowerCase()))
      .forEach(addRow);
    if (pinnedLogins.size) {
      const note = document.createElement('p');
      note.className = 'hint';
      note.textContent = `+ ${pinnedLogins.size} pinned bot(s) defined in code (CUSTOM_BOTS) — edit those in the script.`;
      botsWrap.appendChild(note);
    }
    $('.add').addEventListener('click', () => addRow());

    function collect() {
      const bots = [...botsWrap.querySelectorAll('.row')]
        .map((row) => {
          const g = (k) => row.querySelector(`[data-k="${k}"]`).value.trim();
          return {
            login: g('login').replace(/^@/, ''),
            name: g('name'),
            avatar: g('avatar'),
          };
        })
        .filter((b) => b.login);
      return {
        maxResults: Math.max(
          1,
          Math.min(500, parseInt($('[data-s="maxResults"]').value, 10) || DEFAULTS.maxResults),
        ),
        ownPopup: $('[data-s="ownPopup"]').checked,
        showOnEmpty: $('[data-s="showOnEmpty"]').checked,
        showBadge: $('[data-s="showBadge"]').checked,
        bots,
        seedVersion: SEED_VERSION,
      };
    }

    const close = () => host.remove();
    $('.x').addEventListener('click', close);
    $('.cancel').addEventListener('click', close);
    $('.backdrop').addEventListener('click', close);
    $('.reset').addEventListener('click', () => {
      if (confirm('Reset bots and settings to the script defaults? (Pinned CUSTOM_BOTS stay.)')) {
        const next = clone(DEFAULTS);
        next.seedVersion = SEED_VERSION;
        saveConfig(next);
        next.bots = mergePinned(next.bots);
        config = next;
        close();
      }
    });
    $('.save').addEventListener('click', () => {
      const next = collect();
      saveConfig(next);
      next.bots = mergePinned(next.bots);
      config = next;
      close();
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('⚙️ Configure mention bots…', openConfig);
  }
})();
