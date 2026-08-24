// One row per userscript — the single source of truth for every header.
// Shared values (namespace, author, update/download URLs) are filled in by
// header.mjs, so a row only carries what actually differs between scripts.

export const repo = 'NorthIsUp/userscripts';
export const branch = 'main';

/**
 * @typedef {object} ScriptDef
 * @property {string} file     output basename, without ".user.js"
 * @property {string} name     @name
 * @property {string} version  @version
 * @property {string} description
 * @property {string[]} match
 * @property {string} runAt    @run-at
 * @property {string[]} [grant]      defaults to ["none"]
 * @property {keyof import("./icons.mjs").icons} [icon]
 * @property {string|null} [namespace]  defaults to https://github.com/; null omits it
 * @property {string} [author]
 * @property {string[]} [require]
 * @property {boolean} [noframes]
 */

/** @type {ScriptDef[]} */
export const scripts = [
  {
    file: 'github-pr-submit-review',
    name: 'Code Helpers: GitHub PR — Submit Review Button',
    version: '4.6.1',
    description:
      "Review actions next to Code on the PR page — approve, approve/reject/comment with a note, close — all driving GitHub's own review dialog.",
    match: ['https://github.com/*/*/pull/*'],
    runAt: 'document-end',
    icon: 'github',
  },
  {
    file: 'github-open-in-graphite',
    name: 'Code Helpers: GitHub PR — Open in Graphite',
    version: '1.8.1',
    description:
      'Adds an "Open in Graphite" icon link next to the copy-branch button in the PR header.',
    match: ['https://github.com/*/*/pull/*'],
    runAt: 'document-end',
    icon: 'github',
  },
  {
    file: 'graphite-open-in-github',
    name: 'Code Helpers: Graphite — Open in GitHub',
    version: '1.0.0',
    description: 'Adds an "Open in GitHub" button to the current PR row in Graphite\'s stack view.',
    match: ['https://app.graphite.com/*'],
    runAt: 'document-end',
    icon: 'graphite',
  },
  {
    file: 'github-tokens-link',
    name: 'Code Helpers: GitHub — Quick API Tokens Link',
    version: '1.4.0',
    description:
      'Adds a "Tokens" link directly under "Settings" in the GitHub user menu, using the code octicon to match the Developer settings sidebar entry.',
    match: ['https://github.com/*'],
    runAt: 'document-idle',
    icon: 'github',
    author: 'NorthIsUp',
  },
  {
    file: 'github-mention-bots',
    name: 'Code Helpers — GitHub @-mention Bots',
    version: '3.1.0',
    description:
      'Adds configurable "bots" to the @-mention autocomplete on GitHub, with a config panel + storage.',
    match: ['https://github.com/*'],
    runAt: 'document-idle',
    icon: 'github',
    namespace: 'https://askclara.com/userscripts',
    author: 'NorthIsUp',
    grant: ['GM_getValue', 'GM_setValue', 'GM_registerMenuCommand'],
  },
  {
    file: 'deny-geolocation',
    name: 'Deny Geolocation',
    version: '0.2.0',
    description: 'Sites asking for location get an instant PERMISSION_DENIED, no prompt.',
    match: ['*://*/*'],
    runAt: 'document-start',
    icon: 'geo',
    namespace: null,
    require: ['https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.js'],
    grant: ['GM_registerMenuCommand', 'GM_getValue', 'GM_setValue'],
  },
  {
    file: 'okta-autofill-fastpass',
    name: 'Okta autofill + FastPass — teamclara',
    version: '2.1',
    description:
      'Fills username + "Keep me signed in" + Next, then clicks FastPass when it appears',
    match: ['https://teamclara.okta.com/*', 'https://*.okta.com/*'],
    runAt: 'document-idle',
    icon: 'okta',
    namespace: 'http://tampermonkey.net/',
    grant: ['GM_getValue', 'GM_setValue', 'GM_registerMenuCommand'],
    noframes: true,
  },
  {
    file: 'haproxy-stats-emojis',
    name: 'HAProxy Stats: Section Header Emojis',
    version: '1.0',
    description: 'Add 🟢/🔴 to HAProxy proxy headers based on server row health in that section',
    match: ['http://haproxy.tailf01e20.ts.net:8404/*'],
    runAt: 'document-idle',
    namespace: 'https://maxcare.ai/',
  },
];
