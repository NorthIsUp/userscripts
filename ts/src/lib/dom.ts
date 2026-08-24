/** Run `fn` now and after any DOM change, coalesced to one call per frame. */
export function observeDom(fn: () => void, root: Node = document.documentElement): void {
  let queued = false;
  const tick = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  };
  fn();
  new MutationObserver(tick).observe(root, { childList: true, subtree: true });
}

/** Poll `get` until it returns something truthy, then hand it to `fn`. */
export function poll<T>(get: () => T | null | undefined, fn: (found: T) => void, tries = 40): void {
  let n = 0;
  const next = () => {
    const found = get();
    if (found) return fn(found);
    if (n++ < tries) setTimeout(next, 250);
  };
  next();
}

/** An SVG string sized like GitHub's own octicons. */
export function octicon(path: string, opts: { size?: number; color?: string } = {}): string {
  const size = opts.size ?? 16;
  const style = opts.color
    ? ` style="color:var(--fgColor-${opts.color});vertical-align:text-bottom"`
    : '';
  return (
    `<svg class="octicon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"${style}><path d="${path}"></path></svg>`
  );
}

/** First rendered element matching `selector` whose text passes `test`. */
export function findByText<E extends Element>(
  selector: string,
  test: (text: string) => boolean,
  visibleOnly = true,
): E | null {
  const found = document.querySelectorAll<E>(selector);
  for (const el of found) {
    if (!test((el.textContent || '').trim())) continue;
    if (visibleOnly && el.getClientRects().length === 0) continue;
    return el;
  }
  return null;
}
