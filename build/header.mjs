import { atSize, icons } from './icons.mjs';

const repo = 'NorthIsUp/userscripts';

const PAD = 13;

function line(key, value) {
  return `// @${key.padEnd(PAD)}${value}`;
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
    // @namespace + @name is a userscript manager's identity for a script, so
    // every script gets its own — a shared namespace lets look-alike names
    // (open-in-graphite vs open-in-github) match each other on install.
    ...(def.namespace === null
      ? []
      : [line('namespace', def.namespace ?? `https://github.com/${repo}/${def.file}`)]),
    line('version', def.version),
    line('description', def.description),
    ...(def.author ? [line('author', def.author)] : []),
    ...(icon ? [line('icon', icon)] : []),
    ...(icon64 ? [line('icon64', icon64)] : []),
    ...def.match.map((m) => line('match', m)),
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
