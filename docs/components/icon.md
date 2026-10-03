# `PctIcon` — a drawing in a box the text sizes and colours

**Summary:** An icon from any set — a font, SVG drawings as data, a sprite, your own component — in a box the text sizes and colours; one line registers the set and dresses the library in it.
**Entrypoint:** `@pacit/components/icon`
**Selector:** `pct-icon`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** none — an icon is decoration beside the words it repeats, out of the
accessibility tree, and an image (`role="img"`) only when it is given a `label`; neither has a
pattern. Named in the class JSDoc.

**Two ways to say which.** `name` is a ROLE of the library — the select names `chevron-down`,
the toast names `danger` — and the drawing written as content is what a consumer who registers
nothing sees ([0028](../decisions/0028-an-icon-set-is-a-component.md)). `icon` is an id of the
consumer's own set, answered by the sources `providePctIcons(…)` registered. A source answers
an id with **data, never markup** — an icon font's classes, an SVG drawing as elements and
attributes, a component — and a source that knows the library's roles in its vocabulary says
so, which is how `providePctIcons(primeIcons())` dresses the select's arrow and the toast's
marks in one line
([0083](../decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)).

**The box is the contract.** `1em` and the text's colour by default, `size` steps it off the
icon's own tokens, `tone` paints it with the skin's four; the drawing paints itself in
`currentColor` and owns nothing but its geometry. An icon is itself the second channel a tone
needs ([0076](../decisions/0076-a-tone-is-two-channels-and-four-names.md)) — a shape that
stays when forced colours take the colour — so a toned icon never speaks alone.

**Why no markup.** Angular's sanitizer deletes an `<svg>` from `[innerHTML]` outright, and the
only way round it is the library trusting a string a consumer wrote. So a drawing arrives as
data and is rendered element by element through a list of tags and a list of attributes
(`@pacit/components/svg-icon`): a tag outside the list draws nothing, an attribute outside it
never reaches an element, a `url(` in a paint value is refused unless it points into the
document, and a drawing from anybody's data is as safe as one from nobody's.

## Usage

```html
<pct-icon icon="trash" tone="danger" />
```

## Contract

|             |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — an icon holds no value                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Inputs**  | `name` (`PctIconName \| null`) — a role of the library, for its own components; `icon` (`PctIconId \| null`) — an id of the consumer's set, `string` until `PctIconIds` is augmented; `tone` (`PctTone \| null`) — the skin's four, the absence is the neutral; `size` (`PctSize \| null`) — a step on the icon's tokens, `null` is `1em`; `label` (`string \| null`) — an accessible name, and with it `role="img"`; without it `aria-hidden` |
| **Outputs** | none                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Slots**   | the content — the drawing a component of the library ships, or a consumer's one-off; rendered when no source answers                                                                                                                                                                                                                                                                                                                           |
| **Parts**   | none — the host is the box, and `data-pct-part` on anything inside it would point at an element a set replaces (`check-icons` point 6)                                                                                                                                                                                                                                                                                                         |
| **Harness** | `PctIconHarness`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Tokens**  | the `--pct-icon-*` prefix — three size steps and one colour per tone — and four entries in `contrast.policy.json`, each tone against the page as a graphical object                                                                                                                                                                                                                                                                            |
| **Strings** | **none** — the box draws no text of its own; a ligature font's word is the source's and hidden                                                                                                                                                                                                                                                                                                                                                 |

