# 0028 — An icon set is a component, and an icon's box is the contract

**Status:** accepted
**Implements:** [`req-api-icons`](../requirements/api.md#req-api-icons),
[`req-api-icons-custom`](../requirements/api.md#req-api-icons-custom)
**Evidence:** [`lesson-85`](../lessons.md#lesson-85) — four probes over the shapes a registry
of markup can take in Angular, and a fifth over the name; [`lesson-86`](../lessons.md#lesson-86)
— the same layer measured in the shared kernel and in an entrypoint of its own

## Context

[0011](0011-icons.md) settled the direction three years' worth of components ago: two levels,
`pct-icon` over a projected drawing and a `PCT_ICONS` token "mapping semantic names to templates",
with built-in defaults. It could not be built then, because a template channel did not exist;
[0027](0027-a-slot-is-a-directive.md) built one and named icons as its second caller.

What the library had until now was two `<svg>` elements written straight into
`checkbox.html` and `select.html`. They work, they add no dependency and they are **not a
mechanism**: a consumer who wants their own arrow has no way in, and each new component adds
one more drawing nobody can reach.

The word in 0011 is _templates_, and it does not survive contact with the framework. A
`TemplateRef` is a handle on a piece of a **component's view**, so nothing can hand one to a
provider array at bootstrap — which is exactly where "swap them globally with one
declaration" has to be written. So the question the task really had to answer is: **what can
a provider hold that carries markup a consumer wrote?**

## Decision

**An icon set is a component whose templates are the icons.**

```ts
@Component({
  imports: [PctIconTemplate],
  template: `
    <ng-template pctIcon="chevron-down"><i class="pi pi-chevron-down"></i></ng-template>
    <ng-template pctIcon="check"><i class="pi pi-check"></i></ng-template>
  `,
})
export class PrimeIcons {}

bootstrapApplication(App, { providers: [providePctIcons(PrimeIcons)] });
```

Three parts, and each answers something measured:

1. **`PCT_ICONS` carries the component's type**, because that is the only thing in the
   language that both fits in a provider and yields a `TemplateRef`. The set is created once,
   lazily, outside the document and attached to nothing — its views are never rendered, only
   its templates are read ([`lesson-85`](../lessons.md#lesson-85)).
2. **A name is an input of a union type** (`PctIconName`), not a directive selector. The
   compiler checks it — a misspelt `pctIcon="chevrn-down"` is `TS2820`, with the right name
   suggested — which is the half [0027](0027-a-slot-is-a-directive.md) could not buy for slot
   names, and it is bought here for free by the string being a **value** rather than a
   selector.
3. **The default drawing is the content of `pct-icon`**, in the template of the component
   that draws it. There is no default set anywhere: a consumer who provides nothing sees the
   library's own icon, and `./checkbox` never carries the select's arrow.

**The styling contract is the box, not the drawing.** `data-pct-part`, the size, the colour
and the state (the arrow's turn on opening, the tick's visibility) sit on the `pct-icon`
element, which survives the swap; the drawing paints itself in `currentColor` and owns
nothing but its own geometry. `check-styles` point 8 refuses `fill` / `stroke` /
`stroke-width` in a component sheet for exactly that reason, and `check-icons` point 6
refuses a part below an icon.

**The layer is an entrypoint of its own** (`@pacit/components/icon`) and not part of `./core`.
The plan put it in the behaviour layer; the measurement moved it
([`lesson-86`](../lessons.md#lesson-86)).

## Consequences

- `PctIconName` is public API in the strong sense of
  [`req-api-parts`](../requirements/api.md#req-api-parts): a name cannot be renamed without a
  migration, and `check-icons` point 5 keeps the list and the drawings equal in both
  directions — a name nothing draws is a promise nobody keeps.
- A set is an ordinary provider, so it scopes: a section of a page can carry a different set
  from the rest of the application, and a partial set replaces the names it carries and no
  others.
- `providePctIcons` lives in `@pacit/components/icon` rather than in the primary entrypoint,
  where `providePctConfig` and `providePctTexts` are. Putting it with the others would drag
  the component — and `@angular/common` with it — into every bundle
  ([`lesson-86`](../lessons.md#lesson-86)).
- An icon set is created **once per injector it is provided in**, and never destroyed before
  that injector is.

## What this costs us

- **A set has to be a component.** A consumer with three icons writes one class more than a
  map of strings would need. That is the price of the sanitizer being right: a registry of
  markup strings is a registry the library would have to hand to the DOM unsanitized.
- **A misspelt slot attribute is still invisible** — `<ng-template pctIcn="check">` matches no
  directive and says nothing. It is [0027](0027-a-slot-is-a-directive.md)'s open half, met
  again one layer over; what is bought here is the **name**, which that decision could not
  buy.
- The set's component is created outside change detection's reach. Nothing renders from it,
  so nothing in it may depend on being checked — a template that reads a signal is fine, the
  view it renders in is the `pct-icon`'s.
- Two entrypoints for what a consumer thinks of as one thing: a component imports `PctIcon`
  from `@pacit/components/icon`, and so does an application registering a set.

## Alternatives considered

| alternative                                                            | why rejected                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PCT_ICONS` as a map of markup **strings**                             | Angular's sanitizer deletes an `<svg>` from `[innerHTML]` outright — measured, the element renders empty. The shape works only through `bypassSecurityTrustHtml`, that is by the library handing consumer markup to the DOM unchecked |
| `PCT_ICONS` as a map of **component types**                            | works, and puts the consumer's host element between the icon's box and the drawing: `pct-icon > svg` stops matching, and the component's sizing has to reach one level further than it wrote                                          |
| `PCT_ICONS` as a map of **`TemplateRef`s**                             | the shape 0011 named, and nothing can build one at bootstrap: a `TemplateRef` needs a component view to exist in. A consumer would have to write this decision's set component by hand and extract the templates themselves           |
| an `<ng-template pctIcon>` registry written in the app's root template | registration then depends on when that template is rendered, and an icon drawn before it — in an overlay, on a route resolved earlier — silently falls back                                                                           |
| a slot per component (`<ng-template pctSelectArrow>`)                  | already rejected in [0011](0011-icons.md): it forces the consumer to supply the icon at **every** use of every component, which is the opposite of one declaration                                                                    |
| the layer in `./core`, as the plan put it                              | 754 B and `@angular/common` on every entrypoint, including a button that draws no icon ([`lesson-86`](../lessons.md#lesson-86))                                                                                                       |
