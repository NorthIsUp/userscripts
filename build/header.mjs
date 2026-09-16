import { beaconIntro, ownMatchCovers } from './beacon.mjs';
import { atSize, icons } from './icons.mjs';
import { RELEASES_MATCH, repo } from './repo.mjs';

const PAD = 13;

function line(key, value) {
  return `// @${key.padEnd(PAD)}${value}`;
}

/** @param {{ file: string } & import("../src/lib/meta").ScriptMeta} def */
export function namespaceOf(def) {
  // @namespace + @name is a userscript manager's identity for a script, so
  // every script gets its own — a shared namespace lets look-alike names
  // (open-in-graphite vs open-in-github) match each other on install.
  return def.namespace === null ? '' : (def.namespace ?? `https://github.com/${repo}/${def.file}`);
}

/**
 * The code every bundle starts with: the installed-script beacon, which knows
 * this script's identity from the same fields the header is rendered from.
 * @param {{ file: string } & import("../src/lib/meta").ScriptMeta} def
 */
export function buildIntro(def) {
  return beaconIntro({ ...def, namespace: namespaceOf(def) });
}

/** @param {{ file: string } & import("../src/lib/meta").ScriptMeta} def */
export function buildHeader(def) {
  // The `dist` branch CI force-pushes on every build, not the release asset.
  // Both always hold the newest build, but raw serves text/plain inline where a
  // release asset is served as an attachment — and a download is not something
  // a userscript manager can offer to install.
  const url = `https://raw.githubusercontent.com/${repo}/dist/${def.file}.user.js`;
  const icon = def.icon ? icons[def.icon] : null;
  // Only worth a second directive when the artwork actually rescales.
  const icon64 = icon && atSize(icon, 64) !== icon ? atSize(icon, 64) : null;
  const rows = [
    line('name', def.name),
    ...(def.namespace === null ? [] : [line('namespace', namespaceOf(def))]),
    line('version', def.version),
    line('description', def.description),
    ...(def.author ? [line('author', def.author)] : []),
    ...(icon ? [line('icon', icon)] : []),
    ...(icon64 ? [line('icon64', icon64)] : []),
    ...def.match.map((m) => line('match', m)),
    // The beacon page (see beacon.mjs): where the release-install script asks
    // every script here to say whether it is installed. Only added where the
    // script's own matches don't reach it.
    ...(ownMatchCovers(def, RELEASES_MATCH.replace(/\*$/, ''))
      ? []
      : [line('match', RELEASES_MATCH)]),
    ...(def.require ?? []).map((r) => line('require', r)),
    line('run-at', def.runAt),
    ...(def.grant ?? ['none']).map((g) => line('grant', g)),
    ...(def.connect ?? []).map((c) => line('connect', c)),
    ...(def.noframes ? [line('noframes', '').trimEnd()] : []),
    line('updateURL', url),
    line('downloadURL', url),
  ];
  return ['// ==UserScript==', ...rows, '// ==/UserScript==', ''].join('\n');
}
