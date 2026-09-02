# 0060 — The site is static by construction, and the shell is the library's first page

**Status:** accepted
**Implements:** [`req-project-apps`](../requirements/project.md#req-project-apps),
[`req-project-layout`](../requirements/project.md#req-project-layout),
[`req-project-ssr`](../requirements/project.md#req-project-ssr),
[`req-token-directive`](../requirements/tokens.md#req-token-directive)
**Evidence:** `apps/docs/` and `apps/docs-e2e/`; the prerendered `index.html` in the build
output carrying the whole page before any script runs (read with `grep`, not assumed); the
shell smoke in `apps/docs-e2e/src/shell.spec.ts`, three engines

## The question

Plan 2.1.4: the documentation site needs an application to exist in — the last piece of
[`req-project-apps`](../requirements/project.md#req-project-apps)'s promised workspace.
What shape does it take, and how much of the sandbox's proven scaffold does it inherit
versus deliberately not?

## Static by construction

`outputMode: "static"` with a catch-all `RenderMode.Prerender`: **every route is finished
HTML at build time**, and there is no server to fall back on — a route that cannot
prerender is a build error, which is exactly the loudness a documentation site wants. The
choice buys three things at once: the deploy target stays a free static host decided at
3.1 (site.md's deferral holds), the reader gets content before JavaScript, and the
"performance read before written" bar of 2.1.8 starts from the fastest architecture there
is instead of optimising toward it. The scaffold's first build already proves the
mechanism: the emitted `index.html` carries the headline, the library's elements and the
hero CTA before any script runs.

## What it inherits from the sandbox, and what it refuses

Inherited outright, because the reasons transfer: the zoneless providers, the hydration
client, the typecheck override (the inferred target reads `tsconfig.app.json` only —
lesson-42's second edition), the `tokens` implicit dependency (a build that walks into an
empty `dist` ends in SUCCESS with not one token), and the vendored Inter face with its
licence — the day this app grows baselines and Lighthouse numbers, a metric about
`system-ui` would be a fact about the machine.

Refused, with the reason on record:

- **No `providePctTexts`, no `LOCALE_ID`.** The site is English and the library's
  defaults are English — the docs app is the consumer that proves the _defaults_, where
  the sandbox proves the _overrides_. Two apps, two halves of `req-api-texts`.
- **No drawer yet.** The shell has one destination; a drawer for a nav that does not
  exist would be ceremony. It arrives with the pages (2.1.7) that give it content.
- **No unit-test rig.** The app holds no logic beyond the theme policy, which the e2e
  smoke measures end to end; a vitest setup would be scaffolding for scaffolding. The
  content pipeline (2.1.5) brings the first logic worth a unit and brings the rig with
  it.

## The theme policy lives in the shell, on top of the directive

0059 refused persistence and `matchMedia` in the library; the shell is where that policy
belongs, and the scaffold writes it: a signal cycled system → dark → light, remembered in
`localStorage` (read after first render — the prerendered page ships themeless), spelled
onto the page by `[pctTheme]` on the shell's wrapper, and mirrored by hand onto `<html>` —
0059's recorded root writer, because the `<body>` ground sits outside any template scope.
The e2e smoke measures the whole loop: pin, mirror, computed surface change, release,
and survival across a reload.

## The suite is the sandbox's younger sibling

`apps/docs-e2e` runs the same three engines from day one — the site advertises the
library's standards, so its own pages meet the axe bar from the first commit — but stays
deliberately small: a shell smoke, the theme loop, a clean console, one axe scan. The
sandbox keeps the library's heavy machinery; this suite watches the shop window, and the
visual budgets arrive with the first baseline (2.1.8), not before there is a picture to
hold.

## Costs

- `index.csr.html` ships beside the prerendered pages — the builder's client-side
  fallback for hosts that route unknown paths to it. Harmless weight today; the 404
  story is 2.1.8's.
- The theme toggle is a text button ("Theme: System") rather than an icon — honest at
  scaffold quality, replaced when the site grows its icon language.
- Two `index.html` readings of the same title (the tag and the route title) — Angular's
  title strategy overwrites at bootstrap; recorded so nobody hunts the "duplication".
