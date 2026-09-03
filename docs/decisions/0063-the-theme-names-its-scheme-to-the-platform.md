# 0063 — The theme names its scheme to the platform

**Status:** accepted
**Implements:** [`req-token-skin`](../requirements/tokens.md#req-token-skin) (a theme is a
whole, and the platform's own chrome is part of it)
**Evidence:** `libs/tokens/build.mjs` (the four theme blocks); `apps/sandbox-e2e/src/theme.spec.ts`
› "the theme names its scheme to the platform, at its own scope"; the docs site's dark
baselines in `apps/docs-e2e/src/__screenshots__/`

## The question

The documentation site's first review in the dark theme (2026-09-03): every scrollbar was
white — the rails, the table wrappers, the code blocks, the page itself. The tokens had
repainted every colour the library owns and said nothing to the browser about what they
had done, so the platform kept drawing its own chrome for a light page. The same would
greet every consumer on their first dark screen.

## The decision

Each theme block carries `color-scheme` beside its tokens: `light` on `:root` and
`[data-theme="light"]`, `dark` on `[data-theme="dark"]` and under the system preference.
Everything the platform paints by itself — scrollbars, form-control defaults, the canvas
behind a page — follows the same attribute the tokens follow, **at the same scope**: a
dark island inside a light page gets dark scrollbars, and only there. The declaration is
generated with the blocks, so it cannot drift from them.

## What it costs

- A consumer who had pinned `color-scheme` by hand now has it twice. The theme's copy is
  the one to keep — it is scoped to the attribute the tokens read.
- The test reads the computed `color-scheme`, which is the contract; the scrollbar's pixels
  are the platform's and are not measured.

## Alternatives

A rule in the site's own stylesheet — rejected. The site is a consumer like any other, and
every consumer would rediscover the white scrollbar on their first dark page. The tokens
are where a theme is defined; the theme's word to the platform belongs there.
