# 0027 — A slot is a directive of its own, not a name in a string

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-api-generic`](../requirements/api.md#req-api-generic)
**Evidence:** [`lesson-84`](../lessons.md#lesson-84) — four probes under `strictTemplates`,
each a deliberately wrong binding that either breaks the build or does not; plus the count of
`TemplateRef`s a host sees with an `@if` in its content, off and on

## Context

The plan's D5 asks for "`*pctTemplate` / `TemplateRef`", and
[`req-api-templates`](../requirements/api.md#req-api-templates) promises both: projection with
`<ng-content select="…">`, which already works, and templates passed as `TemplateRef` or
through a `*pctTemplate` directive, of which **nothing exists** — `TemplateRef` appeared
nowhere in the library, so a select's option could not be drawn by the application at all.

Two consumers were counted before anything was written, the reading D2, D3 and D4 all came out
of ([0024](0024-the-closing-stack-is-the-dependency-s.md),
[0025](0025-a-panel-says-whether-it-takes-focus.md),
[0026](0026-one-channel-per-politeness.md)): the select's option row, which this requirement
names as its own binding trigger, and the icons of [0011](0011-icons.md), which the plan puts
one item later and which the requirement calls "the simplest icon-swap mechanism". Both are
real, so the layer is not a guess about a second variant.

**What the plan offered as one thing turned out to be two checks, and no one shape gives
both.** A template a consumer writes has two ways to be wrong: called by a name the component
does not read, and handed a context the template misreads. Measured — the table is in
[`lesson-84`](../lessons.md#lesson-84) — an attribute is invisible to the compiler in every
form it can take (misspelt, left out of `imports`, structural or not), while a context guard
types `let-option` only when the context type is fully known, and a directive with no input has
no inference site, so its generic is instantiated as `any`.

That is what settles it against the shape most libraries ship. `*pctTemplate="'option'"` puts
the name inside a string, where nothing reads it, and one directive serving many names has
nowhere to put a context guard per name — it gives up **both** halves at once, and looks from
the outside exactly like a mechanism that gives both.

## Decision

**A slot is a directive of its own, named for what it fills, with a context guard and a
required input that carries the type.**

```html
<pct-select [options]="countries" [(value)]="country">
  <ng-template [pctSelectOption]="countries" let-option let-selected="selected">
    <span>{{ option.label }}</span>
    <code>{{ option.value }}</code>
    @if (selected) {
    <small>chosen</small>
    }
  </ng-template>
</pct-select>
```

Three consequences follow from that one sentence:

1. **The context is typed**, because the input is the inference site the guard needs. The list
   is bound a second time and read by nothing at runtime; that repetition is the price of
   `let-option` being an option rather than `any`.
2. **The correctly spelt name cannot be left dangling**, because the input is
   `input.required` — `<ng-template pctSelectOption>` with no binding is `NG8008` at build
   time rather than a template that renders nowhere.
3. **A slot standing where nothing reads it says so**, under `isDevMode()`, through the element
   injector: the component provides `PCT_TEMPLATE_HOST` naming the slots it offers, and a slot
   that resolves nothing — or resolves a component offering other slots — reports itself.

**The component keeps what the role owns.** A slot replaces what is _inside_ the option row,
never the row: `role="option"`, the id `aria-activedescendant` names, `aria-selected`, the
disabled state and the whole key map stay with `pct-select`, because they are the listbox
pattern and not decoration ([`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)).

## What this costs us

- **The misspelling stays silent, and we say so rather than pretend otherwise.**
  `<ng-template pctSelectOptoin>` matches no directive, so there is no instance to report
  anything. The obvious repair is measured shut: an `@if` in projected content is itself a
  `TemplateRef` — one with the condition false, two with it true, every anchor an identical
  `<!--container-->` — so "templates present minus slots claimed" accuses a consumer who merely
  wrapped a correct slot in a conditional. That is
  [`lesson-68`](../lessons.md#lesson-68)'s defect: a message that fires on a page that is
  right. A check that cannot exist is better named than faked.
- **A directive per slot is a class per slot**, and every one of them is public API under the
  same rigour as [`req-api-parts`](../requirements/api.md#req-api-parts): once published, a
  slot's name cannot change without a migration.
- **The type carrier reads as duplication.** A consumer binding a different list of the same
  type to `[pctSelectOption]` changes nothing but the type, and nothing warns — it is an
  inference site, not data.
- **`<ng-content>` is untouched.** Projection stays the mechanism for content a component
  merely places (the chrome's prefix, suffix and label aux); slots are for content a component
  _renders per item_. Two mechanisms is two things to document, and the line between them is
  "does the component call it more than once".

## Alternatives considered

| alternative                                                     | why rejected                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `*pctTemplate="'option'"` — one directive, the name in a string | gives up both checks: the name is invisible to the compiler and one directive has nowhere to put a context guard per name |
| A `TemplateRef` input (`[optionTemplate]="ref"`)                | checks the name (NG8002) and nothing else — `#ref` is `TemplateRef<any>`, so the template's body is unchecked             |
| A slot directive with no input, guard only                      | the generic has no inference site, so Angular instantiates it as `any`; the guard is decoration                           |
| A non-generic context (`PctSelectOption<unknown>`)              | leaves `option.value` unknown — the one field a rich row exists to render                                                 |
| The host counting its content templates                         | measured shut: control flow in the content is a `TemplateRef` too, so the report accuses correct markup                   |
