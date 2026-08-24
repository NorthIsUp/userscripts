const TOKENS_URL = '/settings/tokens';
const ITEM_MARKER = 'data-tokens-link-item';

// Primer Octicons "code-16" — same icon GitHub uses for
// "Developer settings" in the settings sidebar.
const ICON_PATH =
  'm11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z';

function findLabelElement(linkEl: HTMLAnchorElement): Element | null {
  // Prefer explicit label classes used by the two markup variants.
  const explicit =
    linkEl.querySelector('.ActionListItem-label') ||
    linkEl.querySelector('.prc-ActionList-ItemLabel-81ohH') ||
    linkEl.querySelector('[data-component="ActionList.Item.Label"]');
  if (explicit) return explicit;

  // Fallback: any span with text and no SVG.
  const spans = linkEl.querySelectorAll('span');
  for (const span of spans) {
    if ((span.textContent || '').trim().length > 0 && !span.querySelector('svg')) {
      return span;
    }
  }
  return null;
}

/**
 * Build the Tokens <li> by cloning the Settings <li>. This way we
 * inherit whatever class names, data attributes, and structure GitHub
 * is currently using (older ActionListItem or newer prc-ActionList-*).
 */
function buildTokensItem(settingsLi: HTMLLIElement): HTMLLIElement | null {
  const li = settingsLi.cloneNode(true) as HTMLLIElement;

  // Strip IDs so we don't create duplicates and so aria-labelledby
  // refs don't collide with the original.
  for (const el of li.querySelectorAll('[id]')) el.removeAttribute('id');
  li.removeAttribute('id');

  // Also strip aria-labelledby since the referenced label id is gone.
  for (const el of li.querySelectorAll('[aria-labelledby]')) el.removeAttribute('aria-labelledby');

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
    for (const c of [...svg.classList]) {
      if (c.startsWith('octicon-') && c !== 'octicon') svg.classList.remove(c);
    }
    svg.classList.add('octicon', 'octicon-code');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.innerHTML = `<path d="${ICON_PATH}"></path>`;
  }

  return li;
}

/**
 * If the menu has a Settings link and we haven't added Tokens yet,
 * insert it as the next sibling.
 */
function decorateMenu(menu: Element) {
  const settingsLink = menu.querySelector('a[href="/settings/profile"]');
  if (!settingsLink) return;

  const settingsLi = settingsLink.closest('li');
  if (!settingsLi?.parentElement) return;

  // Already added in this menu instance?
  if (settingsLi.parentElement.querySelector(`li[${ITEM_MARKER}]`)) return;

  const tokensLi = buildTokensItem(settingsLi);
  if (!tokensLi) return;

  settingsLi.parentElement.insertBefore(tokensLi, settingsLi.nextSibling);
}

const MENU_SELECTOR = 'anchored-position, action-menu, [role="menu"], details-menu, ul';

/**
 * Look for any user-menu-shaped container in `root` and decorate it.
 * The menu is rendered lazily, often replaced wholesale, so we run
 * this on every relevant DOM mutation.
 */
function scan(root: Element | Document) {
  const candidates = new Set<Element>(root.querySelectorAll(MENU_SELECTOR));
  if (root instanceof Element && root.matches(MENU_SELECTOR)) candidates.add(root);

  for (const el of candidates) {
    // We need a Settings link to anchor off of. That's also a
    // strong signal this is the user menu and not some other dropdown.
    if (el.querySelector('a[href="/settings/profile"]')) decorateMenu(el);
  }
}

scan(document);

new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      scan(node as Element);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
