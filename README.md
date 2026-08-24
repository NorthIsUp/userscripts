# userscripts

Personal userscripts, written in TypeScript under `ts/` and built to the
`*.user.js` files at the repo root. Each is self-updating via
`@updateURL`/`@downloadURL` pointing at the latest GitHub release asset —
install once from the link below and Tampermonkey pulls future changes
automatically (on a `@version` bump).

## Install

| Script | What it does |
|--------|--------------|
| [github-mention-bots](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-mention-bots.user.js) | Configurable bots in GitHub's @-mention autocomplete |
| [github-tokens-link](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-tokens-link.user.js) | "Tokens" link under Settings in the GitHub user menu |
| [github-open-in-graphite](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-open-in-graphite.user.js) | "Open in Graphite" icon on GitHub PR headers |
| [github-pr-submit-review](https://github.com/NorthIsUp/userscripts/releases/latest/download/github-pr-submit-review.user.js) | Review actions (approve / comment / request changes / close) on the PR header |
| [graphite-open-in-github](https://github.com/NorthIsUp/userscripts/releases/latest/download/graphite-open-in-github.user.js) | "Open in GitHub" button on Graphite PR rows |
| [deny-geolocation](https://github.com/NorthIsUp/userscripts/releases/latest/download/deny-geolocation.user.js) | Auto-deny geolocation prompts, per-site allowlist |
| [okta-autofill-fastpass](https://github.com/NorthIsUp/userscripts/releases/latest/download/okta-autofill-fastpass.user.js) | Autofill Okta username + click FastPass |
| [haproxy-stats-emojis](https://github.com/NorthIsUp/userscripts/releases/latest/download/haproxy-stats-emojis.user.js) | 🟢/🔴 health emojis on HAProxy stats section headers |

## Dev

Sources live in `ts/src/scripts/<name>.ts`, shared helpers in `ts/src/lib/`.
Rollup bundles each entry to a self-contained IIFE at the repo root, prepending
a header generated from one table — `ts/scripts.mjs` — so no metadata block is
ever hand-written or duplicated (icons live once in `ts/icons.mjs`; `@icon64` is
derived by rescaling).

```sh
cd ts
npm install
npm run build    # → ../*.user.js
npm run watch    # rebuild on change
npm run lint     # tsc --noEmit
```

**The root `*.user.js` files are build output — edit the TypeScript, not them.**
CI rebuilds and fails if they drift.

Adding a script: drop `ts/src/scripts/<name>.ts`, add a row to `ts/scripts.mjs`,
build.

Formatting/linting is [biome](https://biomejs.dev) over `ts/`, run by an
[hk](https://hk.jdx.dev) pre-commit hook installed via [mise](https://mise.jdx.dev):

```sh
mise install     # hk, pkl, biome
hk install       # git pre-commit hook
hk check         # lint + format check
hk fix           # apply fixes
```

## Releases

Every push to `main` builds and publishes a release with all eight scripts
attached, so each one has a URL that never changes:

```
https://github.com/NorthIsUp/userscripts/releases/latest/download/<script>.user.js
```

That is what the scripts' own `@updateURL` points at.
