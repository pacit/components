# 0087 — A warning is a verdict without a veto, and it is metadata the form does not grade

**Status:** accepted
**Implements:** [`req-api-warning`](../requirements/api.md#req-api-warning),
[`req-api-message`](../requirements/api.md#req-api-message),
[`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-texts`](../requirements/api.md#req-api-texts)
**Evidence:** a probe of seven cases over the installed platform (`@angular/forms` 22.2.1,
`@angular/core` 22.2.1, vitest 4.1.11), run through `components:test` on 2026-10-06 and not
kept in the repository — its cases are written to land as the specs of the implementation —
quoted in the "Measurement" section below with the one flipped expectation that made the run
red; and four readings of the platform's own compiled code at that version, each named where
it is used

## Context

The question came in as one sentence: beside the validators that make a field invalid, a form
wants validators that **do not** — a value that is allowed and suspicious at once. An amount
ten times the usual, an e-mail whose domain is one letter off, a date in the past, a phone the
record would rather have. Today an application chooses between blocking and silence, and the
chrome offers it the hint, which has no severity, no glyph and no word for a reader.

The platform has no such thing. In `@angular/forms/signals` every `ValidationError` a validator
returns makes the field `invalid()`, and `submit()` runs its action only over `!invalid`
(`shouldRunAction`, read in the compiled chunk) — so a warning written as an error with a
softer `kind` is a veto all the same: `aria-invalid` on the control, the action withheld, the
form red. What the platform does have is **metadata**: `createMetadataKey`,
`createManagedMetadataKey` and `metadata(path, key, logic)` — the channel `required`, `min` and
`max` are themselves built on. A per-field reactive fact, reduced over every rule that writes
it, read as `state.metadata(KEY)`, and consulted by `valid()` never. And a _managed_ key runs
its `create(state, data)` once per field, inside
`runInInjectionContext(node.structure.injector, …)` (`runMetadataCreateLifecycle`) — which is
how the platform's own `validateAsync` creates a `resource` per field. A `form()` wants nothing
more than that injector.

[0070](0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md) named the next
channel without opening it: "nobody has asked for it". Somebody has. Carbon's `warn` sets a face
by hand on the control; Ant Design's `warningOnly` is a severity on a rule, graded by that
library's form as non-blocking — what this record would take from Angular if Angular had it,
and Angular's own forms have no such channel at all.

## Decision

**A warning is a verdict without a veto, and the form carries it as metadata it does not
grade.**

1. **One verb, two shapes, both the platform's.** `pctWarn(path, …)` in
   `@pacit/components/core` takes what `validate()` takes — a logic function
   `(ctx) => ValidationResult` — or what `apply()` takes — a `Schema` from `schema()`. The
   validator an application wrote for `validate()` goes to `pctWarn()` unchanged, and the
   platform's own validators go in as a schema:

   ```ts
   required(p.email); // an error: the field is invalid
   pctWarn(p.phone, schema(required)); // a warning: the field is valid, the line says so
   pctWarn(p.amount, big); // the same function `validate(p.amount, big)` would take
   pctWarn(
     p.amount,
     schema((a) => {
       min(a, 100);
     }),
   );
   ```

   The two shapes are told apart at run time by `typeof`: a `Schema` is an object, a validator
   is a function. A bare schema function in the second place is a type error, not a guess.

2. **The logic form is metadata on the real form; the schema form is a shadow form over the
   field's value.** `PCT_WARNINGS` is a managed key whose reducer concatenates results.
   `pctWarn(path, fn)` is `metadata(path, PCT_WARNINGS, fn)`, so `fn` runs in the real field's
   context and reads `valueOf(p.start)` like any validator. `pctWarn(path, schema)` writes the
   schema to a second, private list key — and an empty rule to `PCT_WARNINGS`, because a
   managed key is created only on a node that has a rule for it — and when the field's node
   is created `create` builds
   `form(linkedSignal(() => state.value()), schema)` for each — in the node's own injection
   context, so the platform grades the shadow and the shadow's `errorSummary()` is read into
   the same list. A field nobody warned has no key and no shadow. The shadow dies with the
   node: an array item removed destroys the node's injector, and the shadow's effects with it.

   _Amended 2026-10-07: the last sentence is half true, and the measured half stands under
   "What this costs us" — the node's injector and the shadow's management effect go, the
   shadow's own node injectors do not._

3. **Reading it is the platform's reading.** `f.amount().metadata(PCT_WARNINGS)()` anywhere.
   On the bound element a control injects `FORM_FIELD` (`self`, optional) and reads
   `state().metadata(PCT_WARNINGS)` — through one helper in `core`, called in each control
   beside `errors` — and `warnings` is also an input, so an application with no signal form,
   or with a sentence of its own, hands the list in the way it hands `errors`. The contract
   `PctFieldControl` gains `warnings`, optional like `ownErrors`.

   _Amended 2026-10-07: **the input is `warnings`, the contract member is `fieldWarnings`, and
   the helper is `pctFieldWarnings`.** One name cannot be both: the input has to be able to
   say nothing — it is `undefined` until a template binds it, and `undefined` is what sends the
   control to its own `[formField]` — while the member the chrome reads has to be the list
   itself, resolved. So a control declares `warnings = input(undefined)` and
   `fieldWarnings = pctFieldWarnings(this.warnings)`, and the chrome reads `fieldWarnings`.
   A bound `[]` is an answer and not an absence: an application with a sentence of its own, or
   none, says so and the form's list is not read behind it._

**On the screen.** The one message line ([0022](0022-one-message-line.md)) ranks: the
control's own error (0070), the form's error once touched, **the warning once touched**, the
hint. A warning is drawn in the `warning` tone's two channels
([0076](0076-a-tone-is-two-channels-and-four-names.md)): the colour on the line and on the
border (`--pct-field-fg-warning`, `--pct-field-border-warning`, both `var(--pct-warning)`),
and the drawing — `pct-icon name="warning"` — before the text. For a reader, a visually hidden
word from `PCT_TEXTS` (`fieldWarning`, default `Warning:`) opens the sentence, because ARIA
has no property for a warning and `aria-invalid` stays where it is: `null`. The line is
`role="status"` — polite, where the error is `alert`
([0026](0026-one-channel-per-politeness.md)) — and its id goes into `aria-describedby` exactly
while it is on the screen. The host carries `data-pct-warning`; `data-pct-invalid` is
untouched. The three controls that draw their own footers — checkbox, radio group, select —
draw the same third branch of the same conditional.

_Amended 2026-10-07: **six footers, not three, and the tone paints the surface, never the
mark.** The switch, the slider and the date field draw a footer of their own too — counted in
the templates, not remembered — and `req-api-message` holds every one of them to the same
line, so all six take the branch, each with its own `fg-warning` token as each has its
`fg-invalid`. Where the control standing alone draws a field surface — the select's trigger,
the date's row — that border takes `border-warning` as the chrome's does. A checkbox's box, a
radio's ring, a switch's track and a slider's thumb are marks and keep their colour: a warning
is no fault of the control, and the line with its glyph and its word is the tone's whole say
there. Ten tokens in all, each measured against its surface in the contrast policy._

**The gate is the same.** `touched`, like the form's error. `submit()` marks the form touched,
so an attempt lights every warning along with every error — and then runs, because nothing
vetoed it.

## Measurement

Seven cases, built from the public API only — two keys, a reducer, `form()` inside `create`,
a directive beside `[formField]` — on `@angular/forms` 22.2.1. Each sentence is a set of
`expect`s that passed, and the run went red (1 failed, 6 passed) when `invalid()` was
asserted the other way in the first case:

1. One validator, `validate(p.start, big)` and `pctWarn(p.amount, big)`: `start` has `errors`
   `['big']` and is `invalid`; `amount` has `errors` `[]`, `invalid` `false`, `valid` `true`
   and `metadata(PCT_WARNINGS)` `['big']`; the root's `errorSummary()` is `['big']` — the
   warning is not in it; a field nobody warned has no key (`undefined`); the warning leaves
   when the value moves to 5.
2. `submit()` ran its action over a warning (`true`, once) and withheld it over a `required`
   error (`false`, still once).
3. `pctWarn(p.phone, schema(required))` gives `['required']` with `valid()` true and no
   `REQUIRED` metadata on the real field; the `min` schema gives `['min']`, `valid()` true and
   **no `min` on the real field** — while `min(p.start, 100)` writes `100` to its own; both
   clear with the value.
4. Two `pctWarn` on one path both hold, each speaking for its own value (`['big']` at 20 000,
   `['min']` at 50 — never both at once; a pair that can is for the landing spec); a logic
   warning on `end` reads `valueOf(p.start)` of the real form and clears when `start` moves.
5. `applyEach(p.items, (item) => pctWarn(item, schema(…max(i, 10)…)))`: `[1, 20]` gives `[]`
   and `['max']`; a third item gets a shadow of its own (`create` ran once more); removing two
   items destroyed two node injectors (`DestroyRef` fired twice) once the application was
   stable.
6. `validateAsync` inside a warning schema: `[]` before the resource settles, `['taken']`
   after, `valid()` true, `pending()` false; `[]` again on a free value.
7. A directive beside `[formField]` on an `<input>`, injecting `FORM_FIELD` with `self`, reads
   `['taken']` live and `[]` after the model moves; the input carries no `aria-invalid`.

Four readings of the compiled platform at 22.2.1: `runMetadataCreateLifecycle` calls
`key.create(node, computed(…))` inside
`untracked(() => runInInjectionContext(node.structure.injector, …))`; `submit()` runs its
action on `!untracked(node.invalid)` unless `ignoreValidators` says otherwise; `schema(fn)`
returns a `SchemaImpl` instance, so `typeof` tells it from a function; `[formField]` provides
`FORM_FIELD` with `useExisting`.

## Consequences

- The application writes `required(p.email)` for an error and `pctWarn(p.email,
schema(required))` for a warning, and a validator of its own is one function either way.
  Cross-field warnings take the logic form, because a shadow sees the warned path alone.
- A warning that is `required`, `min` or `max` writes nothing to the native control — no
  `required` attribute, no `min`, no `REQUIRED` metadata, measured — which is right: a value
  under a warning is allowed.
- `pctFieldMessages` grows `warningText` and `showWarning`; the chrome and three footers grow
  a branch — six, by the amendment under "On the screen". `check-aria` point 6 keeps holding
  hint and error as alternatives, and the warning joins the same conditional.
- A warning is announced from where it is drawn (0026), politely.
  _Amended 2026-10-08: the first reading says less. On the pass dispatched after landing,
  NVDA and VoiceOver read the warned fields with label, role and hint, and neither heard the
  `status` line at the stop after it entered the DOM. The error's `alert` on the same view is
  the comparison, and it is uneven: Orca heard it in both readings and leaves `main` there,
  never arriving at the warned stops; VoiceOver's 09-16 reading heard it and its 10-08 reading
  did not; NVDA's log carries it in neither. So the `status` line has one reading each on two
  stacks and no reading at all on the third — held open as a finding until the weekly pass
  reads the view again, and a decision if the silence holds._

## What this costs us

- **Bytes, in three places, measured at landing by `check-bundle`:** `./core` for `pctWarn`,
  two keys and `create`; `./field` for the branch, the attribute and the icon — the chrome
  takes `./icon` as a dependency for the first time, the chunk fourteen entrypoints share
  already;
  every control for the input and the read; and one `PctTexts` key on every entrypoint, ~29 B
  each by 0070's measurement.
  _Amended 2026-10-07, read off `size.snapshot.md`:_ `./core` 8945 → 9706 B; `./field`
  28524 → 36650 B, ~8 KB of it the icon chunk and `@angular/common` behind it; the same
  chunk is new to `./radio`, `./slider` and `./switch`, which grow by the same ~8 KB each
  for a glyph in a footer, while `./checkbox`, `./select` and `./date`, which had it, grow by
  2.3, 3.8 and 2.6 KB; and every entrypoint that takes `./core` carries ~200 B more in the
  probe, which is the import statement of `@angular/forms/signals` kept as an external — in an application the
  bundler drops it, because the two keys are created under `@__PURE__` and nothing else in
  `./core` reads the module. Without those two comments the key, its builder and `form()`
  behind it were kept in a button-only application: 456 B of this library and the platform's
  form machinery, on every entrypoint ([`lesson-253`](../lessons.md#lesson-253)).
- **A shadow is a second field tree.** `pctWarn(path, schema)` builds a form per schema per
  field instance — per array item under `applyEach` — over the same value. For a leaf that is
  one node; for an object path it is the subtree. The logic form costs a computed and nothing
  else.
- **A shadow's own injector outlives the item — measured, not what this record first wrote.**
  _Amended 2026-10-07._ The real node's injector is destroyed with the item, and with it the
  shadow's management effect; but a shadow node's injector is `Injector.create({ parent })`
  in the compiled chunk and an `R3Injector` does not destroy its children, so an async rule's
  resource inside a shadow stays registered until the page goes
  (`warnings.spec.ts › an item of a list gets a shadow of its own`, `destroyed` 0 where the
  probe's `create` counted the real nodes). The platform's own `validateAsync` on a form
  whose component is destroyed behaves the same way. Sync rules are computeds nobody reads
  any more; an async warning under `applyEach` is a dormant resource per removed item.
- **A shadow's errors point at the shadow.** `errorSummary()` carries `fieldTree`, and that is
  the shadow's field, not the form's; a consumer following it lands on the same value in a
  tree nobody binds. The chrome reads `kind` and `message` and follows nothing.
- **A schema sees its own subtree.** `valueOf` inside `pctWarn(p.end, schema(…))` cannot reach
  `p.start`; the sentence that needs both is a logic warning.
- **A predicate around a schema warning is read once.** `applyWhen` wraps every rule, but
  the list of schemas is read untracked when the node is made: a predicate that moves later
  adds no shadow and removes none. A condition that moves goes inside the schema, where
  `applyWhen` is the platform's and live, or on the logic form, which is live too.
- **Pending is not surfaced.** An async warning is simply absent until it settles; the
  shadow's `pending()` is readable and nothing in the chrome reads it.
- **`touched` gates a warning as it gates an error.** A record loaded with a suspicious amount
  is quiet until the user leaves the field or submits; an application that wants the sentence
  sooner reads `metadata(PCT_WARNINGS)` itself.
- **Two pairs close to the line.** `--pct-warning` is amber-700 on the light theme and
  amber-400 on the dark; the nearest reading is 0082's 4.51:1 on the dark soft face's hover
  tint. The line's and the border's pairs are measured at landing, and the token moves before
  the line ships below AA.

## What it does not decide

- A summary of warnings over the whole form — the platform's `errorSummary` has no sibling
  for metadata. The per-field read is enough for a "submit anyway?" that knows its fields; a
  walker is a decision when a consumer asks for one.
- Whether the error line takes the same glyph. It carries `alert` and `aria-invalid` and has
  never needed one; the question is a decision of its own.
- `ownWarnings`, a control's own warning beside `ownErrors`. No control has one.
- The site's say: a demo under `/field` and the card's row land with the code.

## Alternatives considered

- **A warning as an error with a softer `kind`, filtered by the chrome.** The form grades it:
  `invalid()` true, `aria-invalid` on the control, `submit()` withheld — the second half of
  case 2. The word "warning" would be a lie the platform tells back.
- **A second form the application writes over the same model.** It works today and doubles
  the application's schema; the chrome cannot see it, and it answers nothing about `required`
  and `min` as warnings.
- **The hint as the carrier.** No severity, no tone, no word for a reader — and the hint gives
  way to an error, so the warning would vanish exactly when the user is fixing the value.
- **Re-implementing the seven standard checks for warnings.** A second copy of the platform's
  empty, `NaN` and date semantics, drifting on the platform's next minor; the shadow keeps the
  platform's own and takes any schema, async included.
- **Asking the platform for a severity.** Angular's validators have no such option in 22, and
  metadata is the extension point its own validators stand on. A `severity` upstream would
  supersede this record, which is what a record is for.
