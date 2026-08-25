# userscripts

Personal userscripts, written in TypeScript and built into standalone
`*.user.js` files that ship as GitHub release assets.

## Install

Each link is a permanent URL that always resolves to the newest release, which
is also what the scripts' own `@updateURL` points at — install once, and your
userscript manager pulls future versions on its own (whenever `@version` rises).

| Script | What it does |
|--------|--------------|
| [github-pr-submit-review](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-pr-submit-review.user.js) | Review action icons on the GitHub PR page — approve, approve/reject/comment, close |
| [github-mention-bots](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-mention-bots.user.js) | Configurable bots in GitHub's @-mention autocomplete |
| [github-tokens-link](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-tokens-link.user.js) | "Tokens" link under Settings in the GitHub user menu |
| [github-open-in-graphite](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-open-in-graphite.user.js) | "Open in Graphite" icon on GitHub PR headers |
| [graphite-open-in-github](https://github.com/NorthIsUp/userscripts/releases/latest/download/graphite-open-in-github.user.js) | "Open in GitHub" button on Graphite PR rows |
| [deny-geolocation](https://github.com/NorthIsUp/userscripts/releases/latest/download/deny-geolocation.user.js) | Auto-deny geolocation prompts, per-site allowlist |
| [okta-autofill-fastpass](https://github.com/NorthIsUp/userscripts/releases/latest/download/okta-autofill-fastpass.user.js) | Autofill Okta username + click FastPass |
| [haproxy-stats-emojis](https://github.com/NorthIsUp/userscripts/releases/latest/download/haproxy-stats-emojis.user.js) | 🟢/🔴 health emojis on HAProxy stats section headers |

## Layout

```
src/scripts/<name>.ts   one file per userscript — code AND its header metadata
src/lib/                shared helpers (dom, github, meta type, GM globals)
build/icons.mjs         icon data URIs, one entry per brand
build/header.mjs        renders the ==UserScript== block
build/meta.mjs          reads each script's `meta` export at build time
rollup.config.mjs       one bundle per script → dist/
```

Nothing built is committed; `dist/` is gitignored and CI publishes it.

## Header metadata

A script owns its own header. Export a `meta` object and the build turns it
into the `==UserScript==` block — the filename becomes the script's filename,
so nothing is repeated:

```ts
import type { ScriptMeta } from '../lib/meta';

export const meta: ScriptMeta = {
  name: 'Code Helpers: GitHub PR — Open in Graphite',
  version: '1.8.2',
  description: 'Adds an "Open in Graphite" icon link…',
  match: ['https://github.com/*/*/pull/*'],
  runAt: 'document-end',
  icon: 'github',
};
```

Defaults fill in the rest: `@grant none`, a `@namespace` of this script's own
URL under the repo, and `@updateURL`/`@downloadURL` pointing at its release
asset. The namespace is per-script on purpose — a userscript manager identifies
a script by `@namespace` + `@name`, so a shared namespace lets look-alike names
match each other and offer to overwrite the wrong script. `@icon64` is derived from `@icon` by rescaling, so
each icon is stored exactly once in `icons.mjs`.

The build never imports a script to read its `meta` — it parses the source with
the TypeScript compiler API and evaluates just that object literal. Keep it a
literal: no variables, no imports, no computed values.

**Bump `version` when you change a script**, otherwise userscript managers see
no update and never fetch the new build.

## Dev

```sh
npm install
npm run build    # → dist/*.user.js
npm run watch    # rebuild on change
npm run lint     # tsc --noEmit
```

Adding a script: create `src/scripts/<name>.ts` with a `meta` export. It is
picked up automatically — there is no list to update.

Point your userscript manager at a local file (Tampermonkey: install from
`file://…/dist/<name>.user.js` with file access enabled) to test a build
before pushing.

Formatting and linting is [biome](https://biomejs.dev) over `src/` and `build/`, run by an
[hk](https://hk.jdx.dev) pre-commit hook installed via [mise](https://mise.jdx.dev):

```sh
mise install     # hk, pkl, biome
hk install       # git pre-commit hook
hk check         # lint + format check
hk fix           # apply fixes
```

## Releases

Every push to `main` runs `.github/workflows/ci.yaml`: typecheck, build, then
publish a release tagged `v<run number>` with all eight scripts attached. The
`releases/latest/download/<script>.user.js` URLs above always point at that
newest release, so update checks never need a version or branch in the path.
