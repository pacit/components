# @pacit/components

Accessible Angular component library: standalone, zoneless, signal forms, SSR and design-token
theming.

> **Status: early, and the API still moves.** The set is small on purpose — a button and a field
> wrapper with a text, numeric, checkbox, radio or select control inside it. What is already
> decided, and what is still missing, is written down promise by promise in the
> [gate registry](https://github.com/pacit/components/blob/main/docs/registry.md), which names
> the machine that proves each one next to it.

## Install

```bash
ng add @pacit/components
```

The schematic adds two stylesheets to the build configuration, in this order:

1. `@pacit/components/themes/pct.css` — the skin. Without it the components render with **no
   appearance at all**, and silently: an unresolved `var()` is not an error.
2. `@angular/cdk/overlay-prebuilt.css` — the CDK overlay styles. Without them the `PctSelect`
   panel appears somewhere random on the page.

The skin goes **first**, so an application's own override beats the default. In a workspace
without `angular.json` (an Nx one, for instance) the schematic guesses nothing — it prints both
entries for you to add by hand.

### Peer dependencies

| package          | range     |
| ---------------- | --------- |
| `@angular/core`  | `^22.0.0` |
| `@angular/forms` | `^22.0.0` |
| `@angular/cdk`   | `^22.0.0` |

`zone.js` is not one of them. Every component is standalone, `OnPush` and driven by signals, so
it works in a zoneless application and renders on the server.

## Entrypoints

Components are imported from **secondary entrypoints**, so an application that uses a button
does not pay for a select. The primary entrypoint carries configuration only.

| entrypoint                   | what is in it                                                      |
| ---------------------------- | ------------------------------------------------------------------ |
| `@pacit/components`          | `providePctConfig`, `providePctTexts`, their tokens, `PCT_VERSION` |
| `@pacit/components/button`   | `PctButton`                                                        |
| `@pacit/components/field`    | `PctField`, `PctText`, `PctNumber`, `PctPrefix`, `PctSuffix`       |
| `@pacit/components/checkbox` | `PctCheckbox`                                                      |
| `@pacit/components/radio`    | `PctRadioGroup`, `PctRadio`                                        |
| `@pacit/components/select`   | `PctSelect`, `PctSelectOption`                                     |
| `@pacit/components/core`     | what the controls share: `PCT_FIELD`, `PctCompareWith`, id helpers |

`@pacit/components/themes/pct.css` is the built skin — see [Theming](#theming).

## Components

### Button

An attribute selector on a native `<button>` — the element keeps its type, its form behaviour
and its keyboard handling.

```html
<button pctButton variant="outline" size="lg">Save</button>

<button pctButton [loading]="saving()">Save</button>
```

`variant` is `solid | outline`, `size` is `sm | md | lg`, and `disabled` / `loading` are boolean
attributes. State is exposed as `data-pct-*` and the inner elements as `data-pct-part`, so an
application can style them without reaching for a private class name.

### Field

`pct-field` is the **wrapper**: label, hint, error message, required marker and the
`[pctPrefix]` / `[pctSuffix]` slots inside the frame. The form contract belongs to the control
inside it, not to the wrapper, so typing stays with the kind of field.

```html
<pct-field label="E-mail" hint="Work address">
  <input pctText type="email" [formField]="userForm.email" />
</pct-field>

<pct-field label="Country">
  <pct-select [options]="countries" [formField]="userForm.country" />
</pct-field>
```

Decorations sit inside the frame. `inset` (the default) sits on the field surface; `fill` takes
the whole slot and is a surface of its own:

```html
<pct-field label="Price">
  <span pctPrefix aria-hidden="true">$</span>
  <input pctText inputmode="numeric" [(value)]="price" />
</pct-field>

<pct-field label="Search">
  <input pctText [(value)]="query" />
  <button pctSuffix="fill" pctButton>Search</button>
</pct-field>
```

Controls also work **without the wrapper** — with no label and no messages then; a checkbox and
a radio group draw their own label in that case.

### Number

`input[pctNumber]` is a numeric field whose value is `number | null`. It is built on
`<input type="text">` with `role="spinbutton"` and formats through `Intl.NumberFormat` per
`LOCALE_ID` — deliberately not on `<input type="number">`.

```html
<pct-field label="Seats">
  <input pctNumber [formField]="form.seats" />
</pct-field>

<pct-field label="Price">
  <span pctPrefix aria-hidden="true">$</span>
  <input pctNumber [minFractionDigits]="2" [maxFractionDigits]="2" [step]="0.5" [(value)]="price" />
</pct-field>
```

An empty field is `null`, not `0`. A comma and a dot are both accepted while typing whatever the
locale, and rounding and clamping to `min` / `max` happen on blur rather than mid-keystroke.
Bounds come from the schema's `min()` / `max()` validators when the field is bound to a form.

### Checkbox

A native signal-forms control (`FormCheckboxControl`). The bound field is `checked`, not
`value`.

```html
<pct-checkbox label="I accept the terms" [formField]="userForm.terms" />
<pct-checkbox label="Remember me" [(checked)]="remember" />
<pct-checkbox label="Partially selected" [indeterminate]="true" />
```

### Radio group

A composite: the form control is the **group**, not the individual option. Arrow-key navigation
comes from the browser — native radios sharing a `name` — with no roving tabindex of ours on top.

```html
<pct-radio-group label="Plan" [formField]="userForm.plan">
  <pct-radio value="free">Free</pct-radio>
  <pct-radio value="pro">Pro</pct-radio>
</pct-radio-group>
```

The value is of any type (`PctRadioGroup<T>`, `string` by default), so an option can be a union
member or an entity. Equality is the application's call through `compareWith`, and no selection
is `null`.

### Select

A listbox with its own panel rather than a native `<select>`, following the ARIA select-only
combobox pattern: focus stays on the trigger and the active option is pointed at by
`aria-activedescendant`.

```html
<pct-field label="Country">
  <pct-select [options]="countries" [formField]="userForm.country" />
</pct-field>
```

An option is `{ value, label, disabled? }`. The value is of any type (`PctSelect<T>`,
`PctSelectOption<T>`), and entities are compared by key, because an instance from the server is
not the same reference as the one in the option list:

```ts
protected byId = (a: City, b: City) => a.id === b.id;
```

```html
<pct-select [options]="cities" [compareWith]="byId" [(value)]="city" />
```

No selection is `null`. An application with a non-nullable field supplies its own empty value
(`[emptyValue]="''"`), so resetting the form does not write `null` against the model's type.
`panelWidth` and `panelAlign` control the panel geometry.

> Needs the CDK overlay styles — see [Install](#install).

## Theming

Colours, spacing, typography and motion come from **design tokens** (DTCG) built into CSS custom
properties. Three tiers — primitive, semantic, component — with the references kept as `var()`,
so overriding one variable in any scope cascades without a rebuild:

```css
/* --pct-button-bg is var(--pct-primary), so this is the whole change */
:root {
  --pct-primary: #6d28d9;
}
```

Dark mode binds to `:root:not([data-theme])`, which makes the system preference a **default
rather than an order**. `<html data-theme="light">` is the switch, and a nested `data-theme`
keeps working — a light panel inside a dark page is one attribute.

Reduced motion swaps the motion axis, so a component that takes its duration from a token
follows `prefers-reduced-motion` for free, and `forced-colors` has its own rules on top.

Including the skin by hand, where `ng add` did not do it:

```jsonc
// angular.json / project.json — styles
"node_modules/@pacit/components/themes/pct.css"
```

```scss
// or from a stylesheet
@use '@pacit/components/themes/pct.css';
```

## Texts

The strings a component prints on its own — the select placeholder, the empty-list message — are
English and travel through a DI token. The fields you pass override the defaults, the rest stay:

```ts
bootstrapApplication(App, {
  providers: [providePctTexts({ selectPlaceholder: 'Sélectionner…', selectEmpty: 'Aucune option' })],
});
```

The token carries a **signal**, so changing language does not need a page reload.
`providePctTexts` also works in a component's own `providers`, so one section of an application
can speak a different language than the rest. Development warnings are not part of this channel:
they are English, and silent outside development mode.

## Configuration

```ts
bootstrapApplication(App, {
  providers: [providePctConfig({ defaultSize: 'lg' })],
});
```

`defaultSize` is what a component uses when `size` is not set on it.

## Accessibility

WCAG 2.2 AA is the floor, and it is measured rather than declared: every view of the demo
application goes through an axe-core audit in e2e, touch targets are at least 24×24 px, and the
keyboard map of each component is written down and tested. Where a pattern has a known limit, the
limit is in that component's page under
[docs/components/](https://github.com/pacit/components/blob/main/docs/components/README.md)
rather than left for you to discover.

## Documentation

- [Component contracts](https://github.com/pacit/components/blob/main/docs/components/README.md) —
  API, keyboard map and known limits, one page each
- [Gate registry](https://github.com/pacit/components/blob/main/docs/registry.md) — every promise
  next to the machine that proves it
- [Requirements](https://github.com/pacit/components/tree/main/docs/requirements) and
  [decisions](https://github.com/pacit/components/tree/main/docs/decisions) — why the library is
  shaped the way it is
- [Repository](https://github.com/pacit/components)

## License

[MIT](https://github.com/pacit/components/blob/main/LICENSE) — Copyright (c) 2026 PacIT - Marek
Pac. The license covers the code, not the name: `pacit`, the npm scope `@pacit` and the domain
`pacit.pl` belong to the entity in the copyright line.
