# userscripts

Personal userscripts, written in TypeScript and built into standalone
`*.user.js` files, published to a `dist` branch and attached to every release.

## Install

Each link is a permanent URL that always holds the newest build, and is what the
scripts' own `@updateURL` points at — install once, and your userscript manager
pulls future versions on its own (whenever `@version` rises).

They point at the `dist` branch through `raw.githubusercontent.com`, not at the
release assets, for one reason: raw serves `text/plain` inline, while a release
asset comes back as `Content-Disposition: attachment`. A browser saves an
attachment rather than rendering it, so the manager never sees a page to offer
an install on — clicking a release asset just downloads a file. The releases
still carry every build; they're for archaeology, not for installing.

| Script | What it does |
|--------|--------------|
| [github-releases-install](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-releases-install.user.js) | Install buttons on a repo's releases page, plus "install all missing" |
| [github-pr-list-accepted](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-pr-list-accepted.user.js) | Green-tints and collapses accepted PRs on a repo's PR list |
| [github-pr-submit-review](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-pr-submit-review.user.js) | Review action icons on the GitHub PR page — approve, approve/reject/comment, close |
| [github-mention-bots](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-mention-bots.user.js) | Configurable bots in GitHub's @-mention autocomplete |
| [github-tokens-link](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-tokens-link.user.js) | "Tokens" link under Settings in the GitHub user menu |
| [github-open-in-graphite](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-open-in-graphite.user.js) | "Open in Graphite" icon on GitHub PR headers |
| [graphite-open-in-github](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/graphite-open-in-github.user.js) | "Open in GitHub" button on Graphite PR rows |
| [deny-geolocation](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/deny-geolocation.user.js) | Auto-deny geolocation prompts, per-site allowlist |
| [okta-autofill-fastpass](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/okta-autofill-fastpass.user.js) | Autofill Okta username + click FastPass |
| [haproxy-stats-emojis](https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/haproxy-stats-emojis.user.js) | 🟢/🔴 health emojis on HAProxy stats section headers |

## Layout

```
src/scripts/<name>.ts   one file per userscript — code AND its header metadata
src/lib/ui.ts           toasts + settings panels shared by every script
src/lib/                other shared helpers (dom, github, meta type, GM globals)
build/icons.mjs         icon data URIs, one entry per brand
build/header.mjs        renders the ==UserScript== block
build/meta.mjs          reads each script's `meta` export at build time
rollup.config.mjs       one bundle per script → dist/
```

Nothing built is committed to `main`; `dist/` is gitignored, and CI publishes
the bundles to the orphan `dist` branch and to each release.

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
URL under the repo, and `@updateURL`/`@downloadURL` pointing at its build on the
`dist` branch. The namespace is per-script on purpose — a userscript manager identifies
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
npm test         # node --test (jsdom-backed UI tests)
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

## UI

Anything a script shows the user goes through `src/lib/ui.ts`, so notifications
and settings look and behave the same everywhere:

- `toast({ text, actions, tone })` — corner notification with optional buttons
- `openPanel({ id, title, hint, build, footer })` — modal settings panel
- `settingsEditor(specs, values)` — labelled controls that read back as an object
- `rowsEditor({ columns, items })` — editable list of same-shaped records
- `menuCommand(label, fn)` — userscript-manager menu entry, where supported

Both render inside a shadow root with `all: initial` and a single set of color
tokens that follow the page's light/dark scheme — pages we inject into (GitHub
especially) have CSS aggressive enough to wreck anything less isolated.

## Styling GitHub's PR list

`github-pr-list-accepted` deliberately does as little as possible in JS: it
works out which PRs are accepted (GitHub's search, not the row markup — see the
script's header comment) and puts `data-accepted-pr="approved" | "mine"` on the
row, plus `data-accepted-pr-display` on `<html>`. Everything visible is one
stylesheet the script injects, so its rules can be replaced from a userstyle the
same way row tints by author are:

```css
.js-issue-row:has(a[title*="created by dependabot"]) { background-color: rgba(140, 149, 159, 0.12); }
[data-accepted-pr="mine"] { background-color: rgba(46, 160, 67, 0.18); }
```


## Releases

Every push to `main` runs `.github/workflows/ci.yaml`: typecheck, build, then
force-push the ten bundles to the orphan `dist` branch and publish a release
tagged `v<run number>` with the same files attached. The `raw.…/dist/<script>.user.js`
URLs above always hold that newest build, so update checks never need a version
or a tag in the path.
