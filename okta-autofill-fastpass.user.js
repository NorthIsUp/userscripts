// ==UserScript==
// @name         Okta autofill + FastPass — teamclara
// @namespace    https://github.com/NorthIsUp/userscripts/okta-autofill-fastpass
// @version      2.1.5
// @description  Fills username + "Keep me signed in" + Next, then clicks FastPass when it appears
// @icon         https://www.okta.com/favicon.ico
// @match        https://teamclara.okta.com/*
// @match        https://*.okta.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @noframes
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/okta-autofill-fastpass.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/okta-autofill-fastpass.user.js
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
          node.className = `toast${opts.tone === 'danger' ? ' danger' : ''}`;
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
          const duration = opts.duration;
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
  /** A row of labelled controls, one per setting, that reads back as an object. */
  function settingsEditor(settings, values) {
      const el = document.createElement('div');
      el.className = 'settings';
      const controls = new Map();
      for (const setting of settings) {
          const label = document.createElement('label');
          const value = values[setting.key];
          if (setting.kind === 'select') {
              const select = document.createElement('select');
              for (const choice of setting.options) {
                  const option = document.createElement('option');
                  option.value = choice.value;
                  option.textContent = choice.label;
                  select.appendChild(option);
              }
              // A value that isn't one of the options leaves selectedIndex at -1, so
              // the control renders blank and reads back as ''. Fall back to the first
              // option instead, the way the number branch falls back to its old value.
              select.value = String(value ?? '');
              if (select.selectedIndex < 0)
                  select.selectedIndex = 0;
              controls.set(setting.key, select);
              label.append(setting.label, select);
              el.appendChild(label);
              continue;
          }
          const input = document.createElement('input');
          controls.set(setting.key, input);
          switch (setting.kind) {
              case 'boolean':
                  input.type = 'checkbox';
                  input.checked = Boolean(value);
                  label.append(input, setting.label);
                  break;
              case 'number':
                  input.type = 'number';
                  if (setting.min != null)
                      input.min = String(setting.min);
                  if (setting.max != null)
                      input.max = String(setting.max);
                  input.value = String(value ?? '');
                  label.append(setting.label, input);
                  break;
              case 'text':
                  input.type = 'text';
                  input.placeholder = setting.placeholder ?? '';
                  input.value = String(value ?? '');
                  label.append(setting.label, input);
                  break;
          }
          el.appendChild(label);
      }
      return {
          el,
          read: () => {
              const out = {};
              for (const setting of settings) {
                  const control = controls.get(setting.key);
                  if (!control)
                      continue;
                  if (setting.kind === 'boolean')
                      out[setting.key] = control.checked;
                  else if (setting.kind === 'select')
                      out[setting.key] = control.value || String(values[setting.key] ?? '');
                  else if (setting.kind === 'number') {
                      const n = Number.parseInt(control.value, 10);
                      const clamped = Number.isNaN(n) ? Number(values[setting.key]) : n;
                      out[setting.key] = Math.max(setting.min ?? -Infinity, Math.min(setting.max ?? Infinity, clamped));
                  }
                  else
                      out[setting.key] = control.value.trim();
              }
              return out;
          },
      };
  }
  /** Register a userscript-manager menu entry, where the manager supports it. */
  function menuCommand(label, fn) {
      if (typeof GM_registerMenuCommand === 'function')
          GM_registerMenuCommand(label, fn);
  }

  const FASTPASS_TEXT = 'Sign in with Okta FastPass';
  const INTERVAL_MS = 500;
  // --- Username config (persisted, editable from the Tampermonkey menu) ---
  let username = GM_getValue('oktaUsername', '');
  function openSettings() {
      const settings = settingsEditor([{ key: 'username', kind: 'text', label: 'Username', placeholder: 'you@teamclara.com' }], { username });
      openPanel({
          id: 'okta-autofill-cfg',
          title: 'Okta autofill',
          hint: 'Filled into the identifier field, then Next is clicked for you.',
          build: (body) => body.appendChild(settings.el),
          footer: [
              { label: 'Cancel', onClick: (panel) => panel.close() },
              {
                  label: 'Save',
                  primary: true,
                  onClick: (panel) => {
                      username = settings.read().username ?? '';
                      GM_setValue('oktaUsername', username);
                      panel.close();
                      toast({
                          text: username ? `Okta username set to ${username}` : 'Okta username cleared',
                          duration: 4000,
                      });
                  },
              },
          ],
      });
  }
  menuCommand('Set Okta username…', openSettings);
  // Ask once if we've never been configured.
  if (!username)
      openSettings();
  let identifierDone = false;
  // Set a value the Okta/React widget will actually register.
  function setValue(el, value) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
      if (setter)
          setter.call(el, value);
      else
          el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // Stage 1 — identifier page: fill username, tick "Keep me signed in", click Next.
  function tryIdentifier() {
      if (identifierDone || !username)
          return;
      const field = document.querySelector('input[name="identifier"]');
      const next = document.querySelector('.o-form-button-bar input[type="submit"]');
      if (!field || !next)
          return;
      if (field.value !== username)
          setValue(field, username);
      const remember = document.querySelector('input[name="rememberMe"]');
      if (remember && !remember.checked)
          remember.click();
      if (field.value === username) {
          identifierDone = true;
          next.click();
      }
  }
  // Stage 2 — app page: click the FastPass link.
  function tryFastPass() {
      const a = document.querySelector('.okta-verify-container a');
      if (a && (a.textContent || '').trim() === FASTPASS_TEXT) {
          console.log('✅ Clicking FastPass link');
          a.click();
          return true;
      }
      return false;
  }
  const interval = setInterval(() => {
      tryIdentifier();
      if (tryFastPass())
          clearInterval(interval);
  }, INTERVAL_MS);

})();
