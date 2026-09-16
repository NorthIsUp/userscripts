import { RELEASES_MATCH } from './repo.mjs';

/**
 * A Chrome-style `@match` pattern as a RegExp over a URL without its fragment.
 * `*` scheme is http or https, a `*.host` prefix is the host or any subdomain,
 * a bare `*` host is any host, and `*` in the path is any run of characters.
 */
export function matchToRegExp(pattern) {
  const parts = /^(\*|https?|file|ftp):\/\/([^/]*)(\/.*)$/.exec(pattern);
  if (!parts) throw new Error(`unsupported @match pattern: ${pattern}`);
  const [, scheme, host, path] = parts;
  // `*` is deliberately left alone: it is the wildcard, expanded below.
  const esc = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const schemeRe = scheme === '*' ? 'https?' : esc(scheme);
  const hostRe =
    host === '*'
      ? '[^/]+'
      : host.startsWith('*.')
        ? `(?:[^/]+\\.)?${esc(host.slice(2))}`
        : esc(host);
  const pathRe = esc(path).replace(/\*/g, '.*');
  return new RegExp(`^${schemeRe}://${hostRe}${pathRe}$`);
}

/** Does any of the script's own @match patterns cover `url`? */
export function ownMatchCovers(def, url) {
  return def.match.some((m) => matchToRegExp(m).test(url));
}

const BEACON_PAGE = RELEASES_MATCH.replace(/\*$/, '');

/**
 * Code that runs first in every bundle, inside the IIFE. On this repo's
 * releases page it leaves a <meta name="userscript-beacon"> tag saying which
 * script this is and what version, so the release-install script can read
 * what is actually running instead of remembering what it once installed.
 * Then it returns out of the IIFE unless the script's own @match covers the
 * page — the beacon @match must not make a script run where it never did.
 *
 * @param {{ file: string, name: string, namespace: string, version: string, match: string[] }} def
 */
export function beaconIntro(def) {
  const beacon = { name: def.name, namespace: def.namespace, version: def.version };
  const own = def.match.map((m) => matchToRegExp(m).source);
  const page = matchToRegExp(RELEASES_MATCH).source;
  return [
    '// Installed-script beacon (build/beacon.mjs): announce this script on',
    `// ${BEACON_PAGE}, then stop unless our own @match covers the page.`,
    '{',
    `  const here = location.href.split('#')[0];`,
    `  if (new RegExp(${JSON.stringify(page)}).test(here)) {`,
    `    const beacon = ${JSON.stringify(beacon)};`,
    `    const tag = document.createElement('meta');`,
    `    tag.name = 'userscript-beacon';`,
    `    Object.assign(tag.dataset, beacon);`,
    `    const mount = () => (document.head || document.documentElement).appendChild(tag);`,
    `    if (document.head || document.documentElement) mount();`,
    `    else document.addEventListener('DOMContentLoaded', mount, { once: true });`,
    '  }',
    `  if (!${JSON.stringify(own)}.some((re) => new RegExp(re).test(here))) return;`,
    '}',
    '',
  ].join('\n');
}
