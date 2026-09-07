# `PctHero` — the brand gradient as equipment

**Summary:** The library's one loud face, on the element that is already there: a rim, a word or a surface.
**Entrypoint:** `@pacit/components/hero`
**Selector:** `[pctHero]` (an attribute component on the consumer's own element — no box is
inserted and no tag is required)
**Status:** released
**Category:** Layout & theming
**ARIA APG pattern:** none — the face is paint
([0065](../decisions/0065-a-treatment-that-paints-is-a-component.md)): it adds no role, no
state and nothing audible, and the element under it keeps whatever it already was. Named in
the class JSDoc.

**A directive could not do this, and that is the whole shape.** A directive carries no
stylesheet; the rules it would add classes for have to exist somewhere, and the only global
artefact this package ships is `themes/pct.css` — variables, not one rule. A hero-shaped
directive would make the package start shipping selectors that can reach a consumer's markup
by accident, which is a property worth more than the convenience.

## Usage

```html
<article pctHero="edge" show="interact">…</article>
<h3 pctHero="text">Tabs</h3>
<div [pctHero]="featured() ? 'fill' : null">…</div>
```

## Contract

|             |                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — a treatment holds no value                                                                                                                                                                                                                                                                                                                                                |
| **Inputs**  | `pctHero` (`'edge' \| 'text' \| 'fill' \| null`, default `null`) — one face per element, so gradient text on a gradient fill is unrepresentable rather than discouraged; `show` (`'always' \| 'interact'`, default `'always'`); `paused` (`boolean`, default `false`) — the page's own stop, which freezes the sweep where it stands and never outranks `prefers-reduced-motion` |
| **Outputs** | none — nothing happens to paint                                                                                                                                                                                                                                                                                                                                                  |
| **Slots**   | the content — the element's own children, projected untouched                                                                                                                                                                                                                                                                                                                    |
| **Parts**   | none — the faces are the host and one pseudo-element of it                                                                                                                                                                                                                                                                                                                       |
| **Harness** | `PctHeroHarness`                                                                                                                                                                                                                                                                                                                                                                 |
| **Tokens**  | the semantic tier outright: `--pct-hero`, `--pct-hero-via`, `--pct-hero-to` with `--pct-on-hero` for the rim and the fill, and the lifted `--pct-hero-text`, `--pct-hero-text-via`, `--pct-hero-text-to` for the word. Six entries in `contrast.policy.json` — three at AA, three at UI                                                                                          |
| **Strings** | **none** — the component draws no text of its own                                                                                                                                                                                                                                                                                                                                |

**Why the word needs its own three stops.** A boundary is non-text and measured at 3:1, and
the brand's stops clear that on both themes (5.17–5.70 light, 3.13–3.45 dark). A word under
24 px is measured at 4.5:1, and those same stops do **not** clear it in the dark — so the
`text` face takes a trio lifted toward white, and only in the dark theme: 7.02, 6.56 and 7.35
against the dark surface. The rim and the fill keep the brand's own blue on both themes,
which is what makes the gradient the same object everywhere it is painted.

**Why `cyan.500` and not `cyan.400`.** The level is a measurement, not a mirror of the
violet's: `cyan.400` reads 9.88:1 on the dark surface against `violet.400`'s 6.56 and
`blue.400`'s 7.02, so the sweep would have one end that shouts. `cyan.500` lands at 7.35 and
the three stand together — the evenness matters as much as the numbers, because a gradient's
weakest stop is the one nobody looks at.

## Theming

