# @pacit/components

Angular component library — built as a modern, accessible alternative to suites like PrimeNG.
Nx monorepo.

> **Status:** early, and the API still moves. Form controls are built as a `pct-field` wrapper
> with a control inside it. What is already decided, and what is still missing, is in
> [docs/](docs/README.md) — starting with the [gate registry](docs/registry.md), which lists
> every promise next to the machine that proves it.

## Stack

Angular 22 · TypeScript 6 · Nx 23 · Vitest · Playwright · SSR

## Principles

- Minimal runtime dependencies: `@angular/cdk` alone (CDK Overlay in `PctSelect`).
- Standalone, OnPush, signals, zoneless (`zone.js` is not a dependency of this project), SSR.
- Accessibility: WCAG 2.2 AA at minimum, verified by an axe-core audit of every view in e2e,
  plus a touch target of at least 24×24 px.
- Theming through design tokens (DTCG) → CSS custom properties, with `var()` references kept
  intact, so an override cascades without a rebuild.
- System preferences out of the box: dark mode (`prefers-color-scheme`), reduced motion
  (`prefers-reduced-motion`) and high contrast (`forced-colors`).

Each of those is a promise with a gate behind it. Which gate, and what its reference control
is, is in the [registry](docs/registry.md) — generated from the requirements, so it cannot
quietly disagree with them.

## Layout

```
apps/
  sandbox/       demo application / playground
  sandbox-e2e/   e2e tests (Playwright)
libs/
  components/    the @pacit/components package (entrypoints: ./core, ./field, ./button, ./checkbox, ./radio, ./select)
  tokens/        DTCG source + build -> CSS/SCSS/TS + contrast gate
docs/            requirements, decisions, lessons and the generated registry (start: docs/README.md)
tools/           the gates (check-*) and the release script
```

## Getting started

