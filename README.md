# userscripts

Personal userscripts. Each is self-updating via `@updateURL`/`@downloadURL`
pointing at its raw `main` URL — install once from the link below and
Tampermonkey pulls future changes automatically (on a `@version` bump).

## Install

| Script | What it does |
|--------|--------------|
| [github-mention-bots](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-mention-bots.user.js) | Configurable bots in GitHub's @-mention autocomplete |
| [github-tokens-link](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-tokens-link.user.js) | "Tokens" link under Settings in the GitHub user menu |
| [github-open-in-graphite](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-open-in-graphite.user.js) | "Open in Graphite" icon on GitHub PR headers |
| [graphite-open-in-github](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/graphite-open-in-github.user.js) | "Open in GitHub" button on Graphite PR rows |
| [deny-geolocation](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/deny-geolocation.user.js) | Auto-deny geolocation prompts, per-site allowlist |
| [okta-autofill-fastpass](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/okta-autofill-fastpass.user.js) | Autofill Okta username + click FastPass |
| [haproxy-stats-emojis](https://raw.githubusercontent.com/NorthIsUp/userscripts/main/haproxy-stats-emojis.user.js) | 🟢/🔴 health emojis on HAProxy stats section headers |

## Dev

Tooling via [mise](https://mise.jdx.dev): [hk](https://hk.jdx.dev) pre-commit
hook running [biome](https://biomejs.dev) (format + lint).

```sh
mise install     # hk, pkl, biome
hk install       # git pre-commit hook
hk check         # lint + format check
hk fix           # apply fixes
```
