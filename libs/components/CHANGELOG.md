## 0.2.0 (2026-09-25)

### Features

- ⚠️ **badge:** the tone is the library's four, and the absence is the neutral ([#13](https://github.com/pacit/components/pull/13), [#9](https://github.com/pacit/components/issues/9))
- **button:** a tone is a colour the button wears, and every wearing is measured ([#9](https://github.com/pacit/components/pull/9))
- **api:** what can stop being public does, and everything public says what it is ([352aee2](https://github.com/pacit/components/commit/352aee2))
- **api:** the public methods say since when too ([5ffc3ff](https://github.com/pacit/components/commit/5ffc3ff))
- **api:** every public API says since when, and the release names what was next ([ba39abc](https://github.com/pacit/components/commit/ba39abc))

### Fixes

- **release:** the rehearsal's gate says the undated `next` as a warning, and the release as a refusal ([dcf6960](https://github.com/pacit/components/commit/dcf6960))
- **mutation:** the spec the run never selects, and the sentences that explained it wrongly ([#15](https://github.com/pacit/components/pull/15), [#14](https://github.com/pacit/components/issues/14))
- **mutation:** the four equivalent-mutant excuses follow their lines ([4ce1789](https://github.com/pacit/components/commit/4ce1789))
- **release:** the release commit carries the manifest and the stamp ([e649f1f](https://github.com/pacit/components/commit/e649f1f))

### Refactoring

- **select:** the filter predicates leave the types file, and a types file holds types alone ([#22](https://github.com/pacit/components/pull/22))
- **schematics:** the migration calls Angular's parser instead of imitating it ([#15](https://github.com/pacit/components/issues/15), [#110](https://github.com/pacit/components/issues/110))

### ⚠️ Breaking Changes

- **badge:** the tone is the library's four, and the absence is the neutral ([#13](https://github.com/pacit/components/pull/13), [#9](https://github.com/pacit/components/issues/9))
  `PctBadgeTone` is gone and `tone` takes `PctTone | null`,
  default `null`. `tone="neutral"` no longer compiles — a badge with no tone takes
  no `tone` at all — and an untoned badge no longer carries `data-pct-tone` at all,
  where it used to say `neutral`. A stylesheet or a test keyed on
  `[data-pct-tone='neutral']` stops matching: the library's own unit suite had two
  such assertions and this commit rewrites them, and the `ng update` migration
  removes the attribute from templates — but neither can see a consumer's
  selectors, which is why this stands in the footer.
  Not one pixel moves. The old sheet had no `[data-pct-tone='neutral']` rule, so
  that attribute carried no paint and the base tokens on `:host` were the neutral
  all along.
  `PctBadgeTone` named the skin's missing ramps as its condition for growing (0053).
  The ramps landed with the button's tone axis (0082), so the list is spent rather
  than widened: two vocabularies for one idea is the state 0076 exists to end, and
  deleting the union is the honest version of that news — every consumer who wrote
  the type down sees it at compile time instead of learning later that their
  `'neutral'` quietly means something else.
  `neutral` is refused as a member and granted as an absence. A union member
  meaning "none of the above" makes every consumer write it.
  Two things chosen rather than fallen into:
  - **`import type`.** `PctTone` comes in type-only, so the build erases it and
    `./badge` still reaches for no other entrypoint — the internal-deps column of
    `size.snapshot.md` stays `-`. The row moves on its own bytes, 1706 to 2229,
    which is the three extra tone rules in the stylesheet.
  - **The tone rules assign tokens and paint nothing.** Each one sets
    `--pct-badge-bg`/`-fg`/`-border` and declares no `color` and no `border-color`,
    so they never enter the cascade for the two properties the forced-colours block
    paints. That is why one `:host` rule inside the media block is enough here,
    where the button had to repeat all four of its selectors (lesson-70): the
    button's faces paint those properties directly, at a specificity that wins.

## 0.1.0 (2026-09-17)

The first public release of `@pacit/components`: **34 components** for Angular,
standalone and zoneless, on signal forms, rendering on the server, themed through design
tokens — where every promise is held by a gate that runs on every commit.

- 93 features and 24 fixes since the first commit, 12 of them breaking on the way to this shape
- 30 gates, each with a negative control that proves it can fail — the registry of promise → gate → control is [the trust page](https://components.pacit.pl/trust/)
- every component with its live demos, API, parts, tokens and keyboard map: [https://components.pacit.pl/components/](https://components.pacit.pl/components/)
- install: `npm install @pacit/components`, then `ng add @pacit/components` — [get started](https://components.pacit.pl/start/)
