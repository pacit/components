# 0059 — A theme is an attribute the skin reads, and the directive only spells it

**Status:** accepted
**Implements:** [`req-token-directive`](../requirements/tokens.md#req-token-directive),
[`req-token-system`](../requirements/tokens.md#req-token-system),
[`req-token-scoped`](../requirements/tokens.md#req-token-scoped)
**Evidence:** `libs/components/theme/src/theme.ts` (the whole runtime is one host
binding), its unit suite beside it, and the side-by-side measurement in
`apps/sandbox-e2e/src/theme.spec.ts` — a hand-written `data-theme` panel and a
`[pctTheme]` panel reading the same computed surface

## The question

`req-token-directive` has waited as a gap "until setting `data-theme` from a template
starts to repeat". It repeats: the sandbox writes the attribute by hand in three places
(the app host, the demo stage, the kitchen-sink's scoped panel), and the documentation
site is about to become the fourth writer. What is the smallest directive that removes the
repetition without becoming a theming system?

## One host binding, and deliberately nothing more

`PctTheme` is `[pctTheme]` with a required input and one binding:
`'[attr.data-theme]': 'pctTheme()'`. Three sentences fall out of that shape, and each is a
refusal recorded on purpose:

- **The mechanism stays the cascade.** The directive writes the same attribute a hand
  types, so scoping, nesting, the transitive closure of component tokens (lesson-17) and
  the light-inside-dark case all keep working for the reason they already worked — the
  build emitted them, not the directive. The control test pins it: a raw panel and a
  directive panel side by side read the same computed `--pct-surface`, **or the sugar has
  become a second mechanism**.
- **`null` removes the attribute**, which hands the subtree back to the system preference
  ([`req-token-system`](../requirements/tokens.md#req-token-system)) — "follow the system"
  is the absence of an opinion, not a third theme name.
- **No persistence, no toggle state, no `matchMedia`.** Which theme to pin and where to
  remember it is application policy; a directive that read `localStorage` would smuggle a
  policy into every consumer. The docs site will write that policy in its own shell, on
  top of this directive, where its users can read it.

The sandbox adopts it where the repetition lived: the demo stage now binds `[pctTheme]`
(every themed card in the e2e suite exercises the directive), while the kitchen-sink's
scoped panel **keeps** its hand-written attribute — no longer a repetition but the other
half of the control, preserved because the comparison is the proof.

## Costs

- A whole entrypoint for one host binding. Accepted over exporting it from `core`: the
  entrypoint is the unit of everything here — the bundle row, the card, the mutation
  scope — and a consumer who never pins a theme ships not a byte of it.
- The app root still writes `data-theme` by hand: a bootstrap component has no template
  around it to bind an input on. Recorded as the one writer the directive cannot replace,
  not as an oversight.
- `pctTheme` is required. A bare `pctTheme` attribute with no value would silently mean
  `null`-ish and read as "themed" to a reviewer; requiring the binding keeps the intent in
  the template.
