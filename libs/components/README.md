# @pacit/components

Accessible Angular component library: standalone, zoneless, signal forms, SSR and design-token
theming.

> **Status: early, and the API still moves.** Twenty-one entrypoints ship today: the form
> controls (a field wrapper with text, textarea, number, prefix/suffix affixes; checkbox,
> radio group, select and multi-select, switch, slider, date), the overlays (dialog, tooltip,
> popover, menu, toast) and the page's own structures (tabs, accordion, drawer, pagination,
> progress, skeleton, chips). What is already decided, and what is still missing, is written down
> promise by promise in the
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

| entrypoint                     | what is in it                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `@pacit/components`            | `providePctConfig`, `providePctTexts`, their tokens, `PCT_VERSION`               |
| `@pacit/components/accordion`  | `PctAccordion`, `PctAccordionItem`                                               |
| `@pacit/components/button`     | `PctButton`                                                                      |
| `@pacit/components/checkbox`   | `PctCheckbox`                                                                    |
| `@pacit/components/chips`      | `PctChips`, `PctChip`                                                            |
| `@pacit/components/date`       | `PctDate`, `PctCalendar`, the `PctDay` helpers                                   |
| `@pacit/components/dialog`     | `PctDialog`, `PctAutofocus`                                                      |
| `@pacit/components/drawer`     | `PctDrawer`, `PctDrawerTrigger`                                                  |
| `@pacit/components/field`      | `PctField`, `PctText`, `PctNumber`, `PctAutosize`, `PctPrefix`, `PctSuffix`      |
| `@pacit/components/icon`       | `PctIcon`, `PctIconTemplate`, `providePctIcons`, `PCT_ICONS`                     |
| `@pacit/components/menu`       | `PctMenu`, `PctMenuItem`, `PctMenuTrigger`                                       |
| `@pacit/components/pagination` | `PctPagination`                                                                  |
| `@pacit/components/popover`    | `PctPopover`, `PctPopoverTrigger`                                                |
| `@pacit/components/progress`   | `PctProgress`                                                                    |
| `@pacit/components/radio`      | `PctRadioGroup`, `PctRadio`                                                      |
| `@pacit/components/select`     | `PctSelect`, `PctMultiSelect`, `PctSelectOptionTemplate`, the filter helpers     |
| `@pacit/components/skeleton`   | `PctSkeleton`                                                                    |
| `@pacit/components/slider`     | `PctSlider`                                                                      |
| `@pacit/components/switch`     | `PctSwitch`                                                                      |
| `@pacit/components/tabs`       | `PctTabs`, `PctTab`                                                              |
| `@pacit/components/toast`      | `PctToaster`, `PctToastViewport`, `providePctToastConfig`                        |
| `@pacit/components/tooltip`    | `PctTooltip`                                                                     |
| `@pacit/components/core`       | what the controls share: `PCT_FIELD`, `PctAnnouncer`, template slots, id helpers |

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

Controls also work **without the wrapper**; a checkbox, a radio group and the select draw their
own label, hint and error message in that case. There is one message line either way — while an
error is lit it takes the line and the hint gives way.

### Textarea

`pctText` serves a native `<textarea>` as well as an `<input>`. Add `pctAutosize` and the box
is as tall as what is written in it — `rows` stays the floor and `maxRows` is the ceiling,
past which the text scrolls:

```html
<pct-field label="About you">
  <textarea pctText pctAutosize rows="3" maxRows="10" [(value)]="bio"></textarea>
</pct-field>
```

Where the height comes from is the browser's business first: in engines with
`field-sizing: content` the box is laid out against its own text, with no script involved at
any point and the right height already at the first server-rendered paint. Where the property
is missing, the same height is measured — and the two are held to the same numbers by the same
tests, in three engines. Autosize sets `resize: none`: a drag handle would be a second author
of a height this already owns.

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

Option values have to be **unique** under that comparison, as in the select — with the
difference the platform makes here: the native radios share a `name`, so of two options
carrying one value the browser keeps only the **last** checked while both paint themselves as
chosen. Reported in dev mode rather than quietly repaired.

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

Option values have to be **unique** under that comparison: a value points back at exactly one
option, so of two options that compare equal only the first is ever reachable. A list that
breaks it is reported in dev mode rather than quietly repaired.

No selection is `null`. An application with a non-nullable field supplies its own empty value
(`[emptyValue]="''"`), so resetting the form does not write `null` against the model's type.
`panelWidth` and `panelAlign` control the panel geometry.

#### An option row of your own

The built-in row draws the label. To draw it yourself, write an `<ng-template>` carrying the
slot's directive inside the select:

