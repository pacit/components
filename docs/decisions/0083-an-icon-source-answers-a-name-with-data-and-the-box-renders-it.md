# 0083 — An icon source answers a name with data, and the box renders it

**Status:** accepted
**Implements:** [`req-api-icons`](../requirements/api.md#req-api-icons),
[`req-api-icons-custom`](../requirements/api.md#req-api-icons-custom),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)
**Evidence:** [`lesson-248`](../lessons.md#lesson-248) — the SVG renderer measured inside
`./icon` and in an entrypoint of its own; `libs/components/icon/src/icon.spec.ts`,
`fonts.spec.ts` and `libs/components/svg-icon/src/svg-icon.spec.ts` — the sources in order,
the whole of every roles map, every tag the renderer draws and every attribute it refuses;
`apps/sandbox-e2e/src/icon.spec.ts` — the box measured in three engines

## Context

[0028](0028-an-icon-set-is-a-component.md) built the seam: `pct-icon` is a box, the library's
components name a ROLE in it, and a consumer swaps roles with a component whose templates are
the icons. It answered the library's question — how does the select's arrow get replaced — and
left the consumer's unanswered: how does an application draw ITS icons? With FontAwesome, with
PrimeIcons, with Material's ligature font, with lucide's data, with a sprite a build step made
from a designer's folder. The seam let a consumer wrap any markup in `<pct-icon>`, undocumented,
and nothing more: no id to name an icon once, no tone, no size, no accessible name, and the ten
roles swappable only by writing ten templates by hand.

The ask was the whole of it at once — "svg works, a font works, free icons work" — and one
constraint over all of it: the library's own components must be as easy to redress as the
consumer's icons are to draw.

## Decision

**A source answers an id with data, never markup; the box renders three kinds; a source that
knows the library's roles in its own vocabulary dresses the library.**

```ts
providePctIcons(svgIcons({ logo: LOGO, house: House }), primeIcons());
```

```html
<pct-icon icon="house" />
<!-- the consumer's id, through the sources -->
<pct-icon icon="trash" tone="danger" />
<!-- the skin's four, through the box -->
<pct-icon icon="bell" label="3 unread" />
<!-- an image under that name; decoration otherwise -->
<pct-icon name="chevron-down">…</pct-icon>
<!-- a role of the library, unchanged -->
```

Five sentences, and each is a measurement or a refusal.

1. **A rendering is one of three kinds — a template, a font glyph, a component — and no
   string.** Angular's sanitizer allows no SVG element at all ([`lesson-85`](../lessons.md#lesson-85)),
   so a string of SVG renders only through `bypassSecurityTrustHtml` on something the consumer
   wrote; 0028 refused to call it and this decision keeps refusing. A font is a class and a
   word, which are attribute bindings. A drawing is elements and attributes, which the
   renderer writes through a list of seven tags and a list of thirty attributes: a tag outside
   it has no case, an attribute outside it never reaches an element, and `onload`, `href`,
   `style` and `class` are dropped with a word in dev mode. A VALUE is read too: `fill="url(…)"`
   makes a browser fetch a paint server from wherever the data says (Chromium across origins,
   measured in review), so a `url(` in a value is refused unless it points into the document,
   `url(#id)`; and a sprite's address is read the way a URL parser reads it, blanks and
   controls stripped, before its scheme is judged. That list is the whole sanitizer, honest
   because it is a list of geometry.
2. **A source is a plain object: `resolve(id)` and an optional `roles` map.** The set
   component of 0028 is one source among the others, wrapped: its template names are its
   roles and its ids alike. `providePctIcons(…)` takes any number, in order of precedence,
   and `null` hands the id on — so an application's own drawings stand first and a font that
   answers for every id stands last.
3. **The roles map is what dresses the library.** An adapter carries the ten roles in its
   set's spelling — `close` is `xmark` in FontAwesome 6 and `times` in PrimeIcons — so
   `providePctIcons(primeIcons())` is one line and the select's arrow, the checkbox's tick, the
   avatar's silhouette and the toast's four marks all wear PrimeIcons. Knowledge, not glyphs:
   an adapter is a pure function with no import of the package, and `req-api-icons-custom`
   holds. A role spelled differently by a consumer's version is an override; a role set to
   `undefined` keeps the library's drawing.
4. **The box learned four things and the renderer moved out.** `icon`, `tone`, `size` and
   `label` are inputs of `pct-icon`; the tone is `PctTone` and paints the box with
   `--pct-icon-fg-<tone>`, the size steps `--pct-icon-size(-sm|-lg)`, the label turns
   `aria-hidden` into `role="img"`. The SVG renderer is `@pacit/components/svg-icon`, an
   entrypoint of its own: measured in `./icon` it cost 3558 B on every one of the fourteen
   entrypoints that draw an arrow (on Angular 22.0.6; the final rows `size.snapshot.md` holds read
   11652 and 15252 on 22.2.1, with the box's own growth in them), because a component in a barrel is not shaken out the way a
   function is ([`lesson-248`](../lessons.md#lesson-248), the same law as
   [`lesson-86`](../lessons.md#lesson-86)). The box itself grew by what it learned, and that
   growth stands in `size.snapshot.md` as fourteen visible lines.
5. **Two inputs, not one widened.** `name` keeps its closed union and the `TS2820` 0028 bought
   for the library's roles; `icon` is open, `string` until the application augments
   `PctIconIds`, and then exactly its keys. One element asked for by both says so in dev mode,
   and so does an id no source answers over an empty box — once per id.

**What is refused, and why.** The CSS `mask-image` trick — a monochrome file as a mask over
`background: currentColor`, which recolours any SVG with no JavaScript — disappears under
`forced-colors: active`, where backgrounds flatten to `Canvas`, and the only repair is the
`forced-color-adjust: none` that `req-a11y-forced-colors` forbids. An `<img>` survives the
mode but takes no colour. A fetched URL and a trusted `SafeHtml` are kinds this decision does
not add: the three it has cover every set the ask named, and a kind that trusts a string is a
kind to decide on its own evidence.

**A tone on an icon.** [0076](0076-a-tone-is-two-channels-and-four-names.md) binds a tone to
two channels. An icon IS the second channel — the toast's mark is a `pct-icon` — so a toned
icon never speaks alone, and the sheet writes no forced-colours rule at all: the mode forces
`color` itself, and the shape is what is left. The one shape 0076's rule cannot see stays
unseen here too: one and the same glyph in two tones meaning two states.

## Consequences

- `PCT_ICONS` carries a list of sets and sources where it carried one component type. No
  file in this repository injects it (measured: `grep -rn "inject(PCT_ICONS"` finds the
  registry alone), `providePctIcons` is the API and every call of it that compiled before
  compiles unchanged — but a consumer's own `inject(PCT_ICONS)` would stop compiling, so the
  change is **marked breaking** in the release record rather than hoped past. No migration:
  a schematic cannot know what a consumer did with the type it read.
- An icon of a consumer's and an icon of the library's are the same element, with the same
  box, so a tone or a size step reaches both — and the library's components keep naming roles,
  never ids (`check-icons` point 3).
- The adapters know ONE version of each set, and that is written beside each map. Drift is
  the cost of knowledge: the day FontAwesome 7 renames a glyph the map is wrong until somebody
  reads it, and the override is the consumer's repair in the meantime.
- Every source that answers for every id — a font, a sprite — hides whatever stands after it.
  Order is the consumer's to write, and the documentation says which sources answer `null`.
- `check-icons` point 2 exempts one entrypoint's templates: the renderer's own `<svg>` is the
  mechanism and not a drawing, and the reference input carries one so that the exemption is
  exercised rather than written.

## What this costs us

- **Every entrypoint that draws an arrow grew by about 3.5 kB** for the box's new abilities —
  the three kinds, five inputs, the tones and the sizes in the sheet — paid by an application
  that uses a checkbox and never a consumer icon. The renderer's own 3.5 kB were refused by
  moving it; the box's were accepted, in a visible diff, as the price of one component rather
  than two.
- **Two entrypoints for one idea**, a third counting `./testing`: a consumer drawing from
  data imports `svgIcons` from `./svg-icon` and `providePctIcons` from `./icon`.
- **A list of geometry is a list somebody maintains.** A `<g>` with children, a `<defs>`, a
  gradient — none of them render, by design, and the first consumer with a layered icon will
  ask. The answer is the content of the box or a set component, not a wider list by reflex.
- **The documentation site carries two devDependencies** — lucide (a permissive licence of its own) and PrimeIcons 7
  (MIT; 8 moved to a licence with a key) — so that a page about adapters shows a real font
  behind the classes. The sandbox refuses both and draws with eight hand-made icons and a
  six-glyph `::before` font, so the e2e suite measures the mechanism and not somebody's file.

## Alternatives considered

| alternative                                                   | why rejected                                                                                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a `markup` kind taking a string                               | the sanitizer deletes it, and the only way through is the library trusting consumer markup — 0028's reason, unchanged                                                                           |
| a `markup` kind taking `SafeHtml`, as `mat-icon` does         | sound — the trust is declared by the consumer — and not needed by any set the ask named; deferred to its own evidence rather than added by reflex                                               |
| the renderer inside `./icon`, as it was first written         | +3558 B on fourteen entrypoints, measured ([`lesson-248`](../lessons.md#lesson-248)); a component in a barrel does not shake                                                                    |
| the renderer building elements imperatively, with no template | no `<svg>` in any template and so no gate to amend — and nodes the template did not render are what a hydration mismatch is made of; the template with `<svg:path>` cases is the same whitelist |
| one `name` input widened to `PctIconName \| string`           | loses the compile error for a misspelt role, which is what 0028 bought                                                                                                                          |
| a `color` input                                               | a style in a template; `color` on the box and the tone tokens on a scope are the two roads the tiers already have                                                                               |
| CSS `mask-image` for recolouring any file                     | invisible under forced colours without `forced-color-adjust: none`, which `req-a11y-forced-colors` forbids                                                                                      |
| the adapters outside the library, as documented recipes       | three lines nobody copies right the first time, and no roles map — so the library's own components would not follow the consumer's set, which was the one constraint over everything else       |