```css
[data-theme='brand'] {
  --pct-hero: #0f766e;
  --pct-hero-via: #0e7490;
  --pct-hero-to: #1d4ed8;
  --pct-hero-text: #115e59;
  --pct-hero-text-via: #155e75;
  --pct-hero-text-to: #1e40af;
}
```

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: the face takes no focus and answers no key. `show="interact"` reacts to
`:focus-visible` on the element the consumer made focusable — the treatment follows attention,
it does not create it.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/hero/src/hero.ts`                                                                                                                                                                                                                                                                                                                                                                                |
| Keyboard map tested key by key                             | the empty map is the claim — the component adds no focusable node and no handler; what it reads is `:focus-visible` on the consumer's own element, measured in `apps/sandbox-e2e/src/hero.spec.ts`                                                                                                                                                                                                                |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/hero` in `SBX_ROUTES`. Worth saying plainly: axe cannot judge the `text` face, because text clipped from a background carries `color: transparent` and the tool reports that it cannot tell — the contrast policy is what holds it                                                                                                                                        |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `hero-faces`                                                                                                                                                                                                                                                                                                                                                              |
| `forced-colors: active` — no state carried by colour alone | `apps/sandbox-e2e/src/forced-colors.spec.ts` — all three faces drop their gradient (an image survives the forcing) and the word comes back as `CanvasText`                                                                                                                                                                                                                                                        |
| `prefers-reduced-motion` — duration from a token           | `apps/sandbox-e2e/src/preferences.spec.ts` — the drift is a DIVISION of the motion axis (`calc(var(--pct-motion-drift-duration) / 2)`), so `0s / 2` is `0s` and the sweep freezes with everything else                                                                                                                                                                                                            |
| SC 2.2.2 — motion that ends, and a stop for the page       | `apps/sandbox-e2e/src/hero.spec.ts` — the sweep runs ONE pass of four seconds and stands still, read as movement (the position moves early, and is the same value at 5.2 s and at 6 s); `paused` freezes it where it is and lets it go again. The three mechanisms are ordered: `prefers-reduced-motion` is the reader's and wins, `paused` is the page's, and the settle is what happens when neither has spoken |
| Touch target ≥ 24×24 px outright                           | not applicable — the face is paint on the consumer's element and adds no target                                                                                                                                                                                                                                                                                                                                   |
| Size axis aligned to `--pct-control-height-*`              | not applicable — a treatment has no height of its own                                                                                                                                                                                                                                                                                                                                                             |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                            |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `libs/components/hero/src/hero.scss` — one `pct-exception` for `background-position`, the drift's closed loop, which has no writing direction; the rest is logical or geometry-free                                                                                                                                                                                                                               |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/hero` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                |
| Forms                                                      | not applicable — paint holds no value                                                                                                                                                                                                                                                                                                                                                                             |
| Parts registered in the inventory                          | none — deliberately: the faces are the host and its `::after`, and a pseudo-element is not addressable from a test; `tools/check-parts.mjs` counts zero                                                                                                                                                                                                                                                           |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — six entries: the three stops as a WORD against `surface` at AA, and the three as an EDGE at UI; `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                         |
| Strings through `PCT_TEXTS`                                | not applicable — the component draws no text of its own                                                                                                                                                                                                                                                                                                                                                           |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./hero`, which depends on nothing but `@angular/core`                                                                                                                                                                                                                                                                                                                       |
| A screen-reader test log                                   | none — gap: the same one every component here has. The question for the log: that a heading wearing the `text` face reads as its own words, since the glyphs are painted by a background                                                                                                                                                                                                                          |
| A docs page with live examples                             | `apps/sandbox/src/app/views/hero/` (the sandbox view). The published site: `/components/hero` — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                        |
| Unit + mutation                                            | `libs/components/hero/src/hero.spec.ts` — 4 cases. `hero.ts` is in `libs/components/mutation.policy.json`'s inventory from this step, and its row in `libs/components/mutation.snapshot.md` is **owed**: the run that writes it is the next full one                                                                                                                                                              |

## Decisions this component implements

[0065](../decisions/0065-a-treatment-that-paints-is-a-component.md) (the main one — why a
component and not a directive, one face per element, and why the `text` face could not ship
before the two primitives existed),
[0058](../decisions/0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md)
(the gradient in the semantic tier, and a gradient as three contrast checks),
[0020](../decisions/0020-the-palette-carries-no-spares.md) (why `violet.400` and `cyan.500`
arrive with the consumer that asks for them and not before).

## Known limitations

- **No `pctHero` on another component's host.** Two components cannot share an element, so a
  hero-faced button is `variant="hero"` — which the button has — and a component that wants
  the face grows its own variant. That is the honest path rather than a workaround: a variant
  brings its own contrast entries and its own card, a face bolted on from outside brings
  neither.
- **The `text` face is invisible to axe.** Text painted through `background-clip` carries
  `color: transparent`, so the tool reports that it cannot tell rather than that it is wrong.
  The six policy entries are what make the claim measurable at all.
- **An engine without `mask-composite` gets no rim.** The rule stands behind `@supports`, and
  deliberately: the failure mode of a missing feature has to be nothing, not a gradient
  painted over the whole element.
- **The face cannot verify what it paints.** `pctHero="text"` on a 12 px word is legal CSS and
  a contrast failure the component cannot see; the policy measures the stops, not the type
  size the consumer chose.
