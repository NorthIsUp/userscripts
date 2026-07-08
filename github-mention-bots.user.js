// ==UserScript==
// @name         Code Helpers — GitHub @-mention Bots
// @namespace    https://askclara.com/userscripts
// @version      1.1.0
// @description  Adds configurable "bots" to the @-mention autocomplete on GitHub, with a config panel + storage.
// @icon                data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64              data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @author       Adam
// @match        https://github.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-mention-bots.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-mention-bots.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────
  //  Defaults — used to seed storage on first run and for "Reset to defaults".
  //  After that, edit bots via the Tampermonkey menu → "Configure mention bots".
  // ────────────────────────────────────────────────────────────────────────
  const CUSTOM_BOTS = [
      { login: 'claraclaw', name: 'ClaraClaw', avatar: '' },
  ];
  const DEFAULTS = {
    maxResults: 8,
    showOnEmpty: true,   // list all bots the moment "@" is typed
    showBadge: true,     // small "bot" tag on the right of each entry
    bots: [
      ...CUSTOM_BOTS,
      { login: 'claude',          name: 'Claude Code — Anthropic',  avatar: 'https://github.com/anthropics.png' },
      { login: 'copilot',         name: 'GitHub Copilot',           avatar: 'https://github.com/github.png' },
      { login: 'coderabbitai',    name: 'CodeRabbit — AI review',   avatar: 'https://github.com/coderabbitai.png' },
      { login: 'dependabot',      name: 'Dependabot',               avatar: 'https://github.com/dependabot.png' },
      { login: 'renovate',        name: 'Renovate',                 avatar: 'https://github.com/renovatebot.png' },
      { login: 'github-actions',  name: 'GitHub Actions',           avatar: 'https://github.com/github.png' },
      { login: 'codecov',         name: 'Codecov',                  avatar: 'https://github.com/codecov.png' },
      { login: 'sonarcloud',      name: 'SonarCloud',               avatar: 'https://github.com/SonarSource.png' },
      { login: 'sentry-io',       name: 'Sentry',                   avatar: 'https://github.com/getsentry.png' },
      { login: 'allcontributors', name: 'All Contributors',         avatar: 'https://github.com/all-contributors.png' },
    ],
  };

  const DEFAULT_AVATAR =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20">' +
      '<rect width="16" height="16" rx="4" fill="%236e7781"/>' +
      '<circle cx="5.5" cy="7" r="1.3" fill="white"/><circle cx="10.5" cy="7" r="1.3" fill="white"/>' +
      '<rect x="4.5" y="10" width="7" height="1.4" rx="0.7" fill="white"/></svg>'
    );

  const MENU_SELECTOR = 'ul.suggester, [role="listbox"]';

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ── storage ──────────────────────────────────────────────────────────────
  function loadConfig() {
    let saved = null;
    try { saved = GM_getValue('config', null); } catch (e) {}
    if (!saved || typeof saved !== 'object') return clone(DEFAULTS);
    return {
      maxResults: saved.maxResults ?? DEFAULTS.maxResults,
      showOnEmpty: saved.showOnEmpty ?? DEFAULTS.showOnEmpty,
      showBadge: saved.showBadge ?? DEFAULTS.showBadge,
      bots: Array.isArray(saved.bots) ? saved.bots : clone(DEFAULTS.bots),
    };
  }
  function saveConfig(cfg) { try { GM_setValue('config', cfg); } catch (e) {} }

  let config = loadConfig();

  // ── injected-row styling ──────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    [data-gh-bot]{display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;}
    [data-gh-bot]:hover{background:rgba(128,128,128,.15);}
    [data-gh-bot] .gh-bot-login{font-weight:600;}
    [data-gh-bot] .gh-bot-name{opacity:.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    [data-gh-bot] .gh-bot-badge{margin-left:auto;font-size:11px;opacity:.55;border:1px solid currentColor;border-radius:4px;padding:0 4px;}
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
      .sort((a, z) => (z.b.login.toLowerCase().startsWith(q) ? 1 : 0) -
                      (a.b.login.toLowerCase().startsWith(q) ? 1 : 0))
      .slice(0, config.maxResults)
      .map((x) => x.b);
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
    el.value = before.slice(0, start) + insert + after;
    const caret = start + insert.length;
    el.selectionStart = el.selectionEnd = caret;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  function buildItem(bot, sampleClass) {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    if (sampleClass) li.className = sampleClass;
    li.dataset.value = '@' + bot.login;
    li.dataset.ghBot = '';
    li.dataset.botLogin = bot.login;

    const img = document.createElement('img');
    img.width = 20; img.height = 20;
    img.style.cssText = 'border-radius:50%;flex:0 0 auto;';
    img.onerror = () => { img.onerror = null; img.src = DEFAULT_AVATAR; };
    img.src = bot.avatar || DEFAULT_AVATAR;
    li.appendChild(img);

    const login = document.createElement('span');
    login.className = 'gh-bot-login';
    login.textContent = bot.login;
    li.appendChild(login);

    if (bot.name) {
      const name = document.createElement('span');
      name.className = 'gh-bot-name';
      name.textContent = bot.name;
      li.appendChild(name);
    }
    if (config.showBadge) {
      const badge = document.createElement('span');
      badge.className = 'gh-bot-badge';
      badge.textContent = 'bot';
      li.appendChild(badge);
    }

    li.addEventListener('mousedown', (e) => { e.preventDefault(); insertMention(bot); });
    li.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    return li;
  }

  function reconcile(menu) {
    const ctx = activeMentionQuery();
    const desired = ctx ? matchBots(ctx.q) : [];
    const desiredKeys = desired.map((b) => b.login).join(',');
    const existing = [...menu.querySelectorAll('[data-gh-bot]')];
    const existingKeys = existing.map((li) => li.dataset.botLogin).join(',');
    if (desiredKeys === existingKeys) return;

    existing.forEach((n) => n.remove());
    if (!desired.length) return;
    const sample = menu.querySelector('[role="option"]:not([data-gh-bot]), li.suggestion:not([data-gh-bot])');
    const sampleClass = sample ? sample.className : '';
    desired.forEach((bot) => menu.appendChild(buildItem(bot, sampleClass)));
  }

  function sweep() {
    document.querySelectorAll(MENU_SELECTOR).forEach((menu) => {
      if (menu.offsetParent !== null) reconcile(menu);
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; sweep(); });
  };

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('input', schedule, true);

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
          <label><input type="checkbox" data-s="showOnEmpty"> Show all on &ldquo;@&rdquo;</label>
          <label><input type="checkbox" data-s="showBadge"> Show &ldquo;bot&rdquo; badge</label>
          <label>Max results <input type="number" min="1" max="25" data-s="maxResults"></label>
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

    $('[data-s="showOnEmpty"]').checked = !!config.showOnEmpty;
    $('[data-s="showBadge"]').checked = !!config.showBadge;
    $('[data-s="maxResults"]').value = config.maxResults;

    function mkInput(key, val, ph) {
      const i = document.createElement('input');
      i.dataset.k = key; i.value = val || ''; i.placeholder = ph;
      return i;
    }
    function addRow(bot = { login: '', name: '', avatar: '' }) {
      const row = document.createElement('div');
      row.className = 'row';
      const img = document.createElement('img');
      img.className = 'ava';
      img.onerror = () => { img.src = DEFAULT_AVATAR; };
      img.src = bot.avatar || DEFAULT_AVATAR;
      const login = mkInput('login', bot.login, 'login');
      const name = mkInput('name', bot.name, 'display name (optional)');
      const avatar = mkInput('avatar', bot.avatar, 'avatar URL (optional)');
      avatar.addEventListener('input', () => { img.src = avatar.value || DEFAULT_AVATAR; });
      const del = document.createElement('button');
      del.className = 'del'; del.textContent = '✕'; del.title = 'Remove';
      del.addEventListener('click', () => row.remove());
      row.append(img, login, name, avatar, del);
      botsWrap.appendChild(row);
    }

    (config.bots || []).forEach(addRow);
    $('.add').addEventListener('click', () => addRow());

    function collect() {
      const bots = [...botsWrap.querySelectorAll('.row')].map((row) => {
        const g = (k) => row.querySelector(`[data-k="${k}"]`).value.trim();
        return { login: g('login').replace(/^@/, ''), name: g('name'), avatar: g('avatar') };
      }).filter((b) => b.login);
      return {
        maxResults: Math.max(1, Math.min(25, parseInt($('[data-s="maxResults"]').value, 10) || 8)),
        showOnEmpty: $('[data-s="showOnEmpty"]').checked,
        showBadge: $('[data-s="showBadge"]').checked,
        bots,
      };
    }

    const close = () => host.remove();
    $('.x').addEventListener('click', close);
    $('.cancel').addEventListener('click', close);
    $('.backdrop').addEventListener('click', close);
    $('.reset').addEventListener('click', () => {
      if (confirm('Reset bots and settings to the script defaults?')) {
        config = clone(DEFAULTS);
        saveConfig(config);
        close();
      }
    });
    $('.save').addEventListener('click', () => {
      config = collect();
      saveConfig(config);
      close();
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('⚙️ Configure mention bots…', openConfig);
  }
})();
