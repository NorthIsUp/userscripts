// ==UserScript==
// @name         Code Helpers: GitHub — Quick API Tokens Link
// @namespace    https://github.com/
// @version      1.4.0
// @description  Adds a "Tokens" link directly under "Settings" in the GitHub user menu, using the code octicon to match the Developer settings sidebar entry.
// @author       NorthIsUp
// @match        https://github.com/*
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-tokens-link.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-tokens-link.user.js
// ==/UserScript==

(function () {
  'use strict';

  const TOKENS_URL = '/settings/tokens';
  const ITEM_MARKER = 'data-tokens-link-item';

  // Primer Octicons "code-16" — same icon GitHub uses for
  // "Developer settings" in the settings sidebar.
  const ICON_PATH =
    'm11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z';

  /**
   * Build the Tokens <li> by cloning the Settings <li>. This way we
   * inherit whatever class names, data attributes, and structure GitHub
   * is currently using (older ActionListItem or newer prc-ActionList-*).
   */
  function buildTokensItem(settingsLi) {
    const li = settingsLi.cloneNode(true);

    // Strip IDs so we don't create duplicates and so aria-labelledby
    // refs don't collide with the original.
    li.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    li.removeAttribute('id');

    // Also strip aria-labelledby since the referenced label id is gone.
    li.querySelectorAll('[aria-labelledby]').forEach((el) => el.removeAttribute('aria-labelledby'));

    li.setAttribute(ITEM_MARKER, 'true');

    const link = li.querySelector('a');
    if (!link) return null;
    link.setAttribute('href', TOKENS_URL);
    // Make sure it actually navigates (no Turbo frame trapping it
    // inside a settings frame that may not be present).
    link.removeAttribute('data-turbo-frame');

    // Replace the visible label. The label element varies by markup
    // version; find the deepest text-bearing span without an SVG.
    const label = findLabelElement(link);
    if (label) label.textContent = 'Tokens';

    // Swap the icon: same <svg> wrapper (so we keep currentColor,
    // sizing, vertical alignment), just change the variant class
    // and replace the inner path.
    const svg = li.querySelector('svg.octicon') || li.querySelector('svg');
    if (svg) {
      // Drop any existing octicon-* variant class.
      [...svg.classList].forEach((c) => {
        if (c.startsWith('octicon-') && c !== 'octicon') {
          svg.classList.remove(c);
        }
      });
      svg.classList.add('octicon', 'octicon-code');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.innerHTML = `<path d="${ICON_PATH}"></path>`;
    }

    return li;
  }

  function findLabelElement(linkEl) {
    // Prefer explicit label classes used by the two markup variants.
    const explicit =
      linkEl.querySelector('.ActionListItem-label') ||
      linkEl.querySelector('.prc-ActionList-ItemLabel-81ohH') ||
      linkEl.querySelector('[data-component="ActionList.Item.Label"]');
    if (explicit) return explicit;

    // Fallback: any span with text and no SVG.
    const spans = linkEl.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent.trim().length > 0 && !span.querySelector('svg')) {
        return span;
      }
    }
    return null;
  }

  /**
   * If the menu has a Settings link and we haven't added Tokens yet,
   * insert it as the next sibling.
   */
  function decorateMenu(menu) {
    if (!menu) return;

    const settingsLink = menu.querySelector('a[href="/settings/profile"]');
    if (!settingsLink) return;

    const settingsLi = settingsLink.closest('li');
    if (!settingsLi || !settingsLi.parentElement) return;

    // Already added in this menu instance?
    if (settingsLi.parentElement.querySelector(`li[${ITEM_MARKER}]`)) {
      return;
    }

    const tokensLi = buildTokensItem(settingsLi);
    if (!tokensLi) return;

    settingsLi.parentElement.insertBefore(tokensLi, settingsLi.nextSibling);
  }

  /**
   * Look for any user-menu-shaped container in `root` and decorate it.
   * The menu is rendered lazily, often replaced wholesale, so we run
   * this on every relevant DOM mutation.
   */
  function scan(root) {
    // Collect candidate menu containers.
    const candidates = new Set();

    const selector = 'anchored-position, action-menu, [role="menu"], details-menu, ul';

    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(selector).forEach((el) => candidates.add(el));

    if (root && root.matches && root.matches(selector)) {
      candidates.add(root);
    }

    candidates.forEach((el) => {
      // We need a Settings link to anchor off of. That's also a
      // strong signal this is the user menu and not some other
      // dropdown.
      if (el.querySelector('a[href="/settings/profile"]')) {
        decorateMenu(el);
      }
    });
  }

  scan(document);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        scan(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
