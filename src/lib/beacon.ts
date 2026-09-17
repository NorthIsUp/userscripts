/**
 * The installed-script beacon: how a script tells a page it is running here.
 *
 * No userscript manager will tell a page what is installed — Tampermonkey and
 * Violentmonkey expose `external.<Manager>.isInstalled` only on the hosting
 * sites they allow-list, and one script's storage is invisible to another — so
 * each script answers for itself. Every bundle calls `announce()` before
 * anything else, and `github-releases-install` reads the tags it leaves.
 *
 * The build supplies the arguments (see build/beacon.mjs) and drops the call at
 * the top of the bundle, because the answer decides whether the rest of the
 * bundle runs at all: the beacon needs an extra `@match` for the page it
 * reports on, and that must not make a script run anywhere it didn't before.
 */

/** What a script says about itself: a manager's identity for it, and which
 *  build it is. @namespace + @name is how a manager tells scripts apart. */
export type Beacon = {
  name: string;
  namespace: string;
  version: string;
};

/** The attribute the tags carry, and what a reader queries for. */
export const BEACON_TAG = 'userscript-beacon';

/**
 * On the beacon page, leave a `<meta name="userscript-beacon">` carrying this
 * script's identity. Returns whether the script should go on running here —
 * false on the beacon page when the script's own `@match` doesn't cover it.
 *
 * @param script    who this is: the header's name, namespace and version.
 * @param pageRe    source of a RegExp matching the page to announce on.
 * @param ownRes    sources of RegExps for the script's own `@match` patterns.
 */
export function announce(script: Beacon, pageRe: string, ownRes: string[]): boolean {
  // A fragment is never part of a @match, and never changes which page this is.
  const here = location.href.split('#')[0];

  if (new RegExp(pageRe).test(here)) {
    const tag = document.createElement('meta');
    tag.name = BEACON_TAG;
    Object.assign(tag.dataset, script);
    // document-start runs before <head> exists, so mount whenever it does.
    const mount = () => (document.head || document.documentElement).appendChild(tag);
    if (document.head || document.documentElement) mount();
    else document.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  return ownRes.some((re) => new RegExp(re).test(here));
}