Node 24 (the repo uses nvm). In a non-interactive shell, first:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
```

```bash
npm ci
npx nx serve sandbox --port 4200   # demo on http://localhost:4200
```

Tokens build themselves: `tokens` is a graph dependency of `components` and `sandbox`, so
`nx serve` and `nx build` generate them before their consumers. On their own: `npx nx build tokens`.

## Tests and gates

```bash
npx nx test components           # unit tests of the library (Vitest)
npx nx vite:test sandbox         # unit tests of the demo app (a different target than `test`)
npx nx e2e sandbox-e2e           # e2e on three engines + axe-core audit
npx nx check-package components  # one gate; the registry lists the rest
```

Thirteen `check-*` gates run in CI next to lint, unit tests, build, typecheck and a mutation run.
Each answers for one named promise and each has a **reference control** — prepared inputs it must
reject — because a gate that quietly stopped measuring anything is the failure this repository
keeps meeting ([`docs/lessons.md`](docs/lessons.md)).

E2E covers an axe-core audit of every view, an SSR hydration-error gate, system preferences
(dark mode / reduced motion / forced colors) and **visual tests**, whose baselines live in
`apps/sandbox-e2e/src/__screenshots__/<platform>/` and are versioned with the code. After
a deliberate visual change, refresh them and read the diff in the commit:

```bash
npx nx e2e sandbox-e2e -- --update-snapshots=changed visual.spec.ts
```

## Installing in an application

```bash
ng add @pacit/components
```

The schematic adds two stylesheets to the build configuration: the skin
(`@pacit/components/themes/pct.css`) and the CDK overlay styles
(`@angular/cdk/overlay-prebuilt.css`). Without the first, components render with no appearance at
all, and silently — an unresolved `var()` is not an error ([`lesson-36`](docs/lessons.md#lesson-36)).
Without the second, the `PctSelect` panel appears somewhere random on the page.

The skin goes **first** in the list, so an application's own override beats the default. In
a workspace without `angular.json` (Nx, for instance) the schematic guesses nothing — it prints
both entries to add by hand.

## Design tokens

Source: `libs/tokens/src/*.json` (DTCG). `libs/tokens/build.mjs` generates `dist/pct.css` (custom
properties: light theme on `:root`, `[data-theme="light"]` and `[data-theme="dark"]`, plus
`@media` blocks for system preferences), `dist/_tokens.scss` for internal use and typed
`dist/tokens.ts`.

Three tiers — **primitive → semantic → component** — with references kept as `var()`, so
overriding one variable in any scope cascades without recompiling. Dark mode binds to
`:root:not([data-theme])`, which makes the system preference a default rather than an order;
`<html data-theme="light">` is the switch, and nested `data-theme` keeps working. Reduced motion
swaps the motion axis, so a component that takes its duration from a token gets that preference
for free.

Including the skin by hand, where `ng add` did not do it:

```jsonc
// angular.json / project.json — styles
"node_modules/@pacit/components/themes/pct.css"
```

```scss
// or from a stylesheet
@use '@pacit/components/themes/pct.css';
```

The contrast policy (`libs/tokens/src/contrast.policy.json`) validates text/background pairs
against WCAG thresholds per theme — `error` fails the build, `warn` informs. Token names, tiers
and pairs have gates of their own; the promises they answer for are in
[docs/requirements/tokens.md](docs/requirements/tokens.md).

## Components

The contract, keyboard map and known limits of each are in
[docs/components/](docs/components/README.md).

`PctButton` (`@pacit/components/button`) — an attribute selector on a native `<button>`, variants
`solid|outline`, sizes `sm|md|lg`, states `disabled`/`loading`. State is exposed as `data-pct-*`,
inner elements as `data-pct-part`.

```html
<button pctButton variant="outline" size="lg">Save</button>
```

`PctField` (`@pacit/components/field`) — the **field wrapper**: label, hint, error message,
required marker and `[pctPrefix]` / `[pctSuffix]` slots inside the frame. The form contract is
implemented by the control inside, not by the wrapper, so typing stays with the kind of field.
Any control can sit in there — a text input, a select, a checkbox, a radio group.

```html
<!-- text input: a component on a native <input> -->
<pct-field label="E-mail" hint="Work address">
  <input pctText type="email" [formField]="userForm.email" />
</pct-field>

<!-- same wrapper, different control -->
<pct-field label="Country">
  <pct-select [options]="countries" [formField]="userForm.country" />
</pct-field>

<!-- decorations inside the frame; `inset` (the default) sits on the field surface,
     `fill` takes the whole slot and is a surface of its own -->
<pct-field label="Price">
  <span pctPrefix aria-hidden="true">$</span>
  <input pctText inputmode="numeric" [(value)]="price" />
  <button pctSuffix pctButton size="sm" aria-label="Clear">×</button>
</pct-field>

<pct-field label="Search">
  <input pctText [(value)]="query" />
  <button pctSuffix="fill" pctButton>Search</button>
</pct-field>
```

Controls also work **without the wrapper** (with no label and no messages then); a checkbox and
a radio group draw their own label in that case.

`PctNumber` (`@pacit/components/field`) — a numeric field (`input[pctNumber]`) whose value is
`number | null`. Built on `<input type="text">` with `role="spinbutton"` and formatting through
`Intl.NumberFormat` per `LOCALE_ID`, deliberately **not** on `<input type="number">` — what that
input costs is in [decision 0009](docs/decisions/0009-number-field.md).

```html
<!-- integer by default; bounds come from the schema's min()/max() validators -->
<pct-field label="Seats">
  <input pctNumber [formField]="form.seats" />
</pct-field>

<!-- an amount: two decimals, half-unit step -->
<pct-field label="Price">
  <span pctPrefix aria-hidden="true">$</span>
  <input pctNumber [minFractionDigits]="2" [maxFractionDigits]="2" [step]="0.5" [(value)]="price" />
</pct-field>
```

An empty field is `null`, not `0`; a comma and a dot are both accepted while typing whatever the
locale; rounding and clamping to `min`/`max` happen on blur, not mid-keystroke. The keyboard map
is in [docs/components/number.md](docs/components/number.md).

`PctCheckbox` (`@pacit/components/checkbox`) — a native **signal forms** control
(`FormCheckboxControl`). The required field is `checked`, not `value`, so it binds with brackets.

```html
<pct-checkbox label="I accept the terms" [formField]="userForm.terms" />
<!-- inside the wrapper: pct-field renders the label, the checkbox does not repeat it -->
<pct-checkbox label="Remember me" [(checked)]="remember" />
<pct-checkbox label="Partially selected" [indeterminate]="true" />
```

`PctRadioGroup` + `PctRadio` (`@pacit/components/radio`) — a composite: the form control is the
**group**, not the individual options. Arrow-key navigation comes from the browser (native radios
sharing a `name`), with no roving tabindex of our own.

```html
<pct-radio-group label="Plan" [formField]="userForm.plan">
  <pct-radio value="free">Free</pct-radio>
  <pct-radio value="pro">Pro</pct-radio>
</pct-radio-group>
```

The value is of any type (`PctRadioGroup<T>`, `string` by default) — an option can be a union
member or an entity. Equality is the application's call through `compareWith`, and no selection
is `null`.

`PctSelect` (`@pacit/components/select`) — a listbox with its own panel (not a native `<select>`),
following the ARIA "select-only combobox" pattern: focus stays on the trigger, the active option
is pointed at by `aria-activedescendant`. Panel placement and the keyboard map are in
[docs/components/select.md](docs/components/select.md).

```html
<pct-field label="Country">
  <pct-select [options]="countries" [formField]="userForm.country" />
</pct-field>
```

The value is of any type (`PctSelect<T>` / `PctSelectOption<T>`, `string` by default) and follows
from the option list. Entities are compared by key — an instance from the server is not the same
reference as the option in the list:

```html
<!-- protected byId = (a: City, b: City) => a.id === b.id; -->
<pct-select [options]="cities" [compareWith]="byId" [(value)]="city" />
```

No selection is `null`. An application with a non-nullable field supplies its own empty value
(`[emptyValue]="''"`), so resetting the form does not write `null` against the model's type.

> Requires the CDK overlay styles: `node_modules/@angular/cdk/overlay-prebuilt.css`.

## Texts and translations

Strings a component prints on its own (the select placeholder, the empty-list message) are
**English** and travel through a DI token. Fields you pass override the defaults, the rest stay:

```ts
bootstrapApplication(App, {
  providers: [providePctTexts({ selectPlaceholder: 'Sélectionner…', selectEmpty: 'Aucune option' })],
});
```

`providePctTexts` also works locally (a component's own `providers`), so one section of an
application can speak a different language than the rest. Development warnings are not part of
that channel: they are English and silent outside development mode.

## Release

Releases go through the manual **Release** workflow (`.github/workflows/release.yml`), a dry run
by default. The same thing locally:

```bash
node tools/release.mjs --dry-run --first-release
```

A script drives the release rather than `nx release` alone, because the order matters: version →
stamp the `PCT_VERSION` constant → build → package gate → CHANGELOG, tag, GitHub Release →
publish. A build before the bump ships the old constant
([`lesson-41`](docs/lessons.md#lesson-41)). The version follows from conventional commits; before
1.0 a breaking change bumps the minor.

Publishing needs the `repository` field in `libs/components/package.json` — without it npm
refuses to attach provenance. `check-package.mjs --release` blocks on that; day to day it only warns.

What a consumer gets after the release — which Angular majors a version supports, how long an
old line lives, how much notice a deprecation gets and why a breaking change arrives with an
`ng update` migration — is in [docs/support.md](docs/support.md). The three numbers there are
not prose: `check-support.mjs` reads them out of the table and requires the Angular window to
equal the one the peer ranges admit, so the document and the manifest cannot drift apart.

## License

[MIT](LICENSE) — Copyright (c) 2026 PacIT - Marek Pac. No CLA: contributions arrive under the
repository's license ([CONTRIBUTING.md](CONTRIBUTING.md)), and what that choice costs us is in
[decision 0015](docs/decisions/0015-license-and-model.md).

The license covers the code, not the name: `pacit`, the npm scope `@pacit` and the domain
`pacit.pl` belong to the entity in the `Copyright` line. Releasing under MIT cannot be undone,
so what goes out under it, and when, is settled by
[decision 0016](docs/decisions/0016-mit-irreversibility.md).

The LICENSE file ships in the package and two gates watch it: `check-package` reads the `dist`
directory, `check-consumer` the archive after `npm pack` — because the `files` field stands
between the two.

## Documentation

Requirements and architectural decisions (`req-*` identifiers): [docs/](docs/README.md) —
the [project axis](docs/00-axis.md), [requirements](docs/requirements/),
[decisions](docs/decisions/), [lessons](docs/lessons.md) and the generated
[registry](docs/registry.md).
