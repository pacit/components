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

## A name stands for what binds it

A literal in an expression no point reads is drawn wherever a name it is handed to is printed —
`@let m = 'Delete'` and `{{ m }}` draw what `{{ 'Delete' }}` draws (measured on Angular 22.2.1
through JIT and a render in jsdom, each shape below). Point 3 follows the name:
`template/literal-through-a-name` reads a name in an interpolation or a speaking binding as what
binds it, every literal of it, as the point reads every literal of a printed expression. The name
is resolved by the compiler's own binder (`R3TargetBinder`), so it is the one `ngc` reads in that
scope, and `{{ this.m }}` beside a `@let m` reads the class's member, as it draws it.

The decision, and what it is not. Refusing a lettered literal wherever an expression binds a name
would refuse a correct library: its block headers hold 21 literals, every one a comparison or an
`@case` value (`@if (half === 'day')`), and `@let narrow = size() === 'sm'` read as a condition
alone draws no word. A shape test like point 4's `isProse` passes `'close'`, and in a template it
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

The reference holds the names that stand for no such literal: a `@let` holding `*`, a loop's
`$index` (the block's own variables are its numbers and booleans) beside an item over `['sm', 'md']`
read in a comparison alone, a `@let` read as a condition, a `@let` holding a template, and a
template's variable nothing hands a word while the nodes around it are handed some — a read that
took every node for one handing the template, the index for the collection, or a template for a
string, refuses it.

What a name stands for is every literal of what binds it, as point 3 reads a printed expression:
`@let open = state() === 'open'` printed through `{{ open ? … : … }}` is refused as
`{{ state() === 'open' ? … : … }}` is, and so is a literal handed to a call
(`@for (o of sortBy(options(), 'label'))`). The comparison belongs in a block's condition, which
draws nothing. And a binding no map literal writes is taken whole by every variable: `let i = index`
of `*ngFor="let size of ['sm', 'md']"` printed is refused, where `@for`'s `$index` is not.

Not held: a context the class hands a template (`createEmbeddedView(tpl, { $implicit: 'Delete' })`),
which no template read sees; a template a component takes as content and draws with a context of
its own (`<pct-list [items]="['Delete']"><ng-template let-x>`); a literal an outlet's context hands a
template from outside the file, a consumer's slot among them, which may print it or not; a template
handed in a context and drawn by an outlet through a variable (`[ngTemplateOutlet]="m.next"`),
since a variable stands for no template; a written attribute a directive files under a key other
than its name — `ngIf="Delete" let-m` passes, a written attribute handing only the variable of its
name; an `<ng-template>` inside an `<svg>` (`:svg:ng-template`), whose directives the compiler
matches by its inline bindings alone, as `handedTo` does, and which JIT draws all the same; a reference to a directive (`#c="pctCell"`), whose target the binder gives as nothing with no
directive matched; and a reference to an element, which stands for nothing — a read of its members
gives the DOM's state, any attribute of it among them (`{{ r.dataset.label }}`). Beside names, a
property binding that draws its value as text (`[textContent]`, `[innerHTML]`) is no printed
position of point 3, with a literal or a name.