**Sources, and where each lives.** `@pacit/components/icon` carries the box, the set component
of 0028 and the font adapters — `fontAwesome()`, `primeIcons()`, `bootstrapIcons()`,
`materialIcons()`, `materialSymbols()`, and `iconFont()` for any other — each a pure function
with the library's ten roles in that font's spelling and an override for a version that spells
one differently. `@pacit/components/svg-icon` carries the renderer and `svgIcons()` (a lucide or
tabler node list, a FontAwesome SVG definition, or a drawing written out) with `svgSprite()`;
it is an entrypoint of its own because a component in a barrel is not shaken out the way a
function is, and measured in `./icon` it put 3558 B on every entrypoint that draws an arrow
(`size.snapshot.md` holds the final rows; [`lesson-248`](../lessons.md#lesson-248)). Sources are asked in order: the first that answers
draws, a font or a sprite answers for every id and so stands last.

## Parts

| part | what it is |
| ---- | ---------- |

None — the host is the box.

## Theming

```css
[data-theme='brand'] {
  --pct-icon-fg-danger: #9f1239;
  --pct-icon-size-lg: 28px;
}
```

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: an icon takes no focus and handles no key — the platform provides nothing
here because there is nothing to provide
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/icon/src/icon.ts`                                                                                                                                                                                                                                                                                                                                                                                                     |
| Keyboard map tested key by key                             | the empty map is the claim — nothing here is focusable; `tools/check-aria.mjs` point 8 holds that a hidden host holds nothing a user can land on                                                                                                                                                                                                                                                                                       |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/icon` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                          |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `icon-tones` and `icon-tones-rtl`                                                                                                                                                                                                                                                                                                                                                              |
| `forced-colors: active` — no state carried by colour alone | `apps/sandbox-e2e/src/forced-colors.spec.ts` › "a toned icon arrives at the palette's word for text, with its drawing standing" — the sheet writes no forced-colours rule at all: the mode forces `color` itself and the drawing is what is left, which is the whole reason an icon may wear a tone (0076)                                                                                                                             |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                                                                                                                                                                                                                                      |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target; an icon-only button is a button, measured there                                                                                                                                                                                                                                                                                                                                             |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: an icon is not a control and `size` steps the icon's OWN tokens — `apps/sandbox-e2e/src/icon.spec.ts` › "the box is the text's own size, and each step is the icon's own token" measures `1em` beside text and the three steps against the tokens                                                                                                                                                                    |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                 |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `libs/components/icon/src/icon.scss` — a square box and a flex centre, nothing directional. The screenshot: `icon-tones-rtl`                                                                                                                                                                                                                                                                                                           |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/icon` in `SBX_ROUTES`; every kind of rendering is a template or a component the framework creates, so the server and the client build the same tree                                                                                                                                                                                                                                       |
| Forms                                                      | not applicable — an icon holds no value a form owns                                                                                                                                                                                                                                                                                                                                                                                    |
| Parts registered in the inventory                          | none — deliberately: the host is the box and nothing inside it may carry a part; `tools/check-icons.mjs` point 6 refuses one, `tools/check-parts.mjs` counts zero and the README table carries both entrypoints                                                                                                                                                                                                                        |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — four entries, one per tone against the page (UI error); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                      |
| Strings through `PCT_TEXTS`                                | not applicable — the component draws no text of its own; `tools/check-texts.mjs` point 3 reads the ligature text as a binding and the two dev-mode warnings as point 6's                                                                                                                                                                                                                                                               |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./icon` grew by the sources, the tones and the sizes, and the fourteen entrypoints that import it moved with it in one visible diff; `./svg-icon` is a row of its own so that none of them carries the renderer ([`lesson-248`](../lessons.md#lesson-248))                                                                                                                                       |
| Screen-reader log                                          | Read 2026-10-02 from `docs/acr/at/` — three readers, whole sandbox. `/icon`'s only stops of its own are the two checkboxes of the dressed pair (`check box checked` in Orca, `check box, checked` in NVDA, `checked checkbox` in VoiceOver), and no icon is a stop in any of the three — which is the claim: hidden until named, and the named one is an image a reader meets in browse mode, not on Tab                               |
| A docs page with live examples                             | `apps/sandbox/src/app/views/icon/` (the sandbox view, with the sandbox's own drawings and a six-glyph font of its own). The published site: `/components/icon` — prerendered, with lucide's drawings and the stylesheets of PrimeIcons, Font Awesome and Material Icons behind the adapters; nine examples — the three fonts, a drawing and a font of your own, several sets at once, the library dressed whole and in part, the tones |
| Unit + mutation                                            | `libs/components/icon/src/icon.spec.ts`, `libs/components/icon/src/fonts.spec.ts`, `libs/components/svg-icon/src/svg-icon.spec.ts` — the sources in order, the roles, the box's attributes, the two warnings, every adapter's whole roles map, every tag the renderer knows and every attribute it refuses; `libs/components/mutation.snapshot.md` — `icon.ts`, `fonts.ts` and `svg-icon.ts` measured                                  |

## Decisions this component implements

[0083](../decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md) (the
main one — a source answers with data, the box renders three kinds, the renderer is an
entrypoint of its own, and why no string of markup is ever taken),
[0028](../decisions/0028-an-icon-set-is-a-component.md) (a set is a component whose templates
are the icons, and the box is the contract — still true, the set being one source among the
others now), [0011](../decisions/0011-icons.md) (semantic names, no dependency on an icon
set), [0076](../decisions/0076-a-tone-is-two-channels-and-four-names.md) (the four tones, and
why an icon may wear one), [0013](../decisions/0013-no-headless-split.md) (tokens as the whole
styling contract).

## Known limitations

- **No string of SVG, and no URL to fetch.** A consumer holding raw `<svg>` markup — iconify's
  `body`, a designer's files read as text — has three roads: a sprite (`svgSprite`), a set
  component with the markup in its templates (0028), or the content of the box. A `markup`
  kind taking a `SafeHtml` the consumer trusted, and a `url` kind fetched once, are the next
  two kinds if they are asked for; neither is a reason to take a plain string.
- **Multicolour icons render as drawn.** `tone` and the box's colour reach a drawing through
  `currentColor`; a drawing that paints its own colours — a brand mark, a duotone icon's
  second layer — keeps them and ignores the tone, as it should.
- **A tone cannot tell two states apart on one glyph.** A red check and a green check mean
  two things by colour alone, and no gate sees it; the contract is prose, and the icon's own
  shape is what the tone may lean on ([0076](../decisions/0076-a-tone-is-two-channels-and-four-names.md)).
- **The adapters know one version of each set.** FontAwesome 6 spells `xmark` where 5 spelled
  `times`; the roles map and the prefix are overrides for exactly that, and the version each
  map assumes is written beside it.
- **No `color` input.** A custom colour is `color` on the box, or `--pct-icon-fg-<tone>` on a
  scope: a style in a template is what the token tiers exist to avoid.
