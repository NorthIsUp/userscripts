import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { RELEASES_MATCH } from './repo.mjs';

const BEACON_SRC = join(dirname(fileURLToPath(import.meta.url)), '../src/lib/beacon.ts');

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
 * src/lib/beacon.ts as plain JS, ready to paste into a bundle: the `export`
 * keywords go (a bundle has no exports) and the types go with transpiling.
 * Read once per build, and never imported — the module is inlined rather than
 * bundled because the call has to run before any of the bundle's own code.
 */
let beaconJs;
function beaconSource() {
  if (beaconJs) return beaconJs;
  const { outputText } = ts.transpileModule(readFileSync(BEACON_SRC, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  // Drop the file's own doc comment: the intro writes its own.
  beaconJs = outputText
    .replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')
    .replace(/^export /gm, '')
    .trim();
  return beaconJs;
}

/**
 * What every bundle starts with, inside the IIFE: src/lib/beacon.ts inlined,
 * then the one call to it. The call's answer decides whether the rest of the
 * bundle runs — the beacon needs an extra @match for the page it reports on,
 * and that must not make a script run anywhere it didn't before, so a script
 * whose own @match misses this page returns here and does nothing else.
 *
 * @param {{ file: string, name: string, namespace: string, version: string, match: string[] }} def
 */
export function beaconIntro(def) {
  const script = { name: def.name, namespace: def.namespace, version: def.version };
  const own = def.match.map((m) => matchToRegExp(m).source);
  const page = matchToRegExp(RELEASES_MATCH).source;
  return [
    '// Installed-script beacon — src/lib/beacon.ts, inlined here so it runs',
    `// before anything else: announce this script on ${BEACON_PAGE},`,
    "// then stop unless this script's own @match covers the page.",
    '{',
    beaconSource()
      .split('\n')
      .map((l) => (l ? `  ${l}` : l))
      .join('\n'),
    '',
    `  if (!announce(${JSON.stringify(script)}, ${JSON.stringify(page)}, ${JSON.stringify(own)})) return;`,
    '}',
    '',
  ].join('\n');
}