```html
<pct-select [options]="countries" [(value)]="country">
  <ng-template [pctSelectOption]="countries" let-option let-selected="selected">
    <img [src]="option.value.flag" alt="" />
    <span>{{ option.label }}</span>
    @if (selected) {
    <small>chosen</small>
    }
  </ng-template>
</pct-select>
```

The list is bound a **second** time on purpose: a directive has no inference site of its own,
so that binding is where `let-option` gets its type from — without it the context would be
`any`. It is read by nothing at runtime, and it is required, so leaving it off is a build
error rather than a silently untyped template.

Besides `$implicit` the context carries `index`, `active`, `selected` and `disabled` — the
state the built-in row paints, so a row of your own can show it too. The template replaces what
is **inside** the option: `role="option"`, the id, `aria-selected` and the keyboard stay with
the component, because they are the listbox pattern rather than decoration.

> Needs the CDK overlay styles — see [Install](#install).

### Multi-select

`<pct-multi-select>` is the many-choice select: the same options, the same panel, `value` as
an array, chosen values drawn as tags on the trigger. Both selects also take `filterable`
(a query field in the panel), `clearable` (a cross that takes the value back) and `loading`
(a panel that says the list is still coming), and both accept the same option template.

```html
<pct-multi-select [options]="tags" [(value)]="chosen" filterable clearable />
```

### Switch

An on/off control on a native input with `role="switch"` — the pressed state, the keyboard
and what a screen reader announces are the platform's, not re-implemented.

```html
<pct-switch [(checked)]="notifications" label="Notifications" />
```

### Slider

The platform's `<input type="range">` under the library's paint: keyboard steps, RTL
direction and the announced value all come from the element itself.

```html
<pct-slider [(value)]="volume" [min]="0" [max]="100" label="Volume" />
```

### Date

A date field with a calendar panel. The value is a `PctDay` — a plain `'2026-08-31'` string,
**not** a `Date`: a day is not an instant, so no timezone can shift it. Typing and the
calendar both write the model; `min`, `max` and a `dateDisabled` predicate fence the range.

```html
<pct-date [(value)]="deadline" label="Deadline" [min]="today" />
```

### Dialog

A modal overlay: focus moves in and is held, the page behind stops scrolling and is inert,
`Escape` and the backdrop close it (both refusable). `[pctAutofocus]` names the element
focus should land on first.

```html
<pct-dialog [(open)]="confirming" heading="Delete the draft?">…</pct-dialog>
```

### Tooltip

A description on hover and focus, written as an attribute on the element it describes. By
default it feeds `aria-describedby` — a **description**, not a name — because a name that
comes and goes with the pointer is a name a reader cannot rely on.

```html
<button pctTooltip="Saves without publishing">Save draft</button>
```

### Popover

An anchored, non-modal panel — a dialog minus the veil. The page keeps working, the tab
order stays with the trigger, and `Escape` returns focus where it came from.

```html
<button [pctPopoverTrigger]="panel">Filters</button> <pct-popover #panel heading="Filters">…</pct-popover>
```

### Menu

An action list on the ARIA menu pattern: focus really moves through the items, the arrows
walk it, and a press runs the action and closes the panel. Items are the consumer's
`<button pctMenuItem>` elements, so a disabled one carries the native attribute.

```html
<button [pctMenuTrigger]="actions">More…</button>
<pct-menu #actions>
  <button pctMenuItem (click)="rename()">Rename</button>
  <button pctMenuItem (click)="remove()">Delete</button>
</pct-menu>
```

### Toast

Messages arrive in a `role="log"` region the page carries from the start — `<pct-toast-viewport>`
once in the shell, `PctToaster.show()` anywhere. A message with an action or marked urgent
has no duration at all: nothing a user must act on is allowed to expire.

```ts
this.toaster.show('Draft saved.');
this.toaster.show({ text: 'Message deleted.', action: { label: 'Undo', run: () => this.undo() } });
```

### Tabs

The strip is drawn from labels the panels hand up; a `<pct-tab>` **is** its panel, written
where the content belongs. A panel nobody chose is hidden with `hidden="until-found"`, so
the browser's find-in-page still searches it and reveals it.

```html
<pct-tabs [(value)]="section" ariaLabel="Settings">
  <pct-tab value="general" label="General">…</pct-tab>
  <pct-tab value="network" label="Network">…</pct-tab>
</pct-tabs>
```

### Accordion

A `<details>`/`<summary>` disclosure — the press, the announced state, find-in-page and the
tab order are the platform's. `exclusive` on the group is one shared `name` attribute, with
no code behind it; a real heading (`headingLevel`) is written inside the summary.

```html
<pct-accordion exclusive>
  <pct-accordion-item label="Shipping">…</pct-accordion-item>
  <pct-accordion-item label="Returns">…</pct-accordion-item>
</pct-accordion>
```

### Drawer

A docked panel that is a **region of the page, not a layer over it**: drawn where you write
it, in the page's own tab order, theme and direction. Shut, it is `hidden="until-found"`. A
side sheet that takes the whole page over is `pct-dialog`, not a drawer mode.

```html
<button [pctDrawerTrigger]="filters">Filters</button> <pct-drawer #filters heading="Filters" side="end">…</pct-drawer>
```

### Pagination

A `navigation` landmark of plain buttons. `page` is a model, `count` is a number of pages,
and a press **emits rather than navigates** — a pager built on links takes its page from the
router and is a different component. The strip folds around the current page with pinned
ends.

```html
<pct-pagination [(page)]="page" [count]="pageCount" />
```

### Progress

A real `<progress>` element under the library's paint, so the role, the bounds and the value
are the platform's — and a bar with no `value` reaches the accessibility tree with no value
at all, which is what indeterminate means. The name is yours, through `ariaLabel` or
`ariaLabelledby`.

```html
<pct-progress [value]="uploaded" [max]="total" ariaLabel="Upload" /> <pct-progress ariaLabel="Loading" /><!-- no value: indeterminate -->
```

### Skeleton

A placeholder that stands where meaning has not arrived and says nothing: `aria-hidden`, no
role, no text. The wait itself belongs on the **region** — put `aria-busy` on the element
whose content is loading. Lines are `1lh` of your own type, so the layout does not move when
the answer lands.

```html
<article [attr.aria-busy]="loading() ? 'true' : null">
  @if (loading()) {
  <pct-skeleton [lines]="3" />
  } @else { … }
</article>
```

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

## Icons

The library ships **no icon set** — it ships the swap. Every icon a component draws sits inside
`<pct-icon>` under a semantic name (`chevron-down`, `check`, `indeterminate`), and the drawing
written there is what you see if you register nothing.

An icon set is a **component whose templates are the icons**:

```ts
import { PctIconTemplate, providePctIcons } from '@pacit/components/icon';

@Component({
  imports: [PctIconTemplate],
  template: `
    <ng-template pctIcon="chevron-down"><i class="pi pi-chevron-down"></i></ng-template>
    <ng-template pctIcon="check"><i class="pi pi-check"></i></ng-template>
  `,
})
export class AppIcons {}

bootstrapApplication(App, { providers: [providePctIcons(AppIcons)] });
```

The names you supply are replaced, the rest keep the library's drawing. The name is checked by
the compiler — a misspelt one is a build error with the right name suggested — and
`providePctIcons` works in a component's `providers` too, so one section can use a different
set from the rest of the application.

Anything renders: an `<svg>`, an `<i>` of an icon font, an `<img>`. What the component keeps is
the **box**: its size, its colour (the drawing should paint itself in `currentColor`) and any
state it shows there — the select's arrow turns on opening whoever drew it. `<pct-icon>` is
usable on its own as well, for a one-off drawing of your own that needs no name.

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
keyboard map of each component is written down and tested.

A change nobody is pointed at is announced, and from one place: the library keeps **two** live
regions for the whole document — one `polite`, one `assertive` — instead of one per component.
They carry what has no element on the screen to speak from; a validation message announces from
the text you can read (`role="alert"`), not from a hidden copy of itself. Your application may
use the same channel:

```ts
import { PctAnnouncer } from '@pacit/components/core';

private readonly announcer = inject(PctAnnouncer);

this.announcer.announce('Draft saved');                 // polite, waits its turn
this.announcer.announce('Connection lost', 'assertive'); // interrupts
this.announcer.retract('Draft saved');                   // lets it be said again
```

A channel does not repeat what it is already saying, so the same sentence twice is one
announcement — and has to be withdrawn before it can be announced afresh. The regions are opened
by the first render (nothing is rendered on the server) and hide themselves, so there is no
stylesheet to include for them.

Where a pattern has a known limit, the
limit is in that component's page under
[docs/components/](https://github.com/pacit/components/blob/main/docs/components/README.md)
rather than left for you to discover.

## Support

Which Angular majors a release supports, how long a line keeps getting fixes once it is no
longer the newest, and how many minor releases an API stays deprecated before it may be
removed — all four numbers are in the
[support policy](https://github.com/pacit/components/blob/main/docs/support.md). They are
kept there and nowhere else on purpose: a gate reads them out of that page and requires the
Angular window to equal the one the peer ranges above admit, so the promise and the package
cannot drift apart.

One of them is worth knowing before you install: **every breaking change ships an `ng update`
migration**, and that is enforced rather than intended — a breaking commit with no entry in
the migration collection fails the build.

```bash
ng update @pacit/components
```

## Documentation

- [Support policy](https://github.com/pacit/components/blob/main/docs/support.md) — versions,
  deprecation notice, codemods
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
