# Negative control of the texts gate

Deliberately defective inputs. `tools/check-texts.mjs` runs all six of its points on each
of them and **requires every one to be rejected — and rejected by the rule it declares**.
An input that passes is a fault; an input that fires somewhere other than where its
`fixture.json` says is a fault just the same, because it proves something other than what
it declares.

A `fixture.json` here **always** carries the pair `check` + `rule`, not the point alone.
That is straight from [`lesson-50`](../../docs/lessons.md#lesson-50): a gate's
point is not one sentence. Measured on this gate — disarming nine of the twenty-nine rules
moves their cases onto a **neighbouring rule in the same point**, and without that field
all nine runs would be green. Where a rule names what it found, a case may also hold a
`message`: a phrase the refusal has to carry.

A case that pins a message pins one its refusal carries, so none of them proves that comparison is
made: a runner that stopped comparing would pass them all. [`_runner.json`](_runner.json) holds it.
Through [`runner-control.mjs`](../runner-control.mjs) the runner plays
`a-name-standing-for-a-class-nobody-exports` once more, pinned to what
`a-name-another-entrypoint-holds` says of `./other` under the same rule, and has to report it, and
nothing of the case with its own message. The control is played apart from the cases and counts as
none. The same control holds the runner's other rules, which no case proves either, since every case
is built to be refused on its own — a case that passed, a case that fired another check and a case
that fired another rule: it plays the case over `_reference`, which the gate passes; with `check`
set to `denominator`; with `rule` set to `class-without-sources`, and has to report each.

The reason it exists is the same as for every other gate
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
Here it guards a promise that breaks exceptionally quietly: text added to a template
compiles, passes the tests, passes an axe audit and looks right in every screenshot. It
turns red only at a consumer who has translated their application and gets one English
sentence in the middle of it — while the review showed a correct template.

## How a case is built

A case is not one more copy of the correct input with a single thing broken. The gate
builds it from three layers:

1. a copy of `_reference/` — the reference input, which **must pass**;
2. the case directory's files on top of it;
3. the removals from `fixture.json` (the `drop` key).

That way the case directory holds **nothing but its own defect** and the diff shows exactly
the one thing at issue. The reference input is checked separately and first: were it
defective itself, every case would fire because of it rather than because of its own —
that is, this whole control would become what it stands against.

The sources sit here as `*.ts.txt` and become `*.ts` only in a temporary directory. A `.ts`
file in `tools/` belongs to no compiler program, so it would fire `check-typecheck` — one
gate's fixture may not be another's defect.

## What these cases do NOT exercise

The reading from the built package arrives as data (`package.json`) rather than from a real
Angular build — the same choice as in `check-parts` and `check-zoneless` and for the same
reason: a build for each of the seventy-odd cases would cost minutes, and the gate runs on
every commit. Most cases give a class's static attributes as pairs, and the code reading
`ɵcmp.consts` and `ɵdir.hostAttrs` is not exercised by them.

A class may instead carry the declaration ngc writes for it in partial mode (`declaration`: its
selector, `host` and template, measured against the full declaration ngc wrote), which the gate
compiles through JIT and reads with the code the package goes through: `consts` placed by the
instructions taking each array (`CONSTS_AT`), then the pairs (`attributesOf`, over
`static-attributes.mjs`). The reference's `PctWidget` is one, compiled to the DOM-only
instructions, its template holding a local reference on every node that takes one, a `@defer`
block's timings and blocks with an attributes array of their own — a read that takes a reference
for attributes, or cannot place an array, refuses the reference.
`a-title-after-a-namespaced-attribute` carries one with a directive among its dependencies, so its
template compiles to the full instructions, and a read that stopped at the namespace marker lost
the title after it, and `a-title-sharing-its-array-with-a-reference` one whose empty `title` is the
array a local reference takes too, which a read placing it as the reference alone lost. A class
may also give the two arrays themselves, as a package compiled in full
carries them, with no declaration to compile: `attribute-from-spread` gives `hostAttrs`, so that a
read losing the host's half fails a case too, and `a-component-compiled-in-full` gives `consts`,
which no instruction places. A case handing over the pairs could have shown none of them.

What the cases do exercise is how the package's classes are told apart. Each entry of
`package.json` is one class — one object — and `exports` lists the names it is exported under
where that is not its own name once (a re-export from another entrypoint, a second name, a
name that is not its own); the gate turns the entries into one record per exported name, in the order a module
namespace gives (each entrypoint's names sorted, none twice), as the package read does, and
groups them by object with the same code the live run uses. The
reference exports `PctBlank` a second time, as `PctBare`, a name that comes before its own, and `PctMarker` under `PctMark`
alone, and passes.

## The walk's own denominator

Two rules of point 1 hold the walk to the template's tree, and each has a case. Every method of
the compiler's visitor counts the node it is handed (`seen`), and not only the methods
`TemplateScanner` writes: eight of the thirty-one counted nothing — those of an `@boundary` and
its `@error` blocks, of the groups of an `@switch` and its `never`, of a `@defer` block's
triggers, of a `@content` block and of the selectorless `Component` and `Directive` — so
`unknown-node`, which this README once called unreachable for want of a new kind, was unreachable
for want of a count. The reference holds a node of every kind `KNOWN_NODES` lists but the ICU,
which `icu-in-template` holds, its `@boundary` among them, so that a kind taken off the list
refuses one of the two, and `text-in-an-error-block` shows the sentence an `@error` block says
read.

- `content-block-in-a-template` — `denominator/unknown-node`: a `@content` block, which the
  parser makes with no flag and `ngc` refuses outside a foreign component (`NG8026`). The kind is
  left out of the list: the library has no foreign component, and what one draws of the block is
  its render function's, which no reading here follows.
- `content-block-with-variables` — `denominator/unreached-node`: the same block with variables,
  which the compiler's visitor does not hand on. The gate finds the tree a second time, over
  every node's fields (`nodesOf`), and refuses a node the walk was never handed before it asks a
  kind: what is never reached is never checked. The marker draws a template of its own in both
  cases, so that each refusal counts and names one template of two. What the visitor leaves and
  draws nothing, the walk passes over and reads nothing of, each measured on Angular 22.2.1
  through JIT and a render in jsdom: an `<ng-content>`'s attributes, an inline template's own
  bindings, written and bound (`text-under-an-inline-template`), and the `never` of an
  exhaustive `@switch`. It passes over what an ICU holds as well, which is drawn, because point 3
  refuses the ICU whole (`icu-in-template`).

Not held: `Component` and `Directive` are made only under `enableSelectorless`, which this gate's
parse leaves off as `ngc` does by default, so no input brings one; a library that switched it on
in `ngc` alone would still be read with it off — a `<Widget>` as an element, a `@Marker(…)` as an
animation binding beside attributes or as a parse error point 1 refuses, none of them the
selectorless reading.

## What a template prints

Point 3 reads what reaches the screen from a template — a text node, a speaking attribute, a
property that draws its value, an expression printed into any of them — as far as it is drawn, each
shape below measured on Angular 22.2.1 through JIT and a render in jsdom, and in Chromium 152 where
jsdom draws nothing.

An expression draws the literals that can be its value, and no other (`ExpressionLiterals`): a
conditional's branches and not its condition, both operands of `+`, `??` and `||` and the right one
of `&&`, an item or an entry a read takes out of an array or a map, what a call is called on and what
it is handed, and a pipe's input. A comparison, arithmetic, `!`, `typeof`, `void` and a sign give a
number or a boolean, a key is no value of the read it keys, and the left of `&&` is its value only
when it is falsy, which no string with a letter is: `{{ state() === 'open' ? '*' : '' }}` draws `*`,
and no refusal.

A call is read whole, a method of the class's as any other: the code it calls may return what it is
handed, and no read here follows the code — `format('Delete')` draws `<Delete>`, `upper(item)` of an
item over `['Delete']` draws `DELETE`, and an outlet draws the template `pick(t)` returns, with the
context it is handed. A first version of this read took a method of the class for code that draws
nothing, and passed all three, which main refused (the review, measured). So
`@for (o of sortBy(options(), 'label'))` is refused, as on main: the key belongs in the class
(`sortedOptions()`), which is the one way the read could tell it from a word.

- `literal-in-a-value-position` — a conditional's branches, the operators' values and a regular
  expression, which draws its source between slashes, eight refusals.
- `literal-through-a-read-or-a-call` — an array's item, read and read optionally, a map's entry, a
  string's own method, an array's method handed a separator, called and called optionally, a
  method of the class handed a sentence, and `$any`'s argument, which the compiler takes off as no
  call, eight.
- `literal-in-a-drawn-property` — the properties that draw their value as any element's content
  (`DRAWN_PROPERTIES`), eight refusals: `textContent` bound, bound by `bind-` and interpolated,
  `innerText`, `outerText`, `innerHTML` and `outerHTML`, the last two through the sanitizer, and
  `innerHtml`, which the compiler sets as `innerHTML` (`getMappedPropName`). The name is the
  property's, in its case — `[TEXTCONTENT]` sets nothing (NG0303) — and `[attr.textContent]` writes
  an attribute, both of which the reference holds.
- `literal-in-a-property-an-element-draws` — the properties that draw their value on the elements
  that have them (`DRAWN_ON`): an `<a>`'s and an `<option>`'s `text`, a `<textarea>`'s and an
  `<output>`'s `value` and `defaultValue`; and an `<iframe>`'s `srcdoc` and a search field's
  `defaultValue`, which writes the value it shows, eight.
- `literal-in-a-text-field-value`, `speaking-attribute-an-element-draws` — what an element draws
  of an attribute, bound and written: an `<input>`'s `value` and an `<iframe>`'s `srcdoc`, the
  document it draws. Chromium shows the value of a field of no type, of a type it does not know, of
  a text, search, telephone, URL or e-mail field and of an image button with no `alt` or `title`, as
  it shows a button's label: a field draws it but for the types that show none of it
  (`VALUELESS_INPUTS`: `hidden`, `checkbox`, `radio`, `password`, which masks it, and the types that
  keep no word of it). The type is the one written, alone; a second one or one a binding sets
  leaves it to the render, a text field until it says otherwise (`type="checkbox"` beside `[type]`,
  `type="hidden" type="text"`). Read on a button's alone, as it was, the value passed all ten.
- `text-around-an-interpolation`, `speaking-attribute-around-an-interpolation` — the words an
  interpolation writes around its expressions, in a text node, in a speaking attribute and in a
  drawn property. The parser makes them the interpolation's `strings`, which the expression visitor
  never hands on, and point 3 read none of them before. A text node's are its text, the expressions
  standing in as `{{…}}`, and a binding's are read beside the written attributes and not compared
  by point 2: no static attribute, they reach the package in the template function.

The reference holds the literals in no position of a value — each operator's operands
(`size() === 'sm'`, `items().length - 'sm'`, …), the operand of `!`, `typeof`, `void` and a sign, a
condition, the left of `&&` and a key — and the values no element draws: an `<input>`'s of each type
in `VALUELESS_INPUTS`, written, one set as a default too, and one an `*ngIf` wraps inside an
`<output>`, read under its own tag and not its parent's; and an `<option>`'s, which shows its text.
And the words an interpolation writes in a `class` beside an outlet, which hand the variable of that
name alone: taken whole, they were the row's `let-item`. A read taking any of them for a word drawn
refuses it. The library's printed expressions hold two
literals, neither with a letter, both in a value's position; it binds no drawn property and writes
no value of a text field, and its 77 interpolations write no word around their expressions.

Not held: a pipe's arguments, read as format markers (`date: 'short'`), no read here knowing which
pipe a name is, where `i18nSelect` and `i18nPlural` draw the map they are handed (measured); a map's
keys, which `keyvalue` and `json` draw (`{ Delete: 1 } | keyvalue`, measured), and which no read
takes for a value — a context's keys (`$implicit`, `label`) would all be refused; and a `host`
block's bindings, read apart, every literal of a speaking binding (`literals`), so that a comparison
there is refused and `'[textContent]'` is read for nothing; and an `<option>`'s value in a
`<datalist>`, which the field it lists for suggests (measured), read nowhere. Read whole and
refused: a tagged
template; markup handed to `innerHTML`, whose tags are letters as well (`'<hr>'`); a literal a member
is read off (`'Delete'.length`); an argument the code takes for a key or a locale
(`sortBy(options(), 'label')`, `toLocaleDateString('en-US')`); and an image button's value beside
an `alt`, which it then does not show.

## A name stands for what binds it

A literal in an expression no point reads is drawn wherever a name it is handed to is printed —
`@let m = 'Delete'` and `{{ m }}` draw what `{{ 'Delete' }}` draws (measured on Angular 22.2.1
through JIT and a render in jsdom, each shape below). Point 3 follows the name:
`template/literal-through-a-name` reads a name printed — in an interpolation, a speaking binding or
a drawn property — as what binds it, the literals that can be its value, as the point reads a
printed expression (`ExpressionLiterals`). The name is resolved by the compiler's own binder (`R3TargetBinder`), so it is the one `ngc` reads in that
scope, and `{{ this.m }}` beside a `@let m` reads the class's member, as it draws it.

The decision, and what it is not. Refusing a lettered literal wherever an expression binds a name
would refuse a correct library: its block headers hold 21 literals, every one a comparison or an
`@case` value (`@if (half === 'day')`), and `@let narrow = size() === 'sm'` holds a boolean, which
draws no word wherever it is read. A shape test like point 4's `isProse` passes `'close'`, and in a template it
is position that decides — a name carries a literal to its position. Followed, the library's 14
printed reads of a template's name reach no literal with a letter.

- `literal-through-a-let`, `literal-through-an-if-alias`, `literal-through-a-loop-item` — a
  `@let`'s value, an `@if` branch's condition through `as m`, a `@for` block's collection through
  its item.
- `literal-through-an-inline-ngif`, `literal-through-an-inline-ngfor`,
  `literal-through-a-template-input`, `literal-through-a-written-template-input` — a template's
  variable stands for the literals handed to the template, as the compiler hands the directives on
  it what it matches them by: an inline template its own bindings (`*ngIf="… as m"`,
  `*ngFor="let x of …"`) and not the attributes of its element, which it carries hoisted — the
  `class` beside `*ngFor` is one refusal fewer — and an `<ng-template>` its attributes and its
  property and two-way bindings (`[ngIf]`, `ngIf` written, and `[(value)]` in
  `literal-through-a-two-way-binding`).
- What a directive puts under which key of the context no read here knows, so a variable takes a
  binding by the key it reads (`take`) where the binding says it, and whole where it does not. A
  map literal written in the binding gives the entry under the key, or the whole map where the
  variable reads the binding's own name or the implicit value and the map writes no such key
  (`literal-through-a-map-an-ngif-holds`: `*ngIf="{ … } as vm"`, `[ngIf]="{ … }" let-vm`). Any
  other binding — a map a name holds (`literal-through-a-context-a-name-holds`), a spread, a call,
  an array — is taken whole by every variable. A written attribute hands the variable of its name
  alone, so a slot's name beside it (`pctWidgetSlot="row"`) is no value of `m`.
- `literal-through-an-outlet-context`, `literal-through-a-then-template`,
  `literal-through-an-outlet-to-a-listbox-row`, `literal-through-a-spread-context` — and the
  literals every node hands it whose binding stands for the template: an outlet beside its context,
  an `*ngIf` with a `then`. A map literal is a context as an outlet takes it — the row's
  `let-label` takes the implicit entry and not `part: 'option'` — unless a spread, which may hold
  any key, writes over a default (`{ label: '', ...row }`). A variable stands for no template, or every element reading
  one — the row's `[attr.aria-posinset]="i + 1"` — would be one more node handing the template,
  its `class` and `role` with it.
- `literal-through-a-tree-an-outlet-draws`, `literal-through-a-name-bound-after-its-template` — what
  every name stands for is found once per template, the least sets that hold what each binding
  gives under the sets found so far: a tree a template draws of itself hands its variable back to
  it, a name may be read before the `@let` handing it is declared, and a read following each name
  anew grew with the factorial of the variables a template reads (ten `let v = index` read in
  bindings: 58 s, measured; forty now take 14 ms). The tree's outer outlet is an element, whose
  `class` hands no variable of that name and whose `class.` binding no directive.
- `literal-through-a-name-in-a-speaking-binding` — the same read in `[attr.aria-label]` and
  `[title]`, two refusals, on a button an `*ngIf` wraps. The inline template carries its element's
  attributes and bindings hoisted, the same objects, and the walk is handed each twice; it reads
  each once, as `speaking-attribute-under-an-inline-template` holds of a written `title` and of a
  submit `<input>`'s `value`, which only the visit with its element can tell speaks.
- `literal-through-a-name-in-a-drawn-property` — the same read in `[textContent]` and
  `[innerHTML]`, and in `[(textContent)]` and a `<textarea>`'s `[(value)]`, which set the property
  as a one-way binding does, four refusals.
- `literal-through-a-name-a-call-reads` — a method of the string a `@let` holds (`m.trim()`), a
  function a `@let` holds, called (`@let f = (count) => 'Delete ' + count`), a loop's item handed to
  a method of the class (`upper(x)`), and a template handed to one whose result an outlet draws
  (`pick(t)`), four refusals: a call gives what it is handed, names and templates among them.
- `literal-through-an-interpolated-template-input` — `ngIf="Delete {{ … }} rows"` handed to
  `let-m="ngIf"`: an interpolation's value is its words as much as its expressions, two refusals.

The reference holds the names that stand for no such literal: a `@let` holding `*`, a loop's
`$index` (the block's own variables are its numbers and booleans) beside an item over `['sm', 'md']`
read in a comparison alone, a `@let` read as a condition, a `@let` holding a template, and a
template's variable nothing hands a word while the nodes around it are handed some — a read that
took every node for one handing the template, the index for the collection, or a template for a
string, refuses it — and, read in no position of a value, a `@let` holding a comparison, printed
and read as a condition.

A binding no map literal writes is taken whole by every variable: `let i = index` of
`*ngFor="let size of ['sm', 'md']"` printed is refused, where `@for`'s `$index` is not. Which key a
directive files its input under is the directive's code — `NgForOf`'s item under `$implicit`, its
position under `index` — and a variable that took no binding but the one its key names would lose a
context a name holds (`literal-through-a-context-a-name-holds`), whose keys only the map knows.

Not held: a context the class hands a template (`createEmbeddedView(tpl, { $implicit: 'Delete' })`),
which no template read sees; a template a component takes as content and draws with a context of
its own (`<pct-list [items]="['Delete']"><ng-template let-x>`); a literal an outlet's context hands a
template from outside the file, a consumer's slot among them, which may print it or not; a template
handed in a context and drawn by an outlet through a variable (`[ngTemplateOutlet]="m.next"`),
since a variable stands for no template; a written attribute a directive files under a key other
than its name — `ngIf="Delete" let-m` passes, a written attribute handing only the variable of its
name, and so does `ngIf="Delete {{ n }}" let-m`, an interpolation being one; an `<ng-template>` inside an `<svg>` (`:svg:ng-template`), whose directives the compiler
matches by its inline bindings alone, as `handedTo` does, and which JIT draws all the same; a reference to a directive (`#c="pctCell"`), whose target the binder gives as nothing with no
directive matched; and a reference to an element, which stands for nothing — a read of its members
gives the DOM's state, any attribute of it among them (`{{ r.dataset.label }}`).
