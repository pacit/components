# Work plan — task list

> **This file is written by hand.** It is the only place allowed to hold "done / in progress /
> to do".
>
> It does not duplicate the [registry](registry.md): the registry is generated and says **which
> promises have no gate**; this file says **in what order we close them and what has already
> gone through**. When the two disagree the registry wins — it is derived from the
> documentation, this is a list written by hand.

## How to use it

**At the start of a session** — check whether the plan has lied:

```bash
node tools/check-docs.mjs
```

It prints the current counts (`enforced / partial / gap`). If they disagree with
[State](#state), fix that section before starting anything else.

**At the end of a session** — tick the tasks off. A task turns `[x]` only once it meets the
definition of done.

### Definition of done

Straight from [`req-axis`](00-axis.md): a promise without a gate is unfinished, and a gate
without proof that it can fail is unfinished one floor up. A task is `[x]` when:

1. the gate exists and **runs in CI** (`nx affected -t …` in `.github/workflows/ci.yml`),
2. it has a **negative control** — a test or a recorded run proving it can **fail**,
3. the requirement in [`requirements/`](requirements/) has its **Gate** and **Control** fields
   updated,
4. `node tools/check-docs.mjs --write` has rewritten the registry and the entry is gone from
   the gap list.

Point 4 is the only hard proof; the first three without it are a declaration.

### Notation

| mark  | meaning                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------- |
| `[ ]` | not started                                                                                       |
| `[~]` | in progress — the note says **what it ended with**, so it can be resumed without reading the code |
| `[x]` | closed per the definition above                                                                   |
| `[-]` | deliberately dropped — the requirement then gets `none — deliberately: <reason>`                  |

## State

Snapshot, `node tools/check-docs.mjs`:

| measure                                     | value |
| ------------------------------------------- | ----: |
| requirements                                |    86 |
| ✅ enforced                                 |    64 |
| 🟡 partial (deliberately without a control) |    15 |
| ⛔ gap                                      |     7 |

All 7 gaps have an owner below (B, F, G) — **D holds none any more**. If adding a requirement raises the gap count
and no task changes, this list has stopped being complete — and that is a fault of this list,
not of the registry.

## Order

```
B  release readiness        binds at the first publication
C  open findings            small, good filler between the bigger items
D  behaviour layer in core  blocks E
E  components               dialog → tooltip/popover → menu → select → fields → rest → table
F  trust surface            docs, ACR, benchmarks, Figma bridge
G  gaps with no deadline    waiting for the trigger written in their "Binds at" field
```

**The next milestone is not a release but the first push to the public repository** (B2), and
the rule for it is settled: nothing leaves in a second language — not the sandbox, not a
comment, not a fixture value. **B8 has closed, so that is now a measurement and not a
declaration** — both limbs run, the register of exceptions is empty, and the run that closed
it found three survivors in a repository three passes had declared clean. **B9 has closed
too**, and with the same shape: the clear-out went with a gate, so what a public repository
should never have carried is now measured on every push rather than tidied once. **Nothing
stands between here and B2 any more** — the task itself is minutes, and it is the last one
whose price is paid before a first visitor arrives, not after. Of B, **B3 has closed as well**,
so the npm page is written and the last file that travelled in a second language is gone.
**B6 and B7 have closed too** — the support window with a gate reading its numbers, and the
dependency lists with a gate reading the artefact — so **what stands between here and npm is
B4 alone, and B4 is held with B2**. In parallel: F1 is unblocked — the inventories it renders
both exist. **D2, D3, D4, D5, D6 and D7 have closed, so D is empty — and E1 has closed with
them**, taking **C19** with it: the finding bound at E1, and E1 is where the select's second
Escape owner stopped being cosmetic. **E2 has closed too, in two halves that
asked different questions.** The tooltip settled the one the item was named for — "describes vs
names" turned out to be two different relations rather than two ways of writing one, and the
measurement that says so is of the state nobody audits, the **closed** one
([`lesson-92`](lessons.md#lesson-92),
[0030](decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md)). It also brought
the first real enter/leave here, and with it the third shared thing the plan had not foreseen:
placement, extracted at the moment the second role needed it rather than after. The popover
then asked the question a panel with no content and no focus could not: **where does Tab go
when the panel is not modal?** An overlay is a child of `body`, so the DOM's answer is "out of
the page" — the panel's tab order is spliced back onto its trigger
([0031](decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)), and the road not taken
is written down beside it, because `focusout` cannot tell focus going nowhere from a **window**
losing it. It left two lessons of the kind that cost an afternoon each: a dismissal delivered
in the capture phase, before the press it _is_, so the one control that opens a panel could
never shut it ([`lesson-93`](lessons.md#lesson-93)); and a registration put in an `effect`
because its partner is an input, which loops for ever the moment a second consumer registers —
a unit run that never ends rather than an error ([`lesson-94`](lessons.md#lesson-94)).
**E3 has closed after it**, and it is the item where a promise `core` had deliberately left open
came due. D1 wrote down that wrapping at the ends is exactly the kind of thing one consumer
cannot judge; the menu arrived with the opposite answer to the listbox's, so the edge became a
parameter of the shared walk rather than a second copy of it — with one distinction the obvious
version would have lost, between a movement that ends **at** the end and one that runs **past**
it. The larger thing it settled is a fork this library now has two live examples of: **a menu
moves focus and a listbox points at it**
([0032](decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)), each road with a bill
already paid here. And two defects a browser reports and no test here was asking for: a row's
stylesheet that never reached the row, because projected content keeps the encapsulation of the
template that declared it ([`lesson-96`](lessons.md#lesson-96)), and a disabled command that
would have said so and run anyway, because a directive's host listener is registered after the
consumer's own ([`lesson-95`](lessons.md#lesson-95)). C, the
filler, is down to **C20**, left behind by D4, and **C21**, left behind by D6; both are held by
their own **binds at** — C20 at E5, C21 at the next language-gate task. E3 left a third behind,
and it is about this repository's own machinery rather than its components: **C22**, the two
gates that take seventeen and ten minutes, sharing one CI job on half the cores this was
measured on. E4 has since added three more — **C23**, **C24** and **C25** — so the filler has
six items and every one of them is held by a **binds at** rather than by anybody's mood.
Filtering has since added **C26** and **C27**, both of them about the mutation run: what its
snapshot cannot say, and a guard whose promise no test here can notice. Clearing added none of its own
and instead handed **C22** a second file — the same run that reads `motion.ts`
five points low under load reads `placement.ts` nine points low, so what that item describes is
a property of every clock-kill here rather than of one file's three. Async added **C28**, the
empty listbox nobody had audited, and the window added **C29** — which is about this
repository's own machinery rather than about a component: a size snapshot written from a build
nx had cached, so the baseline that exists to notice eighteen bytes was itself eighteen bytes
out. **C20 has since closed**, at the item its own "binds at" named, and the switch added two
more: **C30**, an attribute the checkbox has been writing to itself since v0, and **C32**, the
npm page's entrypoint table drifting behind the package with nothing reading it. It also added
**C31**, which was not a promise without a gate at all but **three** gates already red on a
clean `HEAD` — and **C31 has closed too**, on the one decision the three of them needed: the
vendored skills lockfile is repository material and the tree it locks is not
([0040](decisions/0040-a-lockfile-is-material-the-tree-it-locks-is-not.md)). Two of the three
answered to the git index and the third to the working tree, which is the half that survived
untracking; and by the time the item ran, the reach gate had already gone green by itself,
because the entry describing the unreached tree named it
([`lesson-113`](lessons.md#lesson-113)). **C29 has closed as well**, at the textarea, which is
the first snapshot in this repository written from a build the writing run produced — and it
left the gates their first shared module, because the property is about writing a record and
not about bundles. The finding the textarea was expected to leave is **not** there — a plain
`<textarea pctText>` keeps the browser's `resize: both`, and a frame it could be dragged out of
would have been an item, but the control column is a flex line with `min-width: 0` and a width
written onto the element moves nothing in any of the three engines. The one it did leave is
about this repository's own machinery: **C33**, the mutation run measuring 22 of the 36 source
files, with two lists guarding the denominator against narrowing and nothing at all watching
that it was never widened. It also moved a count that had not moved in a while:
**`req-api-platform` stops being partial**. Its control had been "none — deliberately", on the
true observation that a navigation test has no mode in which it passes without a keyboard — and
the layout half added by 0041 is nothing like that, because a fallback CAN quietly agree with
nothing. Five recorded runs say so, and they fail in different engines on purpose.

**E7 has opened with the toast, and it is the item where a prediction this plan had carried
since D4 turned out to be wrong twice.** 0026 wrote that the assertive channel's "first callers
are the toast and the dialog"; neither is one, and both for 0026's **own** reason — a message
with a place on the screen announces from that place. So a toast is drawn inside a live region
rather than duplicated into a hidden one, and the correction is a document rather than a
silence ([0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md),
**C37**). What 0026 got right is the half the component is built on, and it decided the
lifecycle: a region entering the document with its text is a region nobody has registered, so a
render opens the viewport **empty**. The role was then settled by chromium's own accessibility
tree against the reflex — `role="status"` publishes `atomic=true` and re-reads the whole stack
on every arrival, `role="log"` publishes `polite`, `atomic=false`, `relevant="additions text"`
**with no attribute of ours at all**, and urgency becomes a property of the message
(`role="alert"` nested inside publishes `assertive` for itself while the log stays polite).
That is [0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) read a
fourth time and the first time it has decided a role. The afternoon's real finding is one floor
below every component here: **a `z-index` cannot get above the top layer**, because the CDK
renders its overlays inside a shown popover — the stack sat under a dialog's veil at 1100
against a container declaring 1000, and 99999 changed nothing
([`lesson-122`](lessons.md#lesson-122)). The viewport is a `popover="manual"` shown again per
message, since the top layer orders by recency; a closed popover's live region is **absent**
from the accessibility tree, which is the same discipline arriving from a third direction, and
so is `inert`, measured now rather than quoted — which is why `PctModalBackground` had to learn
the live **roles** and not just the attribute. The other measurement worth keeping is about a
clock: **focus removed with its element lands on `body`** in three engines, so a control that
expires under a keyboard user takes their place on the page with it
([`lesson-121`](lessons.md#lesson-121)) — the type refuses a `duration` to any message carrying
an action, and nothing expires while a pointer or focus is in the stack. It left **C36**, **C37**
and **C38** behind, and gave **C33** two more files.

**E5 has closed, all four items of it, and the fourth is the one where the platform's own
control was refused on three measurements rather than one.** `<input type="date">` takes the
order it shows a date in from `lang` in chromium, from the browser's locale in webkit and
from **neither** in firefox — three engines, three sources, exactly one of them settable — so
an application in Polish shows `12/01/2026` to two users in three and cannot say otherwise.
Beside that, a half-typed date reads `value === ''` in all three with `validity.badInput`
false in webkit, which is `req-api-number`'s complaint arriving a second time, and one control
is four tab stops in two engines and one in the third. What the value is settled itself:
`new Date(2026, 7, 27).toISOString()` is the **26th** in Warsaw, so a `Date` cannot hold a
calendar day, and `Temporal.PlainDate` — which is exactly the right type — is absent from
webkit, so it cannot be a public one either. The value is the string both of them serialise
to ([0043](decisions/0043-a-day-is-not-an-instant.md)). Two things nobody asks about until a
user does came with it: `Intl` resolves **`th-TH` to the buddhist calendar** in all three
engines, so a field and its grid would disagree about the year unless the calendar is pinned;
and `getWeekInfo()` is absent from firefox, so the first day of the week is 80 regions written
down with the platform's own CLDR as their gate. That gate is also this step's sharpest
lesson: written the obvious way it compared the platform with a function whose first line
asks the platform, and it was green with the table emptied
([`lesson-120`](lessons.md#lesson-120)). The step left **C34** behind — a control that knows
its text is not a date and has no channel to say so — and gave **C33** four more files.

**E5's third item, the slider, is the first here where a decision written before the code was
wrong about a browser** — and the interesting part is that it was wrong in the safest-looking
way. 0042 rested its whole drawing on C1, "a range carries generated content in all three
engines", measured by reading `getComputedStyle(el, '::before').content` — which reports the
DECLARATION and not the rendering. Sampled by pixel, it renders in **one** engine of three,
and where it does it paints over the thumb ([`lesson-118`](lessons.md#lesson-118)). The road
that replaced it was refused earlier for taste and taken now for arithmetic: a gradient's
direction is physical, so the pseudo-element road needed a rule reading the direction and the
drawn-box road needs none. The same step read
[0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) twice more, and
both times the accessibility tree answered: `aria-orientation` is derived from the writing
mode and ignored when it disagrees, and `aria-required` never reaches a range's node at all —
with a textbox in the same run reporting `required: true`, which is what makes it a
measurement rather than a missing field. It also found the one thing four gates and a compiler
had never said out loud: **the forms interop writes `null` into a model typed `number`**
before it writes the value ([`lesson-117`](lessons.md#lesson-117)). It left **C33** a third
file and no item of its own.

**E4 has closed, all eight items of it**, and the first of them is the fork the rest
stand on: **is an option a row of data or a `<pct-option>` the consumer projects?** Written as
two ways of putting down one list it reads as taste, so it was measured before anything was
built — and the projected road **works**, which is what makes this a decision rather than a
refusal: content projects into the overlay template, survives a close and a reopen without
rebuilding, and a row's label is readable while the panel has never been attached. What it
costs is the two things already promised here. The type, because **the compiler relates no two
elements of a template**: `<pct-option [value]="1">` beside `[value]="'pl'"` compiles silently
where the same pair in an array literal is TS2322, and the parent's own `contentChildren` hands
back `any` — the shape that looks like more checking has less
([`lesson-97`](lessons.md#lesson-97)). And the count, because projected rows are built by the
**consumer's** loop: a thousand options are a thousand component instances with the panel never
opened, which is E4's own last item — virtualisation is a promise about how many rows exist,
and only whoever creates them can make it ([`lesson-98`](lessons.md#lesson-98),
[0033](decisions/0033-an-option-is-a-row-of-data.md)). So every item left in E4 is a question
about the data, and the first of them shipped with the decision: **groups**. A heading is a
shape in the same array, `role="group"` named by the very element the eye reads — and the one
wrapper ARIA allows between a listbox and its options, which the audit of an **open** grouped
panel is what says. The rest of the list stays one list: the numbering, the arrows, `Home`/`End`
and the typed prefix all cross the headings, because a heading is something the user reads and
not somewhere the user can be. It left one finding behind, in C20's own family: **C23**, the
group relation that no static gate reads. The second item settled the fork the whole family's
API rests on: **is `multiple` an input or a tag?** Written as an input it cannot decide what
`value` is — the compiler relates no input to another's type — so one component serving both
shapes types `T | T[] | null`, which **accepts an array nobody asked for and breaks the
single-choice consumer's own handler**: fifteen bindings say so, and the reason the wrong
values pass in silence is that a two-way binding's write-back is not checked at all
([`lesson-99`](lessons.md#lesson-99)). So multiplicity is a tag
([0034](decisions/0034-multiplicity-is-a-tag.md)) over **one** implementation — one template,
one stylesheet, and the first base class this library has allowed, for a reason narrow enough
to write down: Angular declares an input only as a field on the class the tag resolves to, so
composition would have moved the plumbing and left the fifteen declarations. It cost two gates
their sight (`check-aria`, `check-texts` — both read one class body,
[`lesson-100`](lessons.md#lesson-100)) and left two findings: **C24**, one template compiled
twice in the artefact, and **C25**, the inheritance taught to the gates that fired and to none
of the rest.

**The fourth item is filtering, and it is the first fork this plan settled with a rule it
already had.** 0034 said a tag is what the **type** cannot say otherwise; filtering changes no
type, so it is an input on both tags — as a tag it would have made four of them for two
questions. What does carry the defects is the pair of things a text trigger holds at once: the
answer, and the question being typed. Every filtering select that misbehaves conflates them, so
the rule is one sentence and the implementation is a reading of it — **the question narrows the
panel, never the value, and it does not outlive the panel it was asked in**
([0035](decisions/0035-a-filter-is-a-question-not-a-value.md)). The trigger changes **element**
with the role, `<button>` to `<input>`, and the key map splits with it: the caret takes back
the letters, the space bar and `Home`/`End`, which is `req-api-platform` applied to a control
that has now borrowed a real field. Two lessons of the kind that are cheaper to read than to
find: an accent is not a formatting detail but a question of language, and the platform's own
answer differs per locale on one pair of letters ([`lesson-101`](lessons.md#lesson-101)); and a
`#ref` declared inside an `@if` cannot be seen from outside it, which is why the panel's origin
is now an element rather than a directive's export ([`lesson-103`](lessons.md#lesson-103)). It
cost `check-aria` its arithmetic — two named elements were a violation by counting, and two
branches of one conditional are not two names for one control — and it closed the last two
coverage exceptions in the repository, on a reason that turned out never to have been true
([`lesson-102`](lessons.md#lesson-102)).

**The fifth item is clearing, and it is the one whose every fork was answered from outside this
repository.** Where the cross goes was answered by the parser: a `<button>` may hold no
interactive content, and that is not a validator's opinion — the HTML parser closes the open
button when the second one starts, the DOM API keeps the nesting, and Angular's own template
parser reports nothing at all, so the same template is two trees depending on who read it and
the place they meet is server rendering ([`lesson-104`](lessons.md#lesson-104)). Whether it is a
tab stop was answered by the platform, measured in three engines: the only clear control a
browser draws by itself is in `<input type="search">`, and it is in **no** engine's tab order,
with Escape as the keyboard's road to the same thing. And what it clears was answered by 0035
read once more — the trigger holds the answer and the question at once, so **the cross takes
back what the trigger is showing**
([0036](decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)), which decides when it is
drawn at all. The step's own defect came from the gate that had no business being involved: the
wrapper the cross needed moved nothing measurable — same x, same width, same height to three
decimals — and a visual baseline went red on 309 pixels, because `position: relative` makes a
paint layer and the text inside one loses its subpixel antialiasing
([`lesson-105`](lessons.md#lesson-105)). "Nothing moved" and "nothing changed" are two
measurements, which is the argument for keeping both kinds of gate.

**The sixth is async and the eighth is the window, and between them they say what this family
was really about.** `loading` is a fact about the LIST rather than about the control
([0037](decisions/0037-loading-is-a-fact-about-the-list.md)) — it takes nothing away, and the
empty panel says a third sentence because "no options" and "no matches" are conclusions a
request in flight has reached neither of. Its own sharpest measurement came from a gate expected
to be a formality: a `role="listbox"` owning no `role="option"` is a **critical** violation, and
`aria-busy` is the specification's own way of saying "not yet"
([`lesson-106`](lessons.md#lesson-106)). It also taught the walk that **a cursor names an entry,
not a position** ([`lesson-107`](lessons.md#lesson-107)), and left **C28** behind — the panel of
a genuinely empty list, which four axe cases over this component had never opened.

Then the window, and it answers the question this component's card had carried since v0: five
thousand options are **626 ms and 5,000 elements** drawn whole, **15 ms and 11** windowed. Every
fork was settled by a browser
([0038](decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)): the listbox
stays the element that scrolls, because the exemption keeping a panel of unfocusable rows out of
`scrollable-region-focusable` is written for a combobox's own popup — which is what refused the
CDK's viewport; the space the undrawn rows would have taken is a **pseudo-element**, because
padding does not scroll and any spacer is a child the listbox does not own; and the row's height
is measured rather than declared, twice over, since `offsetHeight` rounds
([`lesson-108`](lessons.md#lesson-108)) and an exact reading is still not a stable one
([`lesson-111`](lessons.md#lesson-111)). The finding worth keeping past this component is what a
window OWES a reader that no gate will ask for: `aria-setsize` and `aria-posinset` have no axe
rule at all, so a windowed listbox that says neither is green in the audit and lies about how
long the list is — the recorded control says exactly that. And one repair was **deleted by its
own control** rather than confirmed, which is the plan's own rule doing work nobody expected of
it ([`lesson-109`](lessons.md#lesson-109)).

**E5 has opened, and its first item is the switch.** What it settled is a rule wider than the
component: **write ARIA for what the element does not already say, and check which of the two
you are doing before you write it**
([0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)). `role="switch"`
declares `aria-checked` a required state, `PctCheckbox` one directory over writes it on every
render, and on a native `<input type="checkbox">` the attribute is **inert** — Chromium's own
accessibility tree reports a checked box carrying `aria-checked="false"` as checked, and every
engine's reading agrees. So the switch writes none, and the interesting half is what that says
about a gate: an attribute that cannot be wrong is one whose drift nothing measures — not the
unit case that reads back what it wrote, not axe, which has no rule for it, not a reader, which
never looked ([`lesson-112`](lessons.md#lesson-112)). The same probe settled the element with no
preference needed (the role on a `<button>` is a **critical** `aria-required-attr` in three
engines) and refused the third state to the **type** rather than to a gate, because
`aria-checked="mixed"` over the role is green everywhere and a gate would have had nothing to
read. It also closed **C20** on the way past, on the narrow reading of the two the item left
open: the error part IS the live region, `role="alert"`, measured over every template of the
library.

**The textarea closed after it, and it is the same rule met one floor down: not behaviour this
time, but a LAYOUT.** `PctText` has served `textarea[pctText]` since v0, so the item's whole
content was a height — and the fork was settled by a browser before a line was written.
`field-sizing: content` is in chromium 149 and webkit 26.5 and **absent from firefox 151**,
where the absence is silent and total, so the height is the platform's where the platform has
one and a measurement where it has not
([0041](decisions/0041-a-height-the-platform-computes.md)). What makes that a decision rather
than a shrug is that **the two roads are made to agree**: the sheet gives the CSS road back the
`rows` the property discards, the script adds back the border `scrollHeight` leaves out, and
one set of assertions is run over both in three engines. The road most libraries ship was
refused by a measurement — **a `<textarea>` renders no generated content in any engine**, so
the replicated-text trick needs a wrapper and a wrapper costs the native element. The sharpest
half is what a fallback has to be TOLD that layout hears for free: a value written with no
event at all, where `patchValue` reaches the DOM through `writeValue` and dispatches nothing;
and a width that rewrapped the text, where nothing announces anything. The first cost
[`lesson-114`](lessons.md#lesson-114) — `NgControl.valueChanges` is `null` for the whole of a
sibling directive's constructor, so the obvious wiring is a subscription to nothing and the
optional chaining turns an ordering bug into a **no-op rather than an error**. The second cost
[`lesson-115`](lessons.md#lesson-115), and it was found by the poorest environment in the
matrix rather than by a browser: jsdom has no `ResizeObserver`, and built first the observer
took the subscription and the first fit down with it. A third came from the gate rather than
from the code: an element baseline went red on a panel that had not changed at all, because
what moved was its `top` onto a fractional pixel and an element screenshot is a crop of a
raster rather than a measurement of a box ([`lesson-116`](lessons.md#lesson-116)). It closed **C29** on the way past, at the
item its own "binds at" named — and that item produced the **first shared module among the
gates**, because "a record is written from what this run produced" is a property of writing a
snapshot rather than of any one gate.

**B2 is deferred by decision, not blocked** — and the decision has a shape: **the first push
happens only when the maintainer asks for it outright.** It is not triggered by a state of the
repository, by a green run or by B2 standing next in this order; a session that reaches it
**skips it and takes the next item**, and so does anything whose price is a remote (B4's links,
provenance, remote CI). The reason is the premiere: everything the first visitor sees becomes
the product at that second, and "the list says it was next" is not a reason to spend that
once-only moment.

So the work went on into D: **D1 has closed**, and the walk over a list now stands in `core`
before the second control that needs it rather than after the fourth. What it left behind is a
new finding of the C kind — **C9**, the metric that sees neither a template's conditions nor
their absence.

Then back to the rule above, taken literally: **B3 is the next item after B2, and its price is
not a remote**, so the session that skipped B2 took it. It closed, and it proved the skip rule
does not exempt a task from being read carefully — the file B3 was written to replace was
reachable only through the sentence in this plan that described it, so ticking the task off
without a second thought would have deleted the reader of the page it produced.

The same rule carried on to **B6**, which closed as well and cost the plan a decision it had
left open: a support policy is numbers, and there were none to copy. They are written down as
the honest ones rather than the generous ones — **`support-months` is 0**, because a backport
promise costs a second CI matrix and a maintainer on somebody else's timetable, and a zero
that holds is worth more than a six that does not. Each row says what it becomes at 1.0. The
task also produced [`lesson-63`](lessons.md#lesson-63): this is the first gate here whose
input is git rather than files, and a cached one would answer from before the amendment that
added the `!`.

And on to **B7**, which closed and moved the question the plan had written down. The task was
"the declared lists against an allowed list", and the declared list is the one place a
dependency added by reflex does not touch — `npm i` writes the name into the root manifest and
the import into a source file, and the library's manifest never learns of it. So the point
measures the closure in both directions over the artefact, and the first thing that fell out
of doing so is [`lesson-64`](lessons.md#lesson-64): the published manifest declares a runtime
dependency (`tslib`) that no file in this repository declares — ng-packagr writes it, with
Angular's range. The promise was amended rather than the package: **a document that describes
an artefact nobody measured describes what somebody meant.**

With B exhausted — B2 held on a sentence, B4 held with it — the order handed the session to
**C**, and **C1 has closed**. The finding named one component and the rule written for it
found three: `pct-checkbox` and `pct-radio` carry the same shape as the select, a role one
level down and a host with none. Why none of the three had been caught is the part worth
keeping in view ([`lesson-65`](lessons.md#lesson-65)): **the axe audit reads the sandbox's
DOM, and in the sandbox every control is given a label** — so the one configuration in which
the promise fails is the one no page renders.

**C2 closed after it**, and it moved the finding it was written from. The plan offered
`track $index` **or** a uniqueness promise with a warning under `isDevMode()`, as two roads to
one place; they do different work. Tracking decides which DOM node a row reuses, uniqueness
decides which option a value denotes — so the cheap road on its own would have taken away
NG0955, the only thing that had ever spoken about a duplicated value, and left the defect
where it was, now silent ([`lesson-66`](lessons.md#lesson-66)). Both were done. The same
promise turned out to have no owner one component over: **C10**, where the radio group cannot
even see the values of its own options — and the size gate, fired by a comment written into a
template, produced **C11** and [`lesson-67`](lessons.md#lesson-67): a template travels to the
artefact as a string, so prose for a maintainer is bytes, while the same prose in TypeScript
is free.

**C3 closed next**, and it repeated C2's shape one component over: the finding asked for a
`console.warn` when a second control registers with a field chrome, and written that way the
message would have fired on a page that is entirely correct — a control inside an `@if` is
destroyed and built again, and its second construction calls `attach` exactly as a second
control would. The contract had only the half that speaks, so **`detach` came first and the
message second** ([`lesson-68`](lessons.md#lesson-68)), and the pair closed a defect the
finding had not named: the chrome was reading the state of a control that had left the DOM.

**C4 closed after them**, and it is the third finding in a row whose "either/or" turned out to
be a question about where a check lives rather than which of two roads to take: the argument
for keeping a generated Sass file was that `@use` would make a misspelt token a compile error,
and the measurement showed the gate already catches such a typo — but only where a **colour**
is painted ([`lesson-69`](lessons.md#lesson-69)). So the file went and the check stayed, as a
point of the token gate; the reason for dropping is recorded as "no reader", not "never"
([0018](decisions/0018-no-sass-entry-point.md)).

**C7 closed with it**, and there the question was settled by reading the promise literally:
`req-api-parts-unique` says a container's parts carry a prefix of **their own**, not "the parts
that would collide" — so the code was out of line, not the requirement. `options` became
`group-options`, and the rule became point 6 of `check-parts`, which needs no list of container
components: a component that disagrees with itself is visible in the inventory. That promise
had stood on two e2e cardinality assertions until now, that is on the pages we happen to
render.

**C6 closed after it**, the second decision-shaped finding in a row, and its question — do
primitives belong to the public surface? — turned out to have two answers rather than one:
a colour has a semantic tier above it and a scale has none, so the ramps are the skin's
implementation while `--pct-space-3` and `--pct-control-height-md` are the only name a shared
metric has ([0019](decisions/0019-primitives-are-not-the-contract.md)). The drift is gone,
the union is three names smaller, and the measurement left **C12** behind: two primitives that
nothing references at all, in the one tier where no gate would have said so.

**C8 closed after it** and broke the run of decision-shaped findings: this one was a plain
defect in the code, and the measurement widened it from one sheet to five. `@media` adds no
specificity, so a rule of forced-colors mode beats the base sheet by its own selector alone —
and in two sheets it did not, leaving a disabled checkbox and radio with a theme surface and
an active option with a theme background. In three more the result was right for the wrong
reason, decided by base rules that know nothing of the mode. What hid all of it is the mode
itself: chromium and firefox substitute the colours whichever rule won, so the screenshot and
the axe audit agree either way, and webkit — the one engine that would show it — runs none of
`forced-colors.spec.ts`, excluded there by a policy that is right for its own reasons
([`lesson-70`](lessons.md#lesson-70)). The defect had no runner anywhere, so the rule had to
be a static one: point 7 of `check-styles`, and `req-a11y-forced-colors` stops resting on an
e2e run alone.

**C9 closed after that**, and it is the item where the plan's own guess did not survive the
measurement it asked for. The cheap half was to be a branch floor on templates; the branch
number turned out to be the metric that could not see the defect the finding was written from.
Three templates carried three different gaps and each of the four metrics was the only witness
of one: an `@if` arm nobody took shows in branches and not in lines, a block nobody rendered
shows in lines while its own `@if` reports both arms taken, a listener nobody calls shows in
functions. So the floor stands on all four, per template, at 100% — with an exception that has
a reason and two sides — and the whole-report figure keeps its own job, since a template is a
seventh of the lines and any one of them could vanish inside it
([`lesson-71`](lessons.md#lesson-71)). Rendering one of those blocks for the first time
produced a finding of its own: the field replaces the hint with the error, the standalone group
shows both — **C13**, one promise with two answers, invisible for as long as nothing rendered
the second one.

**C10 followed it**, and it is the plan's own either/or dissolving for the second time in a row.
The finding offered a registration channel or a documented promise; the answer was neither,
because the comment those options rested on was true of the class and false of a query. A token
beside the group lets a `contentChildren` read what the options carry with the import still
pointing one way — so the group now reports a duplicated value exactly as `pct-select` does, and
`req-api-generic`, which had named `PctRadioGroup<T>` since C2, stops being a promise only one
component keeps. The measurement first, as the finding asked: two options with one value paint
themselves both chosen while the browser keeps the last one checked — the opposite arbiter to
the select's, which is why the message names the mechanics and not just the rule. The price is
in the diff, 1234 B on `./radio`, of which 403 B is the message text. Two more things came out
of it: [`lesson-72`](lessons.md#lesson-72), where the obvious `effect()` passes five of six
cases and fails the one the feature exists for, and **C14**, the size snapshot that records the
last breach rather than the last build.

**C11 closed after it**, and it is the second position in a row where the plan's own either/or
was two halves of one answer — but this time the measurement went further and took the finding's
premise with it. "The budget counts a template as text, so it overstates" turned out to be true
of neither half: linking a template can cost more than the text it replaces (`./checkbox`
+823 B) or much less (`./field` −1850 B), and the real overstatement was somewhere else
entirely — the class metadata that carries the whole decorator a second time, template
included, together with a `debugName` on every signal. Both are dev-mode only and both need
the linker AND the production fold to disappear, which is why neither step alone is worth
200 B and the two together halve the library: **121354 → 72999 B recorded, with no component
code touched** ([`lesson-73`](lessons.md#lesson-73)). The task also settled where a new check
belongs: written last, it fired after the budget, whose advice is `--write` — so a run that
found the probe measuring the wrong thing would have offered to write the wrong number down.

**C12 closed after that**, and its either/or was decided by the repository's own past rather
than by an argument about palettes: the ramps here are gapped in three places, so "a designer
keeps the full ramp" was never what this skin did, and the two steps in question were never
referenced by anything in the whole history. They are gone, and a step nobody reads is now
point 9 of the token gate ([0020](decisions/0020-the-palette-carries-no-spares.md)). The work
was not in the comparison but in the **denominator**: the obvious reading of "used" — a token
points at it — condemns the entire motion axis, which has no tier above it and is read by the
stylesheets directly, so the rule counts two kinds of reader
([`lesson-74`](lessons.md#lesson-74)). Written the obvious way it advises a deletion that three
further runs of the same gate walk through — two of them accepting it, the last one forbidding
it. The task left **C15** behind: the two hand-kept indexes it had to edit had both already
drifted.

**C15 closed after it**, and it is the position where the finding turned out to have measured
the smaller half of its own subject. The two lists were fixed by hand at C12 and looked right
afterwards; the renderer's first run disagreed with **eleven of the twenty rows** of the
decisions index — five paraphrased titles, six short `implements` lists — because absence is
the only drift a reader spots without opening the sources
([`lesson-75`](lessons.md#lesson-75)). The plan's either/or held this time and split per file:
generated where every column has a home in the directory, measured where one column is a
sentence a human writes ([0021](decisions/0021-an-index-is-derived-or-measured.md)). What the
rule could not decide by itself is completeness — `check-reach.fixtures` tabulates three of its
seventeen cases on purpose — so a tree now says it is listing itself, under `## The cases`, and
the gate holds only the tables that make that claim. Pointed at the rest of the repository it
found two more lists already wrong before anybody looked.

**C13 closed after it**, and it is the plan's own either/or dissolving a third time — this one
by naming the wrong pair. The finding read the field against the radio group and offered "a
group's message describes a SET" as the reason the two might differ; the run over all four
components that draw messages found the checkbox and the select doing exactly what the group
did, and neither is a set. What the two shapes divide is the chrome against a control's own
footer, so the same `pct-select` showed one message inside `pct-field` and two outside it — a
wrapper documented as optional changing the behaviour it exists to leave alone. The chrome's
answer won, as the only one with a reason, two gates and a rendered page behind it, and the
price is written down rather than gated ([0022](decisions/0022-one-message-line.md)): the hint
is gone exactly when the user has to correct the value, so WCAG 3.3.3 now rests on a text the
consumer writes and no gate here can read. The lesson sits one floor above the defect
([`lesson-76`](lessons.md#lesson-76)) — `field-controls.spec.ts` tested both modes and never
asked whether they agree, because a per-mode suite has no place where the modes meet. The task
left **C16** behind: `check-texts.mjs` carried a Polish section header past every run of the
language gate, an English stem with a Polish ending being a word in neither dictionary it reads.

**C16 closed after it**, and it is the position where the finding turned out to be describing
itself. The rule was written as the plan asked — the endings named, not the words — and its first
run over the repository was red on **this file**, in the very entry that had spelled four
examples of the class it was asking for a rule against. They live in the gate's tree now, beside
the constant of [`lesson-60`](lessons.md#lesson-60), because there is nowhere else here a word
like that may stand. The rest of the measurement was smaller than the argument for it: 16 words
in 849 files, four of the class and twelve enumerable false positives, one of them
(`rgba`) on the public surface. What the task added past the finding is a canary, and the reason
is the half of a denominator this repository keeps rediscovering
([`lesson-77`](lessons.md#lesson-77)): the same unread English list makes the second limb flood
the run and the fourth go quiet, so "the dictionary is read" is not one question but two.

**C14 closed after it**, and it is the position where the plan's own either/or was answered by
a question neither half had asked. Budget or snapshot: the finding read both as answers to "how
big a jump has to be before somebody looks", and the band was quietly answering a second
question as well — **when is the record written?** `--write` fires only on a failure, so
everything inside the band was never accepted but never written either, and the file aged until
the first change to leave it paid for everybody. What decided between the two readings is a
measurement rather than a taste: the same artifact and the same toolchain give byte-identical
sizes, across repeated runs and across a hundred characters of path on both sides, so there was
no wobble for a tolerance to protect the record from
([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md),
[`lesson-78`](lessons.md#lesson-78)). The exact comparison's first run was red on a live drift
of three rows the old band had swallowed, and the task left **C17** behind: those four generated
snapshots are compared by their rows and by nothing else.

**C17 closed after it**, and it is the position where the finding had measured half of its own
subject. "All four snapshots compare their rows and nothing else" was true of two:
`check-tokens` and `check-parts` hold the whole file in one `!==`, and their message even has a
branch for a heading that drifted. What splits the four is not care but **what their messages
can say** ([`lesson-79`](lessons.md#lesson-79)) — a byte needs the row parsed into columns
before "+800 B" is sayable, and once the rows are parsed the parse becomes the comparison. The
plan's either/or was settled by finding the second road closed rather than merely worse: only a
gate that renders can compare, and knowing what `size.snapshot.md` should say means running the
build. The two repairs are deliberately different, which is
[0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md) taken literally: the size
file is compared whole, the mutation file everything except a number that wobbles by ±2 with
the code unchanged.

**C18 closed after it, and C is now empty.** The word was found where the plan said it was, and
the fifth limb reads it as the plan proposed: a suffix on a stem the Polish list confirms, both
ends looked up. What the plan could not know is where the task really was. The limb's first run
gave seven splits over 5715 words — one true, one in the gate's own tree, and five English agent
nouns that all share the same property, so three lines in the detector would have silenced every
one of them and shortened the register besides. That is the shape point 5 forbids, written where
point 5 cannot see it, and refusing it is the answer to "what may a detector name":
**a shape may be named to SEE a class and never to stop seeing one**
([`lesson-80`](lessons.md#lesson-80)). The specimen is now the limb's probe, in the gate's tree
where such a word may stand, and the function it named is `specifierOf`.

With C empty, the order handed the session back to **D**, and **D2 has closed**. It is the
position where the plan's own list turned out to name three different kinds of thing under one
heading. Of the six — positioning, the closing stack, the outside click, `inert`, the scroll
lock, the carrying-over — three had a consumer and a measurement behind them, two have **no
consumer at all** until there is a modal, and one was already built in the dependency this
library had already chosen: the CDK dispatcher delivers a keydown to the top-most attached
overlay and to no other, which is the Escape ordering the line asked for. So the layer carries
what an overlay severs and pins what it borrows — two overlays and two Escapes in
`core.spec.ts` — and the rule that follows is written where the dialog will read it: **an
overlay closes from the stack, never from a listener above the control**
([0024](decisions/0024-the-closing-stack-is-the-dependency-s.md)). What the plan could not
foresee is where the second half of the work was. `./core`'s first directive turned the
tree-shaking gate red on the **primary** entrypoint — a bundle of 1003 B that contains no
directive at all — because point 4 asked the bundler's metafile, which speaks of modules, a
question the promise asks about bytes: primary re-exports `providePctConfig` from `./core`, so
it pulls that entrypoint whatever it takes from it ([`lesson-81`](lessons.md#lesson-81)). Three
points moved onto the text read, the exemption they needed is computed from the artifact rather
than listed, and the price of the directive is now a visible line in the snapshot: `./core`
+937 B, `./select` +578 B, and 11 B on everything else — one unused `input` import in a module
every consumer already carries. The task left **C19** behind: the rule it wrote down — one
owner per key — is broken inside the select itself, where the CDK closes the panel on an Escape
the trigger never sees, and nothing in the repository says so.

**D3 closed after it, and it is D2's shape one item further on: a list of four whose consumers
had to be counted before any of it was written.** Three of the four — the focus trap, the
restore, the initial focus — are the modal half, deferred for exactly the reason `inert` and the
scroll lock were, and the fourth, a roving tabindex, has no consumer either: the radio group
stands on native radios the browser walks and the select points with `aria-activedescendant`.
What the line did not name is the one thing that had a consumer **and** a defect. The listbox
pattern promises focus stays on the trigger while the panel is open, and the browser breaks
that promise for free — a press on the panel's own background moves focus to `body` in all
three engines, the panel stays open, and every key the control owns goes quiet, since they all
sit on the trigger. Only Escape answers, through the CDK's document listener, which is **C19**
seen from the other side. So the layer gained the declaration that a panel takes no focus
([0025](decisions/0025-a-panel-says-whether-it-takes-focus.md)), and the work turned out to be
in choosing the event: `pointerdown` covers mouse, pen and touch in one listener and is the
wrong answer — touch never moved focus here, while preventing that event's default cancels the
compatibility events after it, and in webkit that includes the `click` a tap on an option needs
([`lesson-82`](lessons.md#lesson-82)). **A guard is as wide as the default action it cancels,
and no wider.** The second half of the lesson is where the case had to live: jsdom moves focus
on no `mousedown` at all, so the unit suite can assert the cancellation and never what it is
for — take the directive off the panel and every unit case stays green while all three browsers
go red.

**D4 closed after it, and it is the first position where the plan's line asked for something the
repository already had — correctly.** "Not a region per component" describes four templates here
exactly: the checkbox, the radio group, the select and the field chrome each draw their message
inside `role="alert"`. Read as a defect, the repair would have moved four sentences off the
screen and into a hidden copy of themselves; measured instead, those regions are the right shape
— the message is where the user reads it, `role="alert"` is the one live region an assistive
technology reads when it arrives together with its text, and a single shared region would lose
the second of two errors landing in one frame unless a queue nobody can time were added
([0026](decisions/0026-one-channel-per-politeness.md)). What has no reader at all is the select's
**empty** panel: focus on the trigger, no option for `aria-activedescendant` to name, no
description, and the sentence in the panel in a `<div>` with no role — a sighted user is told,
a screen reader user hears "expanded" and then silence. That is the channel's one consumer, and
it is polite. The task also found where the mechanics could not be bought: CDK's `LiveAnnouncer`
hides its element with a class from a stylesheet this library never asks for, so on the two it
does ask for the announcement is **573 × 18 px of text across the bottom of the page**
([`lesson-83`](lessons.md#lesson-83)) — **a utility class is a promise about a stylesheet, and a
package that hands you DOM hands you that promise too**. The finding left behind is **C20**: the
`role="alert"` this decision keeps rests on four hand-written templates and no gate reads it.

**D5 closed after it, and it is the position where the plan's line named a mechanism the
measurement threw out.** "`*pctTemplate` / `TemplateRef`" reads as two roads to one place, and
they are not roads to the same place at all: a template a consumer writes has two ways to be
wrong — the **name** it is called by and the **context** it is handed — and four probes under
`strictTemplates` say which shape buys which. An attribute is invisible to the compiler in
every form it can take, misspelt or unimported or structural; a context guard types
`let-option` only where the context type is fully known, and a directive with no input has no
inference site at all, so Angular's type-check block instantiates its generic as `any`. So
`*pctTemplate="'option'"` — the shape most libraries ship — is the one that gives up **both**
halves while looking exactly like the one that gives both
([0027](decisions/0027-a-slot-is-a-directive.md),
[`lesson-84`](lessons.md#lesson-84)). A slot is therefore a directive of its own with a
required input carrying the type, and the half that stays open is named rather than faked: the
misspelling has no witness anywhere, because the obvious repair — counting the content's
templates against the slots that claimed one — accuses a consumer who merely wrapped a correct
slot in an `@if`, control flow in projected content being a `TemplateRef` with an anchor
identical to any other. That is [`lesson-68`](lessons.md#lesson-68)'s defect met in a new file,
and refusing it is what the task is. Two gates moved on the way, both on their **denominator**
rather than on their subject: the coverage exception for `select.html` (the template gained
statements, the one uncovered statement is the same one) and `check-texts`, whose scanner of
what encloses a `console.*` could see a class method and not a **free function** — a free
function's statements sit at the two-space indent a class puts its methods at, so it read
`if (` as the enclosing method and called a guarded warning unguarded. The price is a fourth
peer, `@angular/common` for `NgTemplateOutlet` alone, written into the dependency policy with
its reason. The last thing the task found was about itself: `@param` is a Polish word by the
dictionary and the public surface admits no register of exceptions, so the first JSDoc
`@param` in this repository's history turned the language gate red on the package. It is a
word read wrong rather than an exception to be excused, and it went into
`vocabulary.abbreviations` named singly.

**D6 closed after it, and it is the first task here whose line was wrong twice — about the
mechanism and about the place.** [0011](decisions/0011-icons.md) had promised "a `PCT_ICONS`
token mapping semantic names to templates", and a token cannot hold a template: a `TemplateRef`
is a handle on part of a component's view, and the provider array where "one declaration for
the whole application" has to be written is not in a view. Four probes over what a provider
**can** hold settled it ([`lesson-85`](lessons.md#lesson-85)), and the first row is the one
worth keeping: a registry of markup strings — the shape most icon libraries ship — renders
**nothing**, because Angular's sanitizer deletes an `<svg>` from `[innerHTML]` outright, so the
shape exists only if a library calls `bypassSecurityTrustHtml` on what a consumer handed it.
What survives is a component whose templates are the icons, and the same probes made it cheap:
`createComponent()` hands back a readable template with no change detection at all. The second
half of that lesson corrects one this repository wrote itself three tasks ago:
`pctIcon="chevrn-down"` is **`TS2820` with the right name suggested**, so a name in a string is
invisible to the compiler only when the string is a **selector** — as a union-typed input value
it is checked wherever it is written. Then the place: the plan puts icons in `core` with the
rest of D, and the size snapshot answered before anything else was touched — **754 B and
`@angular/common` on every entrypoint**, a button paying for a component it never draws
([`lesson-86`](lessons.md#lesson-86)). In an entrypoint of its own the same code leaves four of
the seven rows unmoved to the byte. The task's real subject turned out to be neither: it is
**where a component's styling contract lives**, because everything below a `pct-icon` is
replaced the moment somebody provides a set. The part, the size, the colour and the state moved
onto the box, the drawing kept its geometry and `currentColor`, and two gates now say so — a
new `check-icons` with six points and point 8 of `check-styles`, whose fixture is the shape this
library shipped until today. The proof that the swap is invisible is the whole e2e suite: 488
cases, three engines, **not one visual baseline moved** although an element appeared in the DOM
around every icon in the library.

**D7 closed after it, and D is empty.** Its line is one sentence — a gate forbidding
`@angular/animations` — and the measurement it asked for turned that ban into two, because the
runtime has two roads and only one of them is a dependency. Four probes compiled with the
package **not installed at all**: `[@panel]`, `(@panel.done)` and the same pair on a host all
pass `strictTemplates` and import nothing but `@angular/core`
([`lesson-87`](lessons.md#lesson-87)). So a library can require an animation engine from every
consumer while declaring nothing — NG5105 in their dev build, and in production a DOM property
called `@panel` that animates nothing and says nothing. The second point reads that road in the
packed templates, where ng-packagr's partial declarations carry a template as a **string**.
The first road cost the task its second finding, and it is about a gate's manners rather than
its verdict ([`lesson-88`](lessons.md#lesson-88)): walked with the ban removed, point 7 answers
an import of `@angular/animations` with **declare it**, answers the declaration with **write
down why**, and — before today — passed the moment somebody did. Every message a gate prints is
a repair instruction, so the ban had to be evaluated **first** among the rules of its point,
before the ones that ask for deliberateness; placed last it would have taught the forbidden
road twice and then changed its mind. The requirement's own binding sentence carried a second
half — that motion takes its duration from a token — and it had no witness either: the e2e
measures the **axis** (`150ms` / `0.01ms`), so a component writing its own `150ms` leaves that
measurement exactly as green as it finds it and stops reading the axis. That is point 9 of
`check-styles`, in two rules: a literal duration, and a component sheet answering
`prefers-reduced-motion` a second time. The by-product is a word: `callback` is in the Polish
dictionary and not in the English list, which is [`lesson-77`](lessons.md#lesson-77) met for
the second time — the first occurrence in the whole repository was written by this task.

## B. Readiness for the first release

Binds at the first publication — and then all of it at once. **B9** bound one step earlier, at
the push, and is closed; what is left binds at npm.

Three of the seven tasks (**B3**, **B4**, **B8**) were about language: the text that travels
inside the package, and the gate that proves the rest of the repository holds to it. The gate
went first, the package text followed it, and **both are closed** — so what still carries B4's
number is not about language at all, but about 31 citations that need an address.

**The version of that first release does not follow from the history**, and it belongs to no
single task below: with a single root commit `releaseVersion` sees an empty range and keeps the
`0.0.1` of the manifest, so the run needs an explicit `--specifier`. At `0.0.1` every bump lands
on a patch anyway (`adjustSemverBumpsForZeroMajorVersion`), so the first version is a decision,
not a derivation.

- [ ] **B2 — remote repository + `repository` in the manifest** — **held: it starts on an
      explicit request and on nothing else**
  - **the trigger is a sentence, not a state.** No other task may pull the push forward, no run
    turning green starts it, and its standing next in the order is not a start either — a
    session that reaches B2 passes over it and takes the next item. Recorded here because the
    opposite is the natural reading of a task list: everything else in this file starts when the
    thing above it is done
  - concerns: `req-release-metadata` — the gate and its control exist, so the registry says ✅.
    **The manifest field is done** (`libs/components/package.json` points at
    `github.com/pacit/components`); what is left is the repository, the remote and the push,
    and day to day the gate only warns
  - the `pacit` organisation exists on GitHub and on npm (scope `@pacit`, owner `markovy`);
    the repository itself does not yet
  - `git remote -v` is still **empty**, deliberately: the first push is a premiere, so a remote
    added early is an invitation to an accidental `git push`. Until then npm refuses provenance and `check-package.mjs --release` blocks
    the release
  - **the task itself is minutes, but it stopped being first.** The repository is public
    **from the first push** (settled: no private stage), so `README.md`,
    `docs/` and the step names in Actions become **the product** at that second
  - hence everything the first visitor sees is finished before the push, not after it. The price
    of that order is written down plainly — until the first push there is no remote CI, no
    provenance and no copy off this machine
  - the condition is wider than the public surface: **nothing leaves in a second language at
    all**, and a measurement says so, not a declaration — **B8 proves it, and it is closed**:
    720 files of the index and 31 of the package, no entry in the register
  - cost: minutes for the task itself · _notes:_ —

- [x] **B3 — package README in English** — **closed, and it had to be made reachable to survive
      its own task**
  - closes: [`req-project-language`](requirements/project.md#req-project-language) on the last
    file that carried the layer with no right to stand in a register of exceptions
  - cost: ~0.5 day · _notes:_ **done** — `libs/components/README.md`, 268 lines written from
    scratch over the seven-line Nx stub: install and what each of the two stylesheets buys,
    the peer dependencies, the entrypoint table, a section per component, theming, texts,
    configuration, accessibility, documentation, licence. The other two files of this task
    were already done — the manifest `description` and the headers of the generated theme
    artefacts, fixed in `libs/tokens/build.mjs` rather than in its output.
    **The file was alive only because this task named it**: `check-reach` reached
    `libs/components/README.md` through one sentence of this position, so ticking B3 off would
    have killed the file B3 had just written. It is a root now, for the reason it was always
    one — ng-packagr copies a library README into `dist` by its own convention, and
    `ng-package.json` names the `themes` assets and nothing else. The same edit corrected the
    root README's reason in the policy, which claimed npm renders it: npm renders this one, and
    the two answer to different readers. Two things deliberately left out — `_tokens.scss`,
    because advertising it on the npm page would settle **C4** by publishing it, and any
    mention of the primitive ramps, which is **C6**. The documentation links are absolute
    `github.com/pacit/components` addresses, dead until B2 and costing nothing for it: the page
    reaches its first reader at npm, and npm is behind B2

- [ ] **B4 — citations in the public API as links**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language)
  - **the language half is done**: the 24 files of the built package
    that carried Polish — all eight `types/*.d.ts`, seven `fesm2022/*.mjs`, the source maps and
    the manifest — measure **zero** today. Translating the JSDoc apart from the file it stands
    in would have meant opening all 15 sources twice, so it travelled with the sources
  - what is left is the second thing in the same place, and it is not about language: the
    public `.d.ts` cite `req-*` and `lesson-*` **31 times** as bare identifiers that lead
    nowhere for a consumer. The answer is **a link, not a deletion** — so this waits on **B2**,
    because the address `@see https://…/docs/requirements/a11y.md#req-a11y-built-in` has to
    resolve before it is worth more than the paragraph it replaces
  - **B2 being held on a request, this one is held with it** — and it is the whole of what the
    hold costs, since the citations are the only work in the file that needs an address
  - cost: ~0.5 day · _notes:_ —

- [x] **B6 — support policy document** — **closed, and the document is an input, not a page**
  - closes: [`req-release-support`](requirements/release.md#req-release-support)
  - cost: ~1 day · _notes:_ **done** — [`docs/support.md`](support.md) plus
    `tools/check-support.mjs` (five points, 15 fixtures), target `check-support` in the root
    project and in CI. **A document is the one input that always looks fine**, so the three
    numbers live in a table the gate reads: 1 Angular major, 0 months of an old line, 2 minors
    of notice, and `codemod-required` as a switch that fires when reached for. Point 2 is what
    stops the page drifting — it counts the majors the `@angular/*` peer ranges admit and
    requires the count to equal the declared one; widening the window is one edit in each
    place and doing only one fails CI. **Point 4 is the tie the requirement was missing**, and
    it measures nothing until the first release tag: there is no installed version to migrate
    from, so a breaking change before it owes no codemod — the run prints which of the two
    states it is in rather than passing quietly. Deliberately **not** measured, and written
    into the document: that a removal actually waited the two minors, which needs a record of
    the public API at each release that only CSS parts have. Proof on the real input, not only
    on fixtures: `angular-majors` moved to 2 against `^22.0.0` fires point 2. The one cost
    named out loud is `cache: false` ([`lesson-63`](lessons.md#lesson-63))

- [x] **B7 — dependency list gate** — **closed, and the list was the smaller half**
  - closes: [`req-project-dependencies`](requirements/project.md#req-project-dependencies)
  - what: a seventh point in `check-package.mjs` — `dependencies` / `peerDependencies` of the
    **packed** manifest against an allowed list. Today nothing tells a deliberate dependency
    apart from one added by reflex
  - control: a manifest with a dependency outside the list must fire
  - cost: ~0.5 day · _notes:_ **done** — point 7 of `libs/components/check-package.mjs`
    (seven rules) plus `libs/components/dependencies.policy.json`, nine prepared packages,
    the target already in CI. **The task as written would have watched the one place a
    reflex does not reach**: `npm i` writes the name into the root manifest and the import
    into a source file, so the library's own manifest never learns of it. Hence the closure
    runs both ways over the artefact — an import nobody declared fires, a declaration nothing
    imports fires — and the list of names keeps the half the requirement asked for: an entry
    carries the reason, a dependency without one fires, and **an entry outliving its
    dependency fires just the same** (the `check-language` register idiom, one gate over).
    Two things the task did not foresee. **The policy is a list, and a list of names always
    looks fine**, so a case may carry a policy of its own — that is what makes the rules
    _about_ the policy provable, and the entry with no reason is one of the nine. And
    `compiler-drift`, which pays a debt written down elsewhere: `check-consumer` records that
    a peer-range drift passes it and that only this requirement watches for one, so the range
    is measured against the Angular major **stamped into the artefact** by partial
    compilation — not against a number typed a second time. The stamp going missing is its
    own rule, for the reason point 4 has two cases. Proof on the real artefact, not only on
    fixtures: `date-fns` in `dependencies` fires `not-allowed`, an `rxjs` import in
    `pacit-components-button.mjs` fires `undeclared`, `@angular/core` at `^21.0.0` fires
    `compiler-drift`. The negative control grew a floor: point 7 is the first with several
    rules under one check, so a case names the rule too — measured, with
    `dependency-outside-list` retagged as `dead` and the run saying which fired instead.
    One thing found by accident and left visible: the fixtures' README had never listed the
    two `licence` cases, so it now does

- [x] **B8 — language gate** — **stood before B2, and it is closed**
  - closes: [`req-project-language`](requirements/project.md#req-project-language)
  - **without it every translation pass is a one-off tidy-up.** A language rule with no gate is
    the [`req-axis`](00-axis.md) class exactly: it was written down once and broken on **both**
    sides while it stood
  - what: `tools/check-language.mjs` + `tools/language.policy.json`. **Two measurements of
    different reach**: the public surface on the **artefact** (what comes out of `npm pack`,
    not what stands in the source), the rest of the repository on files from the git index
  - **two reaches, one deadline now**: the repository limb runs before the push, being the only
    thing turning "nothing is left in Polish" into a measurement; the artefact limb binds at B3
  - detection has **three limbs**: diacritics carry prose only, so the second is
    `/usr/share/dict/polish` minus `american-english`, over identifiers split at camelCase, and
    the third is the opening quote `U+201E`, a typographic convention with no English use.
    **The false positives of the second are the design work** and they enumerate — acronyms,
    the abbreviations of the trade and the words both languages share — never a whole
    grammatical class ([`lesson-60`](lessons.md#lesson-60))
  - the register follows the `browsers.policy.json` idiom: an entry carries its reason
    and the task that removes it, and **a dead entry fires just like new Polish**. It starts
    empty bar one survivor to rule on — the `pl-PL` default of `number.spec.ts`, the case that
    groups with U+00A0. Denominator: [`lesson-48`](lessons.md#lesson-48)
  - control: Polish in a file outside the register; an entry pointing at a file **already**
    translated; a Polish `description` **despite** an entry; a scan with an empty file list
  - cost: ~1 day · _notes:_ **done** — `tools/check-language.mjs` (seven points, 24 rules),
    `tools/language.policy.json`, 27 fixtures, target `check-language` in the root project
    and in CI. The register of exceptions is **empty**: the survivor left to rule on turned
    out not to be a case (a BCP-47 tag is not prose, and no limb flags it), so an entry would
    have been dead on arrival. The vocabulary holds **103 words**, and the shape the plan
    forbade is not merely discouraged — an entry that is not a bare lowercase word fires.
    **The first run found three survivors** three passes had declared clean: a Polish local
    for "target" in three gate scripts, a Polish "both" in a fixture's JSDoc, a Polish
    "this is not an email" in an e2e test; all translated in the same commit. A third list
    was needed that the plan had not foreseen — `specimens`, the gate's own samples, which
    carry Polish by construction and whose tree the script hard-codes, so the list cannot be
    widened into a second register of permits. Two limbs of noise were fixed rather than
    registered —
    `ɵ` is a letter, so Angular's `ɵfac` stops coming apart at the barred o, and a source map is read
    through its fields, so `mappings` stops arriving as base64 debris

- [x] **B9 — the repository is tidied before it is published** — **closed, and it left a gate
      behind**
  - closes: [`req-project-reach`](requirements/project.md#req-project-reach)
  - **what a first visitor must not find**: an identifier space no public reader can observe,
    findings closed long before they could read them, and files whose deletion was nobody's task
  - `.opencode/skills/` and `.github/skills/` are **byte-identical copies** of a vendored Nx
    guide, 18 files each — one of the two is a directory nothing reads
  - control: no tracked file that no other file mentions
  - cost: ~0.5 day · _notes:_ **done** — 21 files went (the `.github` copy of the vendored
    guide with its agent and prompt twins, and `tools/ai-migrations/`, the prompts of an ESLint
    migration that has already run); which copy stays was decided by evidence rather than by
    preference — `opencode.json` is tracked, nothing configures the tool that would read the
    other. The four citations of section A (`A7`, `A12`) in `project.json` now name
    [`lesson-47`](lessons.md#lesson-47), which holds the measurement A7 stood for.
    **The control as this task wrote it would not have found the tree it names**: a copy brings
    its citations with it, so "no tracked file that no other file mentions" answers alive for
    every file of a duplicated directory. `tools/check-reach.mjs` walks from roots instead —
    five points, 17 fixtures, 728 files reached, and it took a second design pass to see that
    `**/*.md` in an unrelated gate's `inputs` was granting the whole tree
    ([`lesson-61`](lessons.md#lesson-61))

## C. Open findings

Small, good filler between the bigger items. Each one is verified in the code and still
current. **Twenty are closed and eleven are open** (the numbers run to C32; there is no C5) —
the list is where the next finding lands, and six of the closed ones ended in a decision record
rather than in a line of code: [0018](decisions/0018-no-sass-entry-point.md) through
[0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md).

- [x] **C1 — `pct-select` without the field chrome is an unnamed combobox** — **closed, and it
      was three components, not one**
  - `aria-label` lands on the `<pct-select>` host, which has no role; `role="combobox"` sits on
    the inner `<button>`. A consumer has no way to fix this
  - needed: explicit `ariaLabel` / `ariaLabelledby` inputs forwarded to the element that has the
    role — a rule for every future component whose role does not sit on the host
  - a real a11y gap, not cosmetics · _notes:_ **done** — the two inputs on `pct-select`,
    `pct-checkbox` and `pct-radio`, forwarded to the element that carries the role (in the
    select also to the panel, which is the second element with one), plus
    `tools/check-aria.mjs` (five points, 10 fixtures), target `check-aria` in the root project
    and in CI. **The finding named the place it was seen; the rule named the class** — the
    same defect stood in the checkbox and in the radio, and nothing had caught it because the
    axe audit reads pages and the pages all pass a `label`
    ([`lesson-65`](lessons.md#lesson-65)). What the gate measures: a component whose widget
    sits inside its own template declares both inputs and binds both on **exactly one**
    focusable element — one carrier, because two named elements are two names for one control,
    and none because an input read by nobody is worse than an input that does not exist. The
    mirror rule is point 2: an ARIA name written into a `host` block needs a role on that
    host, which is the same defect committed by us one floor lower, where it looks like a fix.
    Deliberately **not** measured, and written into the cards and the JSDoc instead:
    precedence. `ariaLabel` wins over a visible `label` by the accessible-name algorithm, so
    setting both makes the two say different things — a dev-mode warning is **C3**'s idiom and
    nothing has established it yet. Left out with its reason: **no page renders a control
    named only from outside**, so the axe audit still never sees the configuration the gate
    now guarantees is reachable — a sandbox specimen for it means new visual snapshots, and
    the unit cases of the three components carry that proof instead. Proof on the real input,
    not only on fixtures: the
    bindings removed from `select.html` fire `forwarded`, an input removed from
    `checkbox.ts` fires `inputs`, an `aria-label` written into the select's roleless host
    fires `host`

- [x] **C2 — `track option.value` with a generic `T`** — **closed, and the either/or in it was
      a false choice**
  - `libs/components/select/src/select.html` — for a non-primitive `T` this tracks by reference,
    and two options with the same value give NG0955 in dev mode. Either `track $index`, or a
    documented uniqueness requirement with a warning under `isDevMode()` · _notes:_ **done** —
    `track $index` in `select.html`, `warnOnDuplicateValues` in `select.ts` under
    `isDevMode()`, seven unit cases, and the promise written down where a consumer meets it:
    [`req-api-generic`](requirements/api.md#req-api-generic), the component page and the npm
    README. **The two roads were not alternatives** ([`lesson-66`](lessons.md#lesson-66)):
    tracking decides which DOM node a row reuses, uniqueness decides which option a value
    denotes — so the cheap road alone would have removed NG0955, the only thing that had ever
    spoken about a duplicated value, and left the defect standing in silence. Why `$index` and
    not the value: **every binding of a row is already a function of the index** (the id,
    `aria-selected`, both flags, both handlers), so keying by value moves DOM that is rewritten
    in place anyway — while a list rebuilt from a response, the very case `compareWith` exists
    for, arrives as all new references and re-creates every row. Measured rather than argued:
    with `option.value` back in the track expression the case "a list rebuilt from equal data
    reuses the rows" fails, and with the warning switched off three of the six duplicate cases
    fail while their mirrors stay green. The message names **positions and labels**, the labels
    being what differ between two options a value cannot tell apart. The cost written down
    plainly: the scan is pairwise and therefore O(n²), because the comparator belongs to the
    application — a `Set` has a key only for the default identity, and measuring one case and
    not the other would be worse than measuring both. Deliberately **not** measured, for C1's
    reason one component over: that the message reaches a real console — no page renders a
    duplicated list, so the unit cases carry it. **The price is measured, not estimated**: the
    mutation run reads 83.47% for `select.ts` (80.73 before, one new survivor and it is the
    `isDevMode()` guard itself — the same one `number.ts` carries at its own guard), and the
    size snapshot `./select` 30510 → 32114 B, of which the report is **588 B** — stripped out
    of the built FESM and bundled again to get that number. It ships, because `isDevMode()` is
    a call and not a flag a minifier can fold. The same rewrite records 739 B on `./checkbox`
    and 731 B on `./radio` that C1 had left inside the tolerance. Three things found by
    accident: the same promise has no owner in the radio group (**C10**), a seven-line comment
    written into the template cost **1064 B** in the artefact and moved into TypeScript
    ([`lesson-67`](lessons.md#lesson-67)) — which in turn opened **C11**, the budget that
    counts a template as text — and this component's page still carried two limitations that
    D1 and C1 had closed, a "Known limitations" section outliving what it knew

- [x] **C3 — `PctField.attach()` overwrites silently** — **closed, and the message needed a
      life-cycle event that did not exist**
  - `libs/components/field/src/field.ts` — a second control in one field chrome wins without a
    word. A classic silent defect, cheap to close: `console.warn` under `isDevMode()`
    · _notes:_ **done** — `detach` in the `PctFieldApi` contract, `pctAttachToField` in `core`
    (one call, both halves, booked through the control's `DestroyRef`), the report in
    `PctField.attach` under `isDevMode()`, four cases in `field.spec.ts`, and the promise in
    [`req-api-wrapper`](requirements/api.md#req-api-wrapper) and on the component page.
    **The task as written would have reported a correct page** ([`lesson-68`](lessons.md#lesson-68)):
    a control inside an `@if` is destroyed and built again, and the second construction calls
    `attach` exactly as a second control would — nothing in the contract told the two apart,
    because the contract had only the half that speaks. The pair therefore came first and the
    message second. It also closed something the finding had not named: **the chrome went on
    reading a destroyed control's state**, a signal outliving its component, so the error of a
    control removed from the DOM stayed lit under the field. Measured, not argued: `detach`
    made a no-op leaves the swap case and the departure case red, the report switched off
    leaves the first case red. The five controls that used to call `attach` by hand now call
    the helper — the same three lines in five places is a fix that has to be made five times
    ([`lesson-21`](lessons.md#lesson-21)), and the mutation run reads `core/field.ts` at
    **96.97%** (96.43 before), its one survivor unchanged — an optional-chaining mutant in
    `pctFieldMessages` that only a control reporting `null` errors could kill, and the types
    forbid one. It says 96.97 rather than 100 because the run was made **twice**: the first
    shared the machine with other gates and recorded that survivor as killed by the CLOCK,
    which is the purchase `mutation.policy.json` was written to catch. It also records two
    scores falling by a hundredth,
    which is the same edit seen from the other end: `this.field?.attach(this)` carried an
    optional-chaining mutant that a plain call does not, so `number.ts` and `select.ts` each
    have one killed mutant fewer to their name. Deliberately **not** changed: which control wins.
    Last-in still takes the chrome, because the chrome cannot know which of the two the label
    was written for, and a quiet reordering would be a second guess on top of the first

- [x] **C4 — `_tokens.scss`: generated, shipped in the package, used by zero lines** —
      **closed: the file is gone, its argument stayed and became a gate**
  - concerns: `req-token-scss` — component stylesheets contain no `@use` at all; every reference
    is a raw `var(--pct-*)`
  - decision: either make it the mandatory road to a token (a typo becomes a compile error — the
    spirit of [`lesson-43`](lessons.md#lesson-43)), or drop it from the requirement and from the
    package. Today it is a dead artefact in a published package · _notes:_ **done** —
    [0018](decisions/0018-no-sass-entry-point.md) settles it: dropped from the generator, from
    the package assets and from the gate that compared it against the token list; the promise
    in [`req-token-artifacts`](requirements/tokens.md#req-token-artifacts) now names two
    artefacts, not three. **The road not taken was measured before it was refused**: the whole
    case for `@use` was that a misspelt token would become a compile error, so the defect was
    provoked — `background: var(--pct-button-bgg)` fires today, `min-height:
var(--pct-button-heigth)` passed every one of them, and the 7 stylesheets read 127 names of
    which all are real. So the hole was real and **narrower than the remedy**:
    what Sass would have bought is a name check, and a name check does not need Sass. It is
    **point 8 (NAMES)** of `check-tokens` — every `--pct-…` a stylesheet reads or declares is
    a token of the skin, in any property, two rules and a prepared input each (28 fixtures
    now), and the rule name is compared too: disarming `declared-unknown` moves its case onto
    `read-unknown` and the run says so. Proof on the real input as well: the same `min-height`
    typo put back into `button.scss` fires point 8 today, and the colour one still fires
    point 7. The first misspelling tried had to be changed,
    because dropping a letter from `button` leaves a Polish word and `check-language` fired on
    every file that quoted it — a gate reading the repository does not know that a name was
    misspelt on purpose, and the register stays empty rather than gaining an entry for a joke. Why dropping rather than adopting, in one line:
    **publishing is the one-way direction** — nothing is on npm yet, and a Sass entry point can
    arrive in a minor the day somebody asks, with the reader, the page and the gate it never
    had. The cost is written into the decision: a consumer writing Sass has no typo protection
    on overrides, which is the price paid by a consumer who does not exist yet. One thing the
    removal gave back, unplanned: `check-package`'s token closure now reads **159 used against
    161 declared** instead of 161 against 161 — the file named every token in the skin, so the
    packed artefact was proving the closure with a copy of the list it was being measured
    against. What the
    measurement left behind is [`lesson-69`](lessons.md#lesson-69): the branch that caught the
    colour typo was a **precondition** of the contrast question, not a rule of its own — and a
    gate catching a defect on its way to a different question stops catching it where that
    question is not asked

- [x] **C6 — primitives in the public `PctCssVar` union: two ramps private, the third not** —
      **closed: the wider question had two answers, because the tiers are not symmetrical**
  - `libs/tokens/src/names.policy.json` declares `pct.blue.` and `pct.slate.` private and
    `pct.red.` not — so a consumer sees `--pct-red-600` in the type and does not see
    `--pct-blue-600`. An inherited drift, moved out of an expression in `build.mjs` and into the
    policy — that is, **from an invisible place into a visible one** — and left there
  - to be settled wider than one ramp: do primitives belong to the public surface at all? For:
    e2e and theme-building code ask the browser for values and the type is the only protection
    against a typo ([`lesson-43`](lessons.md#lesson-43)). Against: a primitive is an
    implementation of the skin, not its contract
  - cost: minutes for the change, the decision is the whole task · _notes:_ **done** —
    [0019](decisions/0019-primitives-are-not-the-contract.md): **the primitive colour ramps are
    private, every other primitive stays public**, and the rule sits in the policy so the next
    ramp does not reopen the question. Why not one answer for the whole tier: **a colour has a
    tier above it** (`--pct-danger`, the `on-` pairs), so a ramp is how this skin happens to be
    built — **a scale has none**, components reference `--pct-space-3` and
    `--pct-control-height-md` directly, so those are the only name a shared metric has, and an
    application placing its own control beside ours reads exactly them. The argument for
    keeping the ramps survives untouched, which is what made the split safe to take: not one
    line of the workspace asks for a raw ramp by name (measured — the only `--pct-red-*`
    outside the skin is prose), and everything the e2e helpers do read is semantic, component
    or scale. The union is **143 names, not 146**, and the change is visible in review because
    the snapshot moved three lines from `public` to `private`. What the measurement turned up
    on the way is **C12**: of 34 primitives, two are referenced by nothing — and one of them
    was public

- [x] **C12 — two primitives nothing references, and no gate that would say so** — **closed:
      a step nobody reads is a defect, and the rule needed a second kind of reader**
  - measured while closing C6: of 34 primitives, `pct.blue.50` and `pct.red.700` are
    referenced by no token and painted by no stylesheet. `--pct-red-700` was in the public
    `PctCssVar` union until [0019](decisions/0019-primitives-are-not-the-contract.md); both are
    still declared in `pct.css`, so a consumer's override of them reaches nothing
  - the gate has a rule for a dead dictionary word, a dead private prefix and a dead `on-`
    pair, and **none for a dead primitive** — the one tier where "declared and unused" is a
    normal state of a palette a designer keeps a full ramp of. That is the whole question:
    either a step nothing uses is a defect (then it is a rule, and the two go), or a palette
    may carry spare steps (then it is written down, and the ramps stop looking like the rest
    of the skin)
  - cost: minutes for the change, the decision is the whole task · _notes:_ **done** —
    point 9 of `check-tokens` (`palette`, rule `primitive-dead`), the fixture
    `dead-primitive`, and the two steps are gone from `primitive.json`
    ([0020](decisions/0020-the-palette-carries-no-spares.md)). **The decision went the way the
    repository already worked, and the measurement is what said so**: these ramps are gapped
    already — blue has no 100 and no 900, slate no 300, 400 or 600, red no 500 — so "a
    designer keeps the full ramp" describes a palette this one never was, and
    `req-token-tiers`, which promised "ramps 50–950", was corrected rather than obeyed.
    `git log -S` over the whole history finds **no commit** that ever added or removed a
    reference to either: `pct.blue.50` was born unused in the first commit of the workspace,
    `pct.red.700` in the one that added the input — not residue of a redesign, never used
  - **the rule's denominator was the whole task, and the obvious one was wrong**
    ([`lesson-74`](lessons.md#lesson-74)): written as "a primitive a token references", it
    condemns `--pct-motion-transition-duration`, `--pct-motion-transition-easing` and
    `--pct-motion-loop-duration` — the entire motion axis, which no token can reference
    because it has no tier above it and the stylesheets read it directly. So a reader is a
    token **or** a stylesheet, and the reference input of the negative control had to grow a
    `transition` line to carry that shape. What the wrong denominator would have cost was run,
    not guessed: the deletion it advises takes **three more runs of the same gate** — point 4
    (the `motion` word is now dead), point 5 (`--write`, which records it), and only then
    point 8, which forbids it. Four points of one gate, two of them accepting the step on the
    way to the one that refuses it
  - the point stands **last** and not beside the reference graph in point 6: it reads what
    points 7 and 8 measure, and with a broken list of stylesheets every sheet-read primitive
    looks dead — point 7's denominator then fires first and names the real defect
  - the two runs behind the tick: on the real sources point 9 named exactly
    `--pct-blue-50` and `--pct-red-700`, and disarming the rule leaves `dead-primitive` as the
    one case reported as "PASSED and was meant not to". Two lists nobody measures turned up on
    the way and became **C15**

- [x] **C15 — two hand-kept indexes, both already drifted** — **closed, and the by-hand fix
      that produced the finding had corrected the smaller half**
  - found while closing C12, in the two files that had to be edited to record it:
    [`docs/decisions/README.md`](decisions/README.md) carried an index ending at **0017**,
    with 0018 and 0019 missing, and `tools/check-tokens.fixtures/README.md` said the gate
    "runs all seven of its checks" while it had eight, with both point 8 cases absent from
    its table of cases. Both were fixed by hand then — which is the finding
  - the question was which of the two roads: **generate** or **check**, with the defect column
    of the fixtures table as the human column that decides it
  - cost: ~0.5 day · _notes:_ **done** — `tools/check-index.mjs` (five points, 23 prepared
    inputs), target `check-index` in the root project and in CI,
    [`req-quality-index`](requirements/quality.md#req-quality-index) and
    [0021](decisions/0021-an-index-is-derived-or-measured.md). Both roads, one per file, and
    the question that picks between them is _is every column derivable?_ — the decisions index
    is generated, the fixtures tables are measured and keep their prose
  - **the by-hand fix had corrected the visible half.** The renderer's first run disagreed with
    **eleven of the twenty rows**: five titles paraphrased away from the heading they quote,
    six `implements` lists naming the first requirement of a decision carrying three or four.
    Absence is the one drift a reader can spot without opening the sources, and it is the
    smaller half ([`lesson-75`](lessons.md#lesson-75))
  - the same rule pointed at the rest of the repository found **a third and a fourth list**
    before anybody looked: `tarball-without-licence`, a case of `check-consumer.fixtures` its
    own table did not name, and the map on the first page of the documentation counting 17
    decisions against 21 and 63 lessons against 74. Three kinds of drift, none visible in
    review of the commits that caused them — every one of those diffs was right in the file it
    touched
  - **completeness cannot declare itself, and that decided the shape of point 3.**
    `check-reach.fixtures/README.md` tabulates "the three cases the design rests on" out of
    seventeen, deliberately; a gate counting rows cannot tell that from a table that has lost
    fourteen. So the claim is written: a tree lists itself under `## The cases`, and a table
    anywhere else is prose. Five READMEs gained that heading over tables they already had
  - the limit is deliberate and written into the requirement: **the gate measures the lists
    that exist and does not require a list to exist.** Five fixture trees carry no README at
    all; demanding one would be 130 rows of prose nobody asked for, against
    [0017](decisions/0017-one-home-per-fact.md) pulling the other way
  - proof on the real input, not only on the fixture: the paraphrase of 0017 put back fires
    point 2 by name, `dead-primitive`'s row moved to point 8 fires point 4, the row deleted
    fires point 3, and the map returned to 63 lessons fires point 5. In the other direction,
    disarming the map comparison leaves `map-count-out-of-date` reported as "PASSED and was
    meant not to", and disarming the duplicate-row rule does the same to `case-listed-twice`
  - one collision on the way, the shape [`lesson-67`](lessons.md#lesson-67) names one gate
    over: the prepared decisions cited invented requirement
    identifiers, and `check-docs` point 4 resolves every citation in every tracked file. The fixtures took real identifiers rather
    than the exemption `check-docs.fixtures` has — **one gate's fixture may not be another's
    defect**, and an exemption is a hole in a denominator that has no gate of its own

- [x] **C13 — one promise, two answers: the field replaces the hint, the group adds to it** —
      **closed, and the second answer was three components' rather than the group's**
  - closes: [`req-api-message`](requirements/api.md#req-api-message) — the rule had no home at
    all, and the plan's suggested one ([`req-api-frame`](requirements/api.md#req-api-frame))
    turned out to be about the frame and the touch target, not about what stands below it
  - the decision is [0022](decisions/0022-one-message-line.md): **one message line everywhere,
    the error takes it**, and the argument the finding offered for a second row — a group's
    message describes a SET — died on the measurement, because the checkbox and the select are
    single controls and both did the same thing
  - cost: half a day (the decision, two gates and the prose) · _notes:_ **done** — three
    templates and three `describedBy` computations; the gate is in two independent parts,
    behaviour per control (`field-controls.spec.ts`, three cases) and structure over every
    template (`check-aria.mjs` point 6, `parseTemplate` — a hint part and an error part must
    be branches of one conditional), with `hint-beside-error` as the prepared input. Both
    were written before the fix and both fired. What the task really found is
    [`lesson-76`](lessons.md#lesson-76): the wrapper's two modes each had a green test and the
    difference between them was nobody's assertion

- [x] **C7 — `options`, the only container part without the `group-` prefix** — **closed:
      renamed, and the promise got the static gate it never had**
  - `libs/components/radio/src/radio-group.html` — the group ships `group-label`, `group-hint`,
    `group-error` and `options`. The prefix came from a real collision with option labels
    ([`lesson-15`](lessons.md#lesson-15)), and this one part stayed outside the rule that
    [`req-api-parts-unique`](requirements/api.md#req-api-parts-unique) records as a fact
  - it collides with **nothing** today, so this is neither an a11y defect nor a forced change:
    `req-api-parts` promises stability and being written down, not guessability. Left alone
    deliberately, the same call as C6 — with the difference that a rename is now a visible
    change to the public API (the parts snapshot), not a quiet fix
  - cost: minutes for the change (`options` → `group-options`, nobody uses it in tests or in the
    sandbox), the decision is the whole task · _notes:_ **done** — one line in the template,
    the card, and the snapshot rewritten so the change to the public API stands in the diff.
    **What decided it was reading the promise literally**: `req-api-parts-unique` says the
    container's parts carry a prefix of their own, not "the parts that would collide" — so the
    code was out of line, not the requirement, and the rule is worth keeping because `options`
    is exactly the kind of generic word a second component will want. Renaming is free today
    and one-way after the first release, the same argument as
    [0018](decisions/0018-no-sass-entry-point.md). **The finding named one part; the rule names
    the class**, and it turned out measurable without any register of container components:
    **point 6 of `check-parts`** — a component whose parts share a prefix gives it to all of
    them. "Is this a container" is not decidable from a template (a button projects content
    too); a component disagreeing with itself is. Scope written into the gate rather than
    guessed at: it fires only where there is exactly one shared prefix, so a future component
    with deliberate sub-namespaces (`panel-header` beside a `trigger`) is the day to decide
    whether it needs a register — inventing one now would be machinery for a case that does
    not exist. Proof on the real input, not only on the fixture: `group-options` renamed back
    fires point 6 by name. **The requirement gains a static gate it never had** — until now it
    stood on two e2e cardinality assertions, that is on the pages we happen to render
    ([`lesson-65`](lessons.md#lesson-65) one requirement over)

- [x] **C8 — forced-colors rules lose on specificity to the base rules**
  - `libs/components/button/src/button.scss` — `:host([disabled])` inside
    `@media (forced-colors: active)` has specificity (0,2,0) while the base rule
    `:host([disabled]:not([data-pct-loading]))` has (0,3,0). A media query adds no specificity,
    so `color: GrayText` **does not win**. To be checked in the other five stylesheets with a
    forced-colors block (`checkbox`, `radio`, `select`, `field`, `text`)
  - **no symptom today**: chromium and firefox repaint the result with the user's palette
    whichever rule won, so the measurement comes out correct. It is visible only in webkit,
    which does no substitution ([`lesson-56`](lessons.md#lesson-56)), and it will be visible
    everywhere from the day any part of the library gets `forced-color-adjust: none`
  - this is a declaration without coverage, the same family as a dead token nothing paints:
    code that looks like it handles a case and does not
  - cost: ~0.5 day including measuring whether it can be written as a `check-styles` rule
    · _notes:_ **done** — it can, and the measurement was worth more than the fix: **five
    sheets carried it, not one**. Point 7 of `check-styles` compares each declaration of the
    mode with the base rules whose elements it claims and asks who wins — on sass's output
    (the text a browser parses, so nesting and `&` are already resolved) and only where one
    selector's match set is contained in the other's, a "don't know" costing an unexamined
    pair where a wrong "yes" would cost a false accusation. In two sheets the declaration was
    really dead: the disabled checkbox and radio kept a theme surface instead of `Field`, and
    an active option in the panel a theme background although the cursor there is the outline.
    In three the result was **right for the wrong reason** — a bare field draws no surface and
    no ring, a trigger inside the chrome no ring of its own, and the base rules said so while
    the mode's block never did. The second kind is the first one waiting for somebody to
    reorder a sheet, so both are written out now. A block that spells the more specific state
    out itself is not a hole and is not reported — the exemption is measured too, in the
    reference input, because a case directory can only prove a check FIRES
    ([`lesson-70`](lessons.md#lesson-70)). What made the whole thing invisible is the mode
    itself: chromium and firefox substitute the colours, so the screenshot, the axe audit and
    every e2e assertion come out the same whichever rule won — measured after the fix as well,
    the 12 cases of `forced-colors.spec.ts` pass exactly as they did before. And the one engine
    that would show the difference runs none of that file: webkit does not have the mode, so
    `browsers.policy.json` excludes it on measurement (`lesson-56`). The defect had **no runner
    anywhere**, which is why the rule had to be a static one. Proof on the real input, not only
    on the fixture: the button's rule shortened back to `:host([disabled])` fires by name, four
    declarations at once

- [x] **C9 — a condition in a template is measured by nobody**
  - concerns: [`req-quality-unit`](requirements/quality.md#req-quality-unit) — the registry says
    ✅, and it is right about what it measures: the floor holds, the denominator is guarded.
    What has no owner is the **metric** — `tools/check-coverage.mjs` reads `total.lines.pct`
    and Stryker mutates `.ts` only, so a guard living in a template is in neither
    ([`lesson-62`](lessons.md#lesson-62), measured: the guard removed, 213 cases green)
  - the number that saw it exists already — `select.html` read 100% of lines against 85.71%
    of branches — so the cheap half is a **branch floor on templates** in `coverageThresholds`
    plus a point in the gate that the two thresholds are declared, not inherited
  - the expensive half is the one worth arguing about: today the arms of an `@if` in six
    templates have never been counted, and a floor set at what they measure ratifies whatever
    that is. The order is therefore **measure first, choose the floor after** — the same order
    the mutation snapshot was built in
  - what the fix does NOT buy: mutation testing of templates. A branch count says an arm ran,
    not that anything would have noticed it being wrong
  - cost: ~0.5 day for the measurement and the floor · _notes:_ **done** — and the measurement
    took the cheap half apart before it could be built. **A branch floor on templates would
    not have caught the defect this task was written from.** Three templates, one run, four
    metrics, and each metric was the only witness of one of them: `field.html` had never
    rendered the false arms of two `@if`s (a field with no label, a field with an add-on and
    no label) — **branches 84.61%, lines 100%**, because an arm not taken writes no line;
    `radio-group.html` had never created the standalone hint block — **lines 82.35%, branches
    100%**, its `@if` coming back from v8 with two arms at the same source position and the
    same count, 49 and 49, that is "both taken" said about a block created zero times; and
    `select.html` never calls `(overlayOutsideClick)` in a unit test — **functions 85.71%,
    statements 98.36%**, lines and branches 100% both. The number quoted in this finding as
    "85.71% of branches" was in fact the FUNCTIONS column, which is the same mistake one floor
    down: reading a metric that happened to be in view rather than the one that saw it
    ([`lesson-71`](lessons.md#lesson-71))
  - so the floor is **100% per template on all four metrics** (`check-coverage` point 6), not
    a number chosen to sit below the measurement — the two defects above read 84.61% and
    82.35%, both comfortably above the 80% the whole library is held to. It cannot live in the
    target either: the executor's `coverageThresholds` is four numbers and a `perFile` flag,
    `additionalProperties: false`. Templates are now **required in the report** (point 3) as
    the code is, because a template out of the report is the same defect with the percentage
    rising as it leaves. What a template cannot reach is an **exception with a reason and both
    sides**: `select.html` is exempted on the CDK's outside-click listener, guarded one floor
    up by an e2e in three engines, and the day somebody writes the unit test the exception
    fires as stale rather than covering the next defect quietly. The cheap half was kept for
    what it is worth — `coverageThresholds.branches` = 80 now stands beside `lines`, because
    vitest infers neither from the other and 535 branches stood under no floor at all
  - the three tests those numbers asked for are written, and the control is on the real
    repository: with them taken back out the `test` target is **green** (235 passed, both
    thresholds met) while point 6 names three metrics across two files. Sizes: 6 templates,
    136 of the 694 lines and 47 of the 535 branches — `select.html` alone could go entirely
    unrendered and the line total would still read 93.37%
  - one finding fell out of rendering that hint for the first time: the field **replaces** the
    hint with the error (`@else if`), the standalone radio group shows **both** and names both
    in `aria-describedby`. Two components, one promise, two answers — and nobody could see it,
    because nobody had ever rendered the second one. Recorded as **C13**, not fixed here
  - what the fix does NOT buy, as written above: mutation testing of templates. A line count
    says the DOM was created, a branch count that an arm was taken — neither says anything
    would have noticed it being wrong

- [x] **C10 — two `pct-radio` with one value both render checked**
  - `libs/components/radio/src/radio.ts` — `checked` is computed
    (`group.isSelected(this.value())`), so two options carrying one value both compute `true`:
    both hosts get `data-pct-checked`, which is what the CSS paints, while the native inputs
    share a `name` and the DOM keeps only the last of them checked. **The same promise as C2
    one component over** — and the group cannot measure it today: it has no
    `contentChildren(PctRadio)`, deliberately (a circular import), so it never sees the values
    its options carry
  - read off the code, not measured. The first task here is therefore a failing case; the
    second is the decision whether the registration channel a duplicate scan would need is
    worth its price, or whether the promise stays a documented one in the group's JSDoc
  - cost: ~0.5 day · _notes:_ **done** — measured first, as the finding asked. With `'pro'` on
    two of three options `data-pct-checked` reads `[null, "", ""]` and the natives read
    `[false, false, true]`: both duplicates paint themselves chosen, the browser keeps the
    **last** one checked, and that is the element carrying `role="radio"` — so the user sees two
    chosen options where a screen reader announces one. The **opposite** resolution to the
    select's, where the code picks the first match. One promise, two arbiters, so the message
    has to say which one is speaking
  - the channel turned out not to be a registration channel at all. The group's own comment said
    `contentChildren(PctRadio)` would close the import cycle — true of the **class**, false of a
    **query**: `PCT_RADIO_OPTION`, a token declared beside the group and provided by the option,
    lets the group read what its options carry with the import still pointing one way. Both
    roads now stand and neither replaces the other — the DOM road carries what the browser holds
    (`focus()` needs the checked native), the token road what the options MEAN, which the DOM
    cannot say at all for a non-primitive `T` ([`lesson-16`](lessons.md#lesson-16) amended)
  - the promise was **already written**: `req-api-generic` names `PctRadioGroup<T>` and has said
    since C2 that a duplicated pair is reported under `isDevMode()`. Only the select had the
    machine, so this is an unowned promise closed rather than a feature bought — and the
    requirement now states both mechanics instead of the select's alone
  - **the price is measured, not estimated**: `./radio` 19326 → 20560 B, of which the message
    text is **403 B** and the token, the query and the scan **831 B** (measured by rebuilding
    with a one-character message). Six cases, and the control of the control: with the report
    switched off three fail and their three mirrors stay green, the same shape as C2's — one of
    the six measures the defect rather than the report, so it stays green either way
  - [`lesson-72`](lessons.md#lesson-72) came out of the implementation, and it is the kind that
    ships green: a plain `effect()` reading a required input through a content query throws
    NG0950 for options built by `@for`. **Five of the six cases passed** — everything except the
    case the feature exists for, since a duplicated value arrives with the second list, not with
    the template. `afterRenderEffect` is the read that is late enough, and it costs 14 B more
    than the `try`/`catch` that would also have worked
  - the size snapshot's rewrite exposed **C14**: it records the last breach, not the last build,
    so this commit's diff shows five entrypoints growing that this commit never touched

- [x] **C16 — the language gate cannot see a foreign word with a Polish ending** — **closed,
      and the entry that described the finding could not survive it**
  - a section header of `tools/check-texts.mjs` carried an English name with a Polish case
    ending through B8, C1–C15 and every run since: 843 files, 5570 distinct words,
    0 exceptions, green. The word was fixed at C13; the blind spot it came out of was not
  - the second limb reads `/usr/share/dict/polish` minus `american-english`, so it sees a word
    that stands in the Polish dictionary. A foreign stem with a Polish ending stands in
    NEITHER — the Polish list holds no such stem, the English one no such tail — and the first
    limb (diacritics) has nothing to catch either
  - a scan for a hand-written list of such words found exactly one occurrence in the whole
    index, so the class is rare — which is the argument for a rule rather than a pass: rare
    and invisible is what survives eight passes
  - the shape is a **suffix on a foreign stem**, and point 5 of the gate forbids excusing
    shapes for a good reason — so the rule has to name the endings it looks for, not the words
  - cost: half a day · _notes:_ **done** — a **fourth limb** in `tools/check-language.mjs`:
    37 endings named in the source (the cases of a masculine noun, the two feminine diminutive
    forms whose ending leaves the stem whole, the verb and the adjective a borrowing grows),
    a word that no English list holds, and a stem that one does. **Naming a shape in the
    detector is the inverse of naming one in the register**, which is why point 5's rule and
    this list are not in conflict: an excused shape lets a class through, a hunted shape lets
    a class be seen. Two rules more in point 1 (26 in all) and three prepared inputs more
    (30): the limb has a probe of its own, and a canary for the English list — because it
    fails in the opposite direction to the second limb, which floods the run when its
    subtraction goes missing while this one **simply goes quiet**
  - **the measurement over the whole index: 16 words**, of which 4 are the class and 12 are
    noise that enumerates (an initialism with a vowel after it, the split's own debris, an
    npm account, a matcher) — the design work exactly where [`lesson-60`](lessons.md#lesson-60)
    put it, in a `borrowings` group of the vocabulary. The artifact limb found one, `rgba`,
    and that is the whole of what the public surface carries
  - **all four of the class stood in this file, in the entry above** — the plan spelled its
    examples, so the first green run of the new limb was red on the position that described
    it. They moved into the gate's own tree, where the constant of `lesson-60` already lives,
    and the entry now points at the specimen instead of quoting it
    ([`lesson-77`](lessons.md#lesson-77))
  - proof on the real input and not only on fixtures, and the input is the historical file
    rather than a made-up one: `tools/check-texts.mjs` restored from `a5b1a74~1` fires at
    **line 478**, the line the finding named. The vocabulary count in the policy was one out
    while nobody was counting (103 written, 104 held) — corrected in passing
  - the register's aliveness rule widened with the limb rather than beside it:
    `vocabulary/word-not-polish` became `word-not-flagged`, since a list with one meaning —
    the words this repository writes that are not Polish — cannot have one aliveness test per
    limb. What the limb **cannot** see is written down rather than left to be discovered: a
    case that softens the stem's last letter replaces it, so no strip returns the stem

- [x] **C14 — the size snapshot records the last breach, not the last build** — **closed: the
      band was measured, and it was deciding a second thing nobody had argued**
  - `tools/check-bundle.mjs` holds every entrypoint to its snapshot ±5% and rewrites the file
    only when that band is crossed, so the recorded numbers age. Measured on an unchanged tree
    before C10 touched anything: `./button` 8116 against 7932 in the file, `./core` 2723 against
    2628, `./field` 39294 against 38479, `./select` 32400 against 32114 — every entrypoint had
    drifted upward inside the tolerance since C2 last wrote it. The likeliest source is C8: a
    stylesheet is compiled into the FESM, so a forced-colors block is bytes
  - the consequence is a **false diff**: the first commit to cross the band rewrites the whole
    file, and a reader who trusts the diff attributes months of drift to one change. C10's is
    that commit — `./radio` is its 1234 B, the other five lines are everybody else's
  - the question is which of the two the file is: a **budget** (the numbers are a baseline, the
    drift is the tolerance doing its job — and then `--write` must touch only the line that
    breached) or a **snapshot** (every byte rewrites it, the diff is honest and noisy). The
    mutation snapshot next door answers it a third way, with a two-sided per-file tolerance
  - the figures above are in the **old unit** — C11 has since made the number what an
    application carries rather than what the tarball weighs, and rewrote every row. The
    finding is unaffected: it is about when the file is written, not about what is in it
  - **the answer is "snapshot", and the band went out with the question**
    ([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)): point 9 compares to
    the byte, in both directions, and `--write` stays the one command that accepts a change.
    What the finding put as one question turned out to be two, and the second had never been
    argued — **a band decides when a run fails AND when the record is rewritten**, so a drift
    inside it is not accepted, it is simply never written down
    ([`lesson-78`](lessons.md#lesson-78))
  - **what settled it is a measurement rather than a preference.** A tolerance is for a
    measurement that wobbles, and this one does not: two runs over the same artifact are
    byte-identical, and so are runs with ~100 characters added to the probe workspace's path
    and to the artifact's — the two lengths that differ between this machine and CI.
    `mutation.snapshot.md` keeps its ±2 points for exactly the opposite reason, a mutant killed
    by the clock depending on what else the machine was doing
  - the control is a run against the real repository, and it found a live drift the moment it
    ran: `./checkbox`, `./radio` and `./select`, **76 B each** — C13's price, taken off exactly
    the three controls that lost a second message line, and recorded nowhere. The fixtures moved
    to the same scale: `size-grew` is **one byte**, `size-shrank` is that same 76
  - the false diff is paid once more here and then never again: the snapshot in this commit
    carries C13's −228 B and nothing of its own, this task having touched no component. What
    the finding could not know is how wide the band was where it mattered — ±5% of `./field` is
    1115 B, a kilobyte of growth in steps with nothing anywhere to show for it
  - cost: minutes for either change, the decision is the whole task · _notes:_ **done** — and it
    left two findings behind. **C17**: the four generated snapshots are rendered whole and
    compared by their rows alone, so the two paragraphs this task rewrote in `size.snapshot.md`
    would have sat stale had no byte moved with them. **C18**: the gate's own file carries a
    Polish identifier that all four limbs of the language gate are blind to

- [x] **C11 — the size budget counts a template as text** — **closed: the probe runs the
      linker, and the overstatement it was written about ran in both directions**
  - `tools/check-bundle.mjs` — the probe bundles the FESM with esbuild and **does not run
    Angular's linker**, so a partially compiled template is measured as the string it still
    is: the HTML comments of `select.html` alone are 2928 B, and stripping them takes the
    entrypoint from 33178 to 30262 B ([`lesson-67`](lessons.md#lesson-67))
  - the bytes are real in the package on npm; in a consumer's bundle they are not, because
    the linker compiles the template into instructions before the app is bundled. So
    `size.snapshot.md`, which says it measures "the contribution of this library" to an
    application, overstates it by the size of the template source — and a maintainer's comment
    moves a budget that is supposed to be watching what a consumer pays
  - to be settled: either the sentence in the snapshot says what the number is (cheap, honest,
    and leaves the budget sensitive to prose), or the probe runs the linker first (costly, and
    the number becomes what an app really carries). **Not** an argument for templates without
    comments — the reason for a decision then simply lives in the TypeScript beside it
  - cost: ~0.5 day · _notes:_ **done** — the probe runs Angular's linker (an esbuild plugin
    over `@babel/core` and `@angular/compiler-cli/linker/babel`) and folds `ngDevMode` the
    way a production build does, plus **point 5 `linked`** with two prepared inputs, and the
    snapshot's sentence now says what the number is. Both roads, because they are not
    alternatives: the sentence alone would have described a quantity nobody wants, and the
    probe alone would leave the file claiming something it had only just started to deserve
  - **the finding's premise did not survive its own measurement.** Linking is not a discount
    for prose: on its own it moves `./field` by **−1850 B** and `./checkbox` by **+823 B** —
    a template compiles into more than it was written as or into less, depending on how much
    of it was structure. So the old figure was not an inflated version of the right number but
    a **different quantity**, erring both ways by about the width of the ±5% budget itself
  - **the bigger half was nowhere in the finding**: partial compilation emits
    `ɵɵngDeclareClassMetadata` carrying the whole decorator argument a second time — template
    and styles included — and a `debugName` on every signal input. Both are dev-mode only, and
    dropping them needs BOTH steps, because the metadata call in the package is unguarded and
    it is the linker that wraps it in the guard the define then folds. Either step alone is
    worth under 200 B on `./button`; together, **8116 → 4481 B**, `./field` 39294 → 22316,
    the recorded whole **121354 → 72999 B** with no component code touched
    ([`lesson-73`](lessons.md#lesson-73))
  - verified against the real thing rather than against documentation: an `@angular/build`
    production bundle holds no `ngDeclareComponent`, no `setClassMetadata` and no
    `setClassDebugInfo` — the three names point 5 now looks for. The denominator was cheap
    and worth having: babel over the same sources with **no plugin at all** moves every
    entrypoint by exactly **0 B**, which is what makes "the linker did this" a measurement
  - **point 5 and not point 11, because the first control run said so.** With the check last,
    a probe built the package's way failed the BUDGET first — and the budget's advice is
    `--write`, which would have written the wrong number down and called it accepted. The
    numbers here are the order, so everything that compares against the snapshot now stands
    behind it and the rest moved up one
  - the gate also caught a defect of its own author: the linker's per-file cache is keyed by
    path and the probes' entry file has a **fixed name** by design, so the first probe's
    imports were served to all the rest. Point 4 named it in one line — a `./button` probe
    that had brought in the primary entrypoint and no button
  - the price, written down: `@babel/core` becomes a declared devDependency (it was there
    transitively, which is [B7](#b-readiness-for-the-first-release)'s defect one repository
    up), and the target gains two `externalDependencies` — a bump of either changes the
    measured size. Measured and NOT changed by any of this: `pulled` and `external` are
    identical before and after, so only the size column moved. Byte figures quoted in earlier
    positions (C2, C10, D1) were taken in the old unit and are left as they were — they were
    true about what the package held. **C14 is untouched**: this rewrite of every row is the
    honest kind, the number having changed meaning, and the question of budget-versus-snapshot
    stands exactly where C10 left it

- [x] **C17 — a generated snapshot's prose is compared by nobody** — **closed, and the finding
      was right about half of its own subject**
  - all four generated snapshots (`size`, `parts`, `tokens`, `mutation`) are rendered **whole**
    by their gate — header, explanation, rows — and the finding said all four compare **rows
    only**. Two do not: `check-tokens` and `check-parts` hold the whole file in one `!==`, and
    their message has a branch for exactly this case ("the list of names is the same — the
    heading or the row order drifted"). `check-docs` compares the registry the same way. The
    two that read their file through a map of its rows are `check-bundle` and `check-mutation`,
    so the two paragraphs C14 rewrote in `size.snapshot.md` would have sat stale had no byte
    moved with them
  - the same shape as [C15](#c-open-findings) one floor down, with a worse disguise: the rows
    are right, so the file reads as measured. And its first line says "this file is generated",
    which is the sentence a reader trusts instead of checking
  - **what splits the four is what their messages can say** ([`lesson-79`](lessons.md#lesson-79)):
    a vanished token name needs no arithmetic, so the gate prints two lists and the difference
    is the message; a byte needs the row parsed into columns before "+800 B, +10.9%" is
    sayable — and once the rows are parsed, the parse becomes the comparison and the rest of
    the file leaves the measurement with nobody deciding that it should
  - the plan's either/or is settled the first way, and the second road turned out to be closed
    rather than merely worse: **only the gate that renders can compare**, since knowing what
    `size.snapshot.md` should say means running the build, and `mutation.snapshot.md` a Stryker
    run — a rule in `check-index` would have to repeat both measurements to have an opinion.
    So point 12 (`verbatim`) in `check-bundle` and the `score/stale-prose` rule in
    `check-mutation`, both standing **last** among their file's comparisons: the ordering trap
    the finding named, plus one it did not — with the differential or the builder control red
    the MEASUREMENT is in doubt, and its rendering is not a record anybody should be told to
    write down
  - **the two gates get different rules, and that is [0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)
    read literally.** `check-bundle` compares the file whole, because its rows are already held
    to the byte both ways. `check-mutation` cannot: the score wobbles, ±2 is the width of the
    wobble, and the columns beside the score wobble with it — a mutant killed by the clock
    moves the timeout count with the code unchanged. Its rule is therefore everything that is
    **not** a row, which is also the honest statement of what that tolerance covers
  - one control per gate, and between them they take the rule from both sides:
    `snapshot-not-the-render` keeps every row right and leaves the prose describing the ±5%
    band 0023 removed, while `stale-prose` widens `tolerance` in the policy to 3 and leaves the
    file quoting 2 — a text the renderer writes, and a value the policy feeds it. The second
    needed no new machinery in its fixture builder at all. Disarming either point gives
    "PASSED", so the count of rules whose disarming only moves a case onto a neighbour stays
    twelve
  - the first run against the repository was **green in both files**, unlike C15's: C14's
    rewritten paragraphs had reached `size.snapshot.md` on the back of the rows that moved in
    the same commit, which is precisely the accident the points now stop depending on
  - cost: ~0.5 day for all four · _notes:_ **done** — two gates changed, two already correct.

- [x] **C18 — a Polish word the Polish dictionary does not hold** — **closed: a fifth limb,
      and the cheap way out of its false positives was the defect it exists against**
  - `tools/check-bundle.mjs` named the function that builds an entrypoint's import specifier in
    Polish — one identifier, in a file the language gate reads, green over it through all of B8
    and C1–C17: 849 files, 5669 words, 0 exceptions
  - all four limbs were blind and each for its own reason: the word carries no diacritics;
    `american-english` does not hold it; **`/usr/share/dict/polish` does not hold it either** —
    the list has the noun it is derived from and the abstract noun made from that one, and not
    the agent noun made from either; and the fourth limb hunts the 37 endings of
    [`lesson-77`](lessons.md#lesson-77), none of which ends in the letter this word does
  - so it is the second class of word belonging to neither list, and the mirror image of C16's:
    not a foreign stem with a Polish ending, but a **Polish derivation the word list never got
    round to**. Agent and abstract nouns are formed productively there, and 4.4 million lines
    are still somebody's list of words rather than a language
  - **the fifth limb is the plan's narrower claim taken literally**: 26 derivational suffixes
    in three families (the agent and instrument noun, the abstract noun, the adjective and the
    diminutive), and a split counts only when the stem left behind is a word
    `/usr/share/dict/polish` confirms — both ends looked up, only the join between them
    guessed at. The Polish list is streamed against the words really found, so the stems a
    suffix leaves have to be asked for by name too, or the limb confirms nothing and fails the
    way it is worst at failing: quietly
  - **the measurement over the repository**: 5715 distinct words, **seven** splits — the
    specimen, the fourth limb's own probe inside the gate's tree, and five English agent nouns
    (`locator` in 21 files, plus four others). They are in the register as five words
  - **and that is where the task turned out to be about something else**
    ([`lesson-80`](lessons.md#lesson-80)). All five false positives share a property — the
    English verb behind each stands in `american-english` — so three lines in the detector
    would have removed every one of them and shortened the register with it. That is an
    **excused shape written where the rule against excused shapes does not reach**: point 5
    checks the format of the policy and nothing checks the format of the instrument. So the
    answer to "what may a detector name" has a direction rather than a place: **a shape may be
    named to SEE a class and never to stop seeing one**, and moving it into the code changes
    only who can review it
  - the word did stay where it was until the rule existed, and then moved rather than
    disappeared: it is `PROBE_DERIVED`, the fifth limb's probe, in the gate's own tree beside
    the fourth limb's — and `check-bundle.mjs` calls the function `specifierOf`. The
    denominator is what
    makes that safe: emptying the suffix list turns the reference input itself red, so the limb
    cannot go quiet without all 32 cases saying so
  - [`lesson-77`](lessons.md#lesson-77) happened **twice more while this was being closed**,
    and both times the gate said so within the minute: the first draft of the register entry
    quoted the five stems as evidence and turned the policy file red, and this entry quoted the
    fourth limb's probe and turned the plan red — the new limb catching the description of
    itself. Both now point at their specimen instead of spelling it, which is the rule the
    whole register runs on
  - cost: ~0.5 day · _notes:_ **done** — 27 rules, 32 cases, 120 excused words. It also found a
    hand-kept count already drifted: the fixtures README said its denominator had seven cases
    and it had nine, which is [C15](#c-open-findings)'s shape in prose no index gate reads.

- [x] **C19 — the select's panel closes on Escape twice, and only one of the two is written
      down**
  - `libs/components/select/src/select.ts` handles Escape in its key map (`close()` plus
    `preventDefault()`, which `select.spec.ts` asserts), and `cdkConnectedOverlay` closes the
    same panel on the same key by itself: `disableClose` is `false` by default, so the CDK
    detaches the overlay and `(detach)="close()"` finishes the job
  - **measured, not deduced**: an Escape dispatched on the panel — inside the overlay
    container, where the trigger's `(keydown)` cannot see it — closes the panel. So the second
    owner is real and no test names it. In the unit suite it stays invisible for a second
    reason: the CDK reads `keyCode`, and the spec's helper builds events with `key` alone
  - the behaviour is right today, both paths closing the same panel. What is not right is that
    **the layer's rule says one owner per key** ([0024](decisions/0024-the-closing-stack-is-the-dependency-s.md))
    and this component has two — and the day a component wants Escape **not** to close (a
    confirm dialog at E1), the owner it has to switch off is the one nothing here mentions
  - either the control keeps the key and says so (`[cdkConnectedOverlayDisableClose]="true"`,
    the trigger's handler being the single owner), or the CDK keeps it and the key map drops
    the case — which costs the `preventDefault` promise its current author. Whichever wins,
    the pinning test is the probe above
  - binds at: **E1**, where the question stops being cosmetic · _notes:_ **done, with E1.** The
    control keeps the key: `[cdkConnectedOverlayDisableClose]="true"`, so the CDK stops
    answering Escape and the trigger's map is the single owner. Which of the two roads to take
    was decided by a measurement rather than by the rule alone — a native dialog's close watcher
    honours `preventDefault()` on the **keydown** and ignores `stopPropagation()`, and the CDK's
    own Escape handler reads neither `defaultPrevented` nor anything else the control could set.
    So of the two owners only one could ever promise "this key was spent here", which is the
    promise a select standing inside a dialog lives on. The flag reaches Escape alone; the
    outside click and `(detach)` are untouched. The pinning test is the probe the finding named,
    dispatched the way the dispatcher delivers — on `body`, with `keyCode` — and it goes red the
    moment the flag comes off

- [x] **C20 — the message that announces itself does so on nobody's rule** — **closed at E5's
      first item, and the rule turned out to be the narrow one**
  - four templates draw their validation message inside `role="alert"`
    (`checkbox.html`, `select.html`, `radio-group.html`, `field.html`), and
    [0026](decisions/0026-one-channel-per-politeness.md) keeps them there deliberately: a
    sentence with a place on the screen announces from that place, and the shared channel
    carries what has none
  - **nothing measures it.** `check-aria` reads every template of the library and has six
    points; none of them asks whether an error part carries a live region. Point 6 pairs the
    hint and the error as alternatives of one conditional, which is `req-api-message`, and says
    nothing about how either is announced. So the fifth component to draw a message announces
    nothing, and the run stays green — the shape of `lesson-65`, where the one configuration
    that fails is the one no page renders
  - the promise is now written down and the gate is the half that is missing: a point of
    `check-aria` over the same templates (`data-pct-part` ending in `error` carries
    `role="alert"`), with the fixtures the gate already has a home for. Whether the rule is
    "an error part is a live region" or the narrower "an error part is `role=\"alert\"`" is
    the question the point has to answer — the first admits `aria-live` on a wrapper, the
    second is what all four templates do today
  - binds at: **E5**, where the switch and the textarea are the first components written after
    this decision that can draw a message of their own — and the toast at E7 is the first
    caller the `assertive` channel has ever had
  - _notes:_ **done** — `check-aria` grew a seventh point, and the question the item left open
    (a live region, or `role="alert"`?) is answered by the narrow reading: the error part
    itself carries `role="alert"`. An `aria-live` on a wrapper would satisfy a reader and move
    the OWNER off the sentence, and then two components would announce the same fact in two
    shapes — 0026's rule is one owner for one sentence, and this is that rule applied to the
    half of it that is drawn on the screen. The point reads the parsed tree, like points 4 and
    6, so it sees a **static** attribute and reports a bound one as something it cannot judge
    rather than passing it. The gate went green on the repository as it stood — four templates
    doing it right and none of them measured — and the switch shipped under it the same day,
    which is the whole point of a gate over every template rather than over a list of names
  - gate: `tools/check-aria.mjs` point 7 (target `check-aria`), over all 13 templates of the
    library; `req-a11y-built-in` carries the promise in words
  - control: `tools/check-aria.fixtures/error-without-alert` — the reference input's error part
    with the attribute taken off, rejected on point 7 and on nothing else, which is what says
    the other six pass over it unchanged

- [ ] **C21 — a one-letter Polish word walks through the language gate**
  - `tools/check-parts.mjs` said `has no card at all w \`docs/components/\`` — a Polish
preposition in a message a maintainer reads, in the repository whose whole first rule is
one language ([`req-project-language`](requirements/project.md#req-project-language))
  - **measured, not deduced**: the gate was run over the repository with the word in place and
    reported one violation, in a different file. So the word is not excused anywhere — it is
    **not seen**, and the reason is almost certainly the floor on word length that keeps `a`,
    `i` and `z` from firing on every initial, index variable and axis name in the tree
  - the word is fixed. What is not fixed is the class: `w`, `i`, `z`, `o`, `u` and `a` are all
    Polish words, and all of them are also things an English source writes constantly — so a
    rule here cannot be "look them up", it has to be about the CONTEXT a one-letter word stands
    in (prose between two English words, rather than an identifier, a table cell or a formula)
  - the same shape as [`lesson-77`](lessons.md#lesson-77) one floor down: the limb that reads
    the dictionary has a denominator nobody measures, and a word it never looks at is
    indistinguishable from a word it approved
  - binds at: the next language-gate task, or the first time a second one of these is found ·
    _notes:_ —

- [ ] **C22 — the two longest gates share one runner, and CI gives them half the cores**
  - measured, from the `task_history` table nx keeps in `.nx/workspace-data`:
    `components:mutation` **1052 s and 1030 s** on two clean runs, `sandbox-e2e:e2e`
    **603 s** — that is 17½ and 10 minutes on an **eight-core** machine, and they are the two
    longest tasks in the repository by an order of magnitude
  - CI runs them **in one job on `ubuntu-latest`, which has four vCPUs**, and in one
    `nx affected -t …` line, so nx is free to start both at once. Halving the cores and then
    dividing them between the two is exactly the arrangement that turned a 17½-minute run into
    a **30-minute** one on the machine this was measured on — with the difference that here it
    was an accident of two background commands, and in CI it is the configuration
  - so the number nobody has is the one that matters: **what a push that touches
    `libs/components` really costs in CI**. The estimate is 45–60 minutes, and an estimate is
    what this repository builds gates against
  - the fork is a real one and both halves have a price. **Split the job** — a matrix with the
    slow pair on runners of their own — buys wall-clock and pays with a second `npm ci` and a
    second Playwright cache per run. **Cap the parallelism** for the heavy targets keeps one
    job and pays by serialising what is already the critical path. **Move `mutation` off the
    pull request** — nightly, or on `main` alone — is the cheapest and the only one that
    changes what CI _promises_, which is why it is a decision rather than a setting
  - **measured since, and it is worse than "somebody waits"**: three runs of `components:mutation`
    over identical code gave `core/src/motion.ts` **91.38, 86.21, 91.38**. The file was not
    touched between them. Three of its kills are the **clock's**, and a clock-kill is a kill
    only while the machine cooperates — under load the same three mutants survive and the file
    drops 5.17 points, which is past the snapshot's ±2 tolerance. So the arrangement this item
    describes does not just make CI slow: **halving the cores is what turns a timing-dependent
    kill into a red gate on a change that touched nothing**, and the failure names an innocent
    file
  - **and it is not one file.** E4's clearing step ran the whole gate list in one `nx
run-many`, which is the closest thing here to what CI does, and the same run reported
    `core/src/placement.ts` at **89.23** against **98.46** from a run of its own — nine points,
    on a second file nothing had touched. So the reading is not a quirk of `motion.ts`'s three
    mutants: it is what every clock-kill in the repository does when the cores are shared, and
    the number of files that can name is unknown
  - **and E4's window step wrote the mechanism into the snapshot's own columns.** Four full
    runs that evening over code neither file had been touched by: `motion.ts` read 86.21, 86.21,
    86.21 and then **91.38**; `placement.ts` read 89.23, 89.23, 89.23 and then **98.46**. Run
    **alone** (`stryker --mutate` over just the two) they came back at 91.38 and 98.46 first
    time and in four minutes. The column that says why is the one the snapshot already carries:
    `killed (of that, by the clock)` reads `53(3)` and `64(6)` on a run that lands them and
    `50(0)` and `58(0)` on one that does not. So a clock-kill here is not slow, it is **absent**
    — the mutant survives — and how many are absent is decided by what else the run is doing
  - the practical rule that falls out, and it is the one this step followed: **the snapshot
    records the run that lands them.** A `--write` from a starved run buries a nine-point
    tolerance in two rows, and every regression smaller than that in either file becomes
    invisible. Which means `--write` is not a mechanical step for these two files — somebody has
    to look at the clock column — and that is a gate needing a person, which is what this item
    exists to remove
  - it does not touch the definition of done: every gate still runs, and a slow gate is a
    green gate. What it touches is whether anybody waits for it — and, on the measurement
    above, whether the run answers the same way twice
  - binds at: **B2** — the first push to a public repository is the moment somebody other than
    the maintainer waits for this run, and a first visitor who watches an hour of CI has
    learned something about the project. Sooner if a run starts hitting a limit · _notes:_ —

- [ ] **C23 — an option's owner is measured only where a page renders the panel**
  - `pct-select` draws a named section as `role="group"`, and the options below it are owned by
    the listbox **through** it — `option` names `group` and `listbox` as its context, `listbox`
    names `group` and `option` as what it may own. That relation is what makes a heading legal
    inside a list at all
  - **measured, not deduced**: with `role="group"` taken off the wrapper the axe audit answers
    with a **critical** `aria-required-children`, and it answers from the listbox's side —
    "element has children which are not allowed: `div[aria-labelledby]`". So the gate exists
    and it bites
  - **but it is an audit of a rendered, OPEN panel.** `check-aria` reads every template in the
    library and has six points; not one of them asks what stands between a role and its
    required context. The next component to draw a section — a menu with headings at E7, a
    listbox inside a table at E6 — will be green wherever no sandbox page opens that panel,
    which is [`lesson-65`](lessons.md#lesson-65)'s shape and C20's family exactly
  - the rule a static point would carry is the relation itself, read off the template: an
    element with `role="option"` may have `role="listbox"` or `role="group"` between it and its
    panel, and nothing else. The fixtures have a home already
  - binds at: **E7**, at the first component after the select to draw a heading inside a list —
    or sooner, the first time a grouped panel is written that no page renders · _notes:_ —

- [ ] **C24 — one template, compiled twice, and nothing says when that stops being worth it**
  - `pct-select` and `pct-multi-select` share `select.html` and `select.scss` in the sources
    and duplicate both in the artefact: an `@Component` compiles its own template and carries
    its own styles, so the entrypoint went 29058 → **46749 B** and became the largest in the
    library ([0034](decisions/0034-multiplicity-is-a-tag.md))
  - what the number measures is an application that imports the **whole** entrypoint, which is
    how every probe of `check-bundle` is written. Whether a consumer importing only `PctSelect`
    sheds the other class, its template and its styles is the question everybody would answer
    "of course, ESM" — and **nothing here measures it**, which is the same shape as
    [`lesson-45`](lessons.md#lesson-45): a promise whose denominator nobody looked at
  - the road out is known and is not free: draw the panel from an internal component
    (`role="listbox"`, the groups, the rows) that both triggers hold, which is one template and
    one stylesheet in the artefact as well as in the sources. It costs an encapsulation move —
    the rows would carry the panel component's `_ngcontent`, so the row rules leave
    `select.scss` and the `:host` half has to be rewritten ([`lesson-96`](lessons.md#lesson-96)
    is what that move gets wrong when it is done in a hurry)
  - binds at: **the third tag over this template** — an autocomplete or a combobox with a
    filter field would make it three copies, and three is where "one file, compiled n times"
    stops reading as a rounding error · _notes:_ —

- [ ] **C25 — inheritance was taught to the two gates that fired, and to none of the rest**
  - a component's surface can now come from a base class, and two gates said so out loud:
    `check-aria` reported a combobox that "declares no `ariaLabel`", `check-texts` a class the
    package does not export. Both follow `extends` now
    ([`lesson-100`](lessons.md#lesson-100))
  - the rest were **not audited, they merely stayed green**: `check-parts` reads parts off
    templates and `templateUrl` is not inherited, so it is right by accident rather than by
    design; `check-zoneless` reads `changeDetection` from the decorator, which a base could
    carry; `check-styles`, `check-icons` and `check-texts`'s own point 4 all read a class body
    or a decorator. A gate that reads the WRONG half of a component reports a false claim
    loudly, which is the good case — a gate that reads too little and finds nothing reports
    green
  - the smaller sibling: `check-texts`'s attribute merge is exercised by the reference tree
    only through a NON-speaking attribute (`role`), because a static speaking attribute in a
    host block is a violation of the gate's own point 3. So the half that matters most is
    proved by the repository and not by a fixture
  - binds at: **the second base class in this library** — at one, the two gates that fire are
    the measurement; at two, "which gates read a class body" has to be a list somebody keeps ·
    _notes:_ —

- [ ] **C26 — the mutation snapshot cannot say that a mutant errored**
  - the columns are `score · killed (of that, by the clock) · surviving · not covered ·
ignored`, and `RuntimeError` is in none of them — while `check-mutation` counts it in the
    **denominator**, deliberately and stricter than Stryker's own score. Two lines of the
    snapshot now carry a number that does not follow from the numbers beside it:
    `select.ts 88.89 32(0) 3 0 0` (32 of 36) and `multi-select.ts 97.14 34(0) 0 0 0` (34 of
    35). A reader checking the arithmetic finds a mistake that is not one
  - what an errored mutant is, in both cases: `if (row === null) return;` in `selectAt`. Drop
    the guard and the next line dereferences `null` inside a DOM listener, and the vitest
    worker dies rather than a test failing — "Cannot convert object to primitive value", twice
    restarted. It has always been so for `pct-select`; E4's filtering step gave the many-choice
    tag the same shape, because a pick now reads the row's value before anything else
  - binds at: **the next task that touches `check-mutation`** — a sixth column, or a score the
    columns can be added up to · _notes:_ —

- [ ] **C27 — the guard that keeps `null` away from a consumer's comparator is promised and not
      measured**
  - `selectedIndex` and `selectedOption` both filter `null`/`undefined` out before calling
    `compareWith`, and the JSDoc says why: a comparator an application wrote
    (`(a, b) => a.id === b.id`) blows up on a value it never declared. Both guards' mutants
    **survive**: with the default identity comparator, dropping the guard changes nothing that
    can be seen, and no test here supplies one that would notice
  - it is ten lines to close — an entity list whose value is set to `null`, asserting the
    trigger goes empty rather than throwing — and it costs a full mutation run to record,
    which is why it is a filler item rather than part of the step that noticed it
  - binds at: **the next full mutation run** · _notes:_ —

- [ ] **C28 — an empty listbox is a critical violation, and no case had ever opened one**
  - measured while auditing the waiting panel of E4's async step: axe reports
    `aria-required-children` at **critical** on a `role="listbox"` that owns no
    `role="option"`, from the listbox itself ("Required ARIA children role not present:
    group, option"). The waiting panel is now legal because `aria-busy` is the state ARIA
    has for a container whose content has not arrived ([`lesson-106`](lessons.md#lesson-106),
    [0037](decisions/0037-loading-is-a-fact-about-the-list.md)) — and the panel of a control
    whose list is **genuinely** empty is the same tree without that excuse: the recorded run
    over `select-empty` reports the identical violation
  - what it is not: a defect this step introduced. The empty panel has been drawn since the
    first version of the select, four axe cases stand over this component, and none of them
    had ever opened a panel with nothing in it — a state can be audited from four sides and
    still have a floor nobody stood on
  - what closing it takes is a decision rather than an attribute: a message row wearing
    `role="option"` is an option nobody can pick, dropping the role while the panel is empty
    is a combobox whose `aria-haspopup="listbox"` points at something else, and closing the
    panel over an empty list is a press that answers nothing. The one thing that is already
    settled is that the audit will hold the answer: the case is `a11y.spec.ts` with
    `select-empty` in place of `select-async`, and it is red today
  - binds at: **the next step that touches the empty panel** — E5 opens no listbox, so this
    is a filler item · _notes:_ —

- [x] **C29 — a snapshot written from a cached build records the cache** — **closed, and the
      property turned out to belong to writing a snapshot rather than to a gate**
  - the window's own measurement was clean, and the run beside it was not: `check-bundle`
    reported `./core` **18 B lighter** than `libs/components/size.snapshot.md` records, and
    `./menu` — which imports it — by the same 18. Neither file was touched by this step, and
    neither was anything they import
  - **measured, not deduced**: the whole change was stashed and the gate run against a clean
    tree, where it reported the same 18 B. So the drift is at `HEAD` and predates the window. A
    run with `--skip-nx-cache` then agreed with the NEW number, which is what names the cause:
    the snapshot recorded a build nx had cached, and the cached artefact was not what the source
    at that commit really produces
  - what makes this worth an item rather than a shrug is which gate it is. A size snapshot is
    the one measurement here whose whole job is to notice 18 B, and a value written from a cache
    is a reading of the cache: the next real regression of that size is invisible, because the
    baseline already moved by it. Every `--write` in this repository has the same shape, and
    `check-bundle` is only the one where a stale input is small enough to look like noise
  - the fix is a property of the target rather than a habit of whoever runs it: the snapshot's
    inputs have to be rebuilt for a write, which is `--skip-nx-cache` on the build the gate
    depends on, or a target that does not read the cache at all when `--write` is passed. Both
    are one line and neither is the point — the point is that nothing measures it today
  - binds at: the next `--write` of any snapshot, and no later than the first release that
    quotes a size · _notes:_ **done, at the item its own "binds at" named** — the textarea's
    `./field` row is the first size ever recorded here from a build the writing run produced.
    The item offered two one-line fixes and the choice between them is the whole of the work:
    `--skip-nx-cache` on the gate's `dependsOn` would slow every CHECK run down as well, and a
    check reading a cached artefact **is not the defect** — a wrong BASELINE is, because it
    moves the thing every later run is compared against. So the rebuild hangs on `--write` and
    on nothing else, and CI pays nothing.
    Where it lives is the part the finding got right and did not say out loud: `tools/fresh-inputs.mjs`
    is the **first shared module among the gates**, because the sentence "a record is written
    from what this run produced" is about writing a snapshot and not about bundles. Three
    writers read an artefact somebody else's target built and all three now call it —
    `check-bundle` (`components:build`), `check-parts` (the same) and `check-tokens`
    (`tokens:build`). A write that cannot rebuild its inputs **throws** rather than falling back
    to the cache quietly, which is the failure this exists to remove appearing one level up.
    Deliberately excluded, with the reason: `check-mutation`, whose input is a seventeen-minute
    run — forcing a second one would double the measurement rather than freshen it, and its
    snapshot already carries the ±2 tolerance of [0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)
    for a number that is not byte-exact anyway. That leaves the hole C31 fell into (a cached
    mutation run standing in for one that crashes) open on purpose and named here rather than
    forgotten

- [ ] **C30 — the checkbox writes an `aria-checked` that no engine reads**
  - `checkbox.html` binds `[attr.aria-checked]="ariaChecked()"`, a computed of its own feeds
    it, and `apps/sandbox-e2e/src/checkbox.spec.ts` asserts the value it produces. All three
    measure a string this library writes to itself: on a native `<input type="checkbox">` the
    checked state comes from the element's checkedness and the `indeterminate` PROPERTY, and
    the ARIA attribute is not consulted at all
  - **measured, not deduced** ([`lesson-112`](lessons.md#lesson-112)), in three engines and
    in Chromium's own accessibility tree: an unchecked box carrying `aria-checked="true"`
    comes out `checked=false`, and `indeterminate` set through the DOM with nothing written
    comes out `checked=mixed`. The attribute is inert in both directions
  - what makes it an item rather than a tidy-up is the class of defect it belongs to: an
    inert attribute cannot be wrong, so it can drift from the state it claims to mirror and
    nothing will say so — not the unit case that reads back what it wrote, not axe, which has
    no rule about it, not a reader, which never looked. It is `req-axis` with the layers
    rearranged: the gate exists, runs, passes, and examines our own echo
  - the repair is a deletion — the binding, the computed and the e2e assertion, with the
    assertion replaced by a reading of the accessible tree, which is what the switch's own
    cases already do. It moves a public part of the rendered DOM, which is why it is not
    folded into the step that found it
  - binds at: **the next task that touches `PctCheckbox`**, or the first screen-reader log,
    whichever comes first — a log is the one measurement that would show what a reader really
    says about the `mixed` state · _notes:_ —

- [x] **C31 — the skills tree breaks two gates at `HEAD`, one by measuring and one by
      crashing** — **closed, and the third one was reading a different repository**
  - measured on a clean worktree at `HEAD`, not deduced, and it is two failures with one
    cause — `e2df582` added a vendored Angular skills tree under `.agents/`, a symlink to it
    in each of two tools' directories, and a lockfile recording the source and the digest:
    - `node tools/check-reach.mjs` reports **45 tracked files nothing reaches**. The gate is
      right: nothing in the repository points at those trees
    - `node tools/check-language.mjs` **crashes** — `EISDIR: illegal operation on a
directory` at `readFileSync`. Four of the new entries are tracked as SYMLINKS to
      directories (mode `120000`), and the gate reads every path in the index as a file
    - and behind the crash there is a violation waiting: run over the same index with the
      symlinks taken out, the gate reports the **lockfile** — two fragments of the hex
      digests read as Polish words. So the file needs a register entry, and nobody has seen
      that yet because the run never got that far
    - `nx run components:mutation` **crashes too**, and on the same symlink. Stryker copies
      the repository into a sandbox and walks it itself, so `ignorePatterns` in
      `libs/components/stryker.config.json` is its only filter and none of the three agent
      directories is in it. **`check-mutation` therefore cannot run at all**, and with it the
      only machine that answers whether the unit tests catch anything
  - **the third one is the reason nobody saw the first two**: `mutation` had not re-run since
    the skills commit, because nothing in its `inputs` had moved — the failure sat behind a
    cache hit and came out on the first miss, which was a new component's `.ts` file. That is
    **C29**'s shape one floor up: a cached result standing in for a measurement, and the thing
    it stood in for was a crash
  - so CI is red for a reason that predates this item and has nothing to do with any
    component, and the halves need different answers. The reach half is a **judgement the
    gate cannot make**: those trees are opened by an outside tool that finds them by
    convention, which is exactly what `tools/reach.policy.json` has a `roots` form for — and a
    root entry has to NAME the reader, which is a fact about somebody's tooling rather than
    about this repository's sources. The language half is not a judgement at all but a gate
    that stops at the first input it was not written for. A symlink carries no text of its
    own, so it is a file to STEP OVER rather than to read — and a crash and a pass are the
    same thing to a run that ends
  - what makes it an item rather than a patch in passing is that the answers are one
    decision: whether a tracked symlink is part of this repository's material at all — and,
    before that, whether a tree of vendored skills belongs in the index rather than in
    `.gitignore`. Reach, language and Stryker have to say the same thing about it, and "an
    agent reads it" is not a reader
  - binds at: **immediately** — this is the only open item whose subject is a red CI rather
    than a promise without a gate · _notes:_ **done**, and the one decision the item asked for
    is [0040](decisions/0040-a-lockfile-is-material-the-tree-it-locks-is-not.md): **the
    lockfile is repository material and the tree it locks is not.** The split already stood
    one directory up — `package-lock.json` tracked, `node_modules` not — and the three
    arguments for reusing it were that no tool configured here reads the vendored directory
    at all (the two that are configured reach it through links, and the reach policy has said
    since B9 where the first of them takes its workspace skills from), that forty of the 42
    files are reference pages about a framework shipping a minor every few weeks, and that a
    register entry would have had to name a reader whose honest name is "any agent tool" —
    which is the absence of one. So `.gitignore` took the trees, the index kept the lockfile,
    and the lockfile got the two entries it needs: a **root** in `tools/reach.policy.json`
    naming the installer that reads it by name, and a **`generated`** entry in
    `tools/language.policy.json` — every value in it is a source, a path or a digest, and hex
    read as letters gives the same debris `package-lock.json` gives by the thousand
  - **and the first gate had already gone green on its own, which is the finding worth more
    than the fix.** By the time this item ran, `check-reach` reported a clean repository:
    the commit that wrote C31 down had spelled the tree's path with a wildcard after it, which
    is a legal mention by [`lesson-61`](lessons.md#lesson-61)'s own rule, so the walk entered
    the dead island through the paragraph explaining that nobody enters it. The same entry
    quoted the two hex fragments and the language gate then reported them at `docs/plan.md`
    as well — the report of a violation being a fresh instance of it, which is where
    [`lesson-77`](lessons.md#lesson-77) had already ended once and did not generalise, because
    it looked like a property of a gate that hunts words. It is not:
    [`lesson-113`](lessons.md#lesson-113) — **a document in the git index is an input to every
    gate that walks the index**, and a gate that turns green on a commit that only wrote prose
    has not been fixed
  - **what untracking did not fix, and could not**: the mutation run went on crashing on the
    same path afterwards, because Stryker copies the WORKING TREE and git tracking is not a
    property of the disk. That is [`lesson-59`](lessons.md#lesson-59) a second time, on a new
    failure mode — `EISDIR` on a link to a directory rather than `ENOENT` on a race — and the
    remedy is where that lesson already put it, in `ignorePatterns`, which now names the three
    agent directories and carries the reason
  - gate: `check-reach` and `check-language` green over the whole index (1050 tracked files,
    1004 of them scanned), and `check-mutation` green over a run that starts at all — 2261
    mutants, score 82.13% against an 80% floor, where the target had been producing a stack
    trace in five seconds
  - control: the language gate's reader is proved on constants at every run, in **both**
    directions — a regular file and an executable kept, a symlink and a gitlink stepped over.
    It is the one layer the 32 fixtures cannot reach, a case there being a list of files and
    never an index, and the middle is the silent failure: a wrong set of modes drops real
    files and reports a smaller, cleaner repository than the one that exists. Proved the other
    way too, end to end: a symlink to a directory added to the index takes the run to its
    report instead of to a stack trace

- [ ] **C32 — the two READMEs list the entrypoints, and no gate reads either list**
  - the npm page's **Entrypoints** table
    ([`libs/components/README.md`](../libs/components/README.md)) names seven of the twelve
    entrypoints the package really exports: `./dialog`, `./tooltip`, `./popover`, `./menu` and
    now `./switch` are missing, and its **Components** section stops at the select. The
    repository's own `README.md` carries the same list, one line shorter still, inside the
    layout tree
  - B3 wrote that page and it was true then. Four components have been built since, each with
    a card in `docs/components/` that `check-parts` compares against the built package — so the
    inventory a MAINTAINER reads is measured and the one a VISITOR reads is not. That is the
    asymmetry worth an item: the npm page is the first thing anybody sees, and it is the only
    surface here whose drift nothing notices
  - the shape of the gate is already known, twice over: `check-parts` point 5 finds a card by
    the selector it names, and `check-tokens` point 3 requires a component token's name to
    match a real entrypoint manifest. The same reading over the README's table — every
    `libs/components/*/ng-package.json` has a row, every row has a manifest — is the missing
    half, and it is cheap because the denominator is already computed by two gates
  - it is not fixed in passing deliberately: putting five rows in by hand today leaves the
    same page to drift at the sixth component, which is exactly how it got here
  - binds at: **B2**, the first push to a public repository — that is the moment the npm page
    stops being a draft and becomes what a first visitor reads · _notes:_ —

- [ ] **C33 — the mutation run measures 22 of 36 source files, and nothing says which 22**
  - `mutation.policy.json` holds two lists and guards them beautifully in one direction. Its
    own prose says why: "narrowing the pattern is the cheapest way of raising the score", and
    the `patterns` copy plus the `files` inventory together make a file that **drops out** of
    the measurement fire the gate. Neither says anything about a file that was never in
  - measured at the textarea: 22 of the 36 source files under `libs/components/*/src` are in
    the set. Outside it are `field.ts` — the wrapper every control in the library is drawn by —
    `checkbox.ts`, `radio.ts`, `radio-group.ts`, `switch.ts`, `text.ts`, `button.ts`,
    `menu-item.ts`, `menu-trigger.ts`, `select.template.ts`, the two field slots and, as of
    this step, `autosize.ts`. **The slider added a third**, `slider.ts`, by doing nothing at
    all: a new entrypoint is outside the set the moment it exists
  - **the shape is [`lesson-45`](lessons.md#lesson-45) one floor up, and the policy names that
    lesson itself** — about a denominator narrowed on purpose. What this item is about is a
    denominator that was never widened: a new behaviour file lands outside the measurement by
    **default**, silently, and the score keeps rising because the files it is computed over are
    the ones somebody already wrote tests for
  - what makes it an item rather than a chore is that the list is not obviously wrong. Some of
    the fourteen really are declarative — `aux.ts` is two empty classes — and Stryker's
    `noMutants` register exists for exactly that. So the work is a **rule**, not a bulk
    addition: what property puts a file in, checked by the gate against the sources, with the
    deliberate absences named and reasoned in the policy the way every other narrowing here is
  - the price is known and is the reason this is not done in passing: the run is seventeen
    minutes, and widening it means both a longer run and a first reading full of survivors
    somebody has to answer for one file at a time — which is the work, not the obstacle
  - binds at: **the next task that touches `mutation.policy.json`**, or the first component
    whose behaviour is genuinely its own rather than the chrome's — whichever comes first.
    **Both have now happened, so this item is next** — it was not done inside E5 because it is
    a gate rule with its own fixtures and controls, and E5 was a component
  - _notes:_ the date picker added four files, and **two of them went into the measurement —
    not by a decision, by the gate.** The set is 24 files and 2575 mutants now, against 22 and
    2261; the score moved 82.18 → 82.87, so the two came in above the floor rather than being
    carried by it — `day.ts` at 95.83 and `locale.ts` at 80.49. The run's own reading was
    lower first (92.41 and 77.44) and the survivors it named were worth answering: the
    `maximize()` road no case had ever entered, the window's oldest year, the formatter cache,
    and a `setUTCHours` that does nothing. `check-mutation` point 3 requires every spec in the git
    index to appear in the report's `testFiles`, and Stryker lists a spec there only when its
    tests covered MUTATED code. `day.spec.ts` and `locale.spec.ts` touch no Angular at all, so
    they covered nothing in the set and the gate read them as "did not run" — a false sentence
    with a true consequence, because the only remedy is to measure the files they cover. So
    `day.ts` and `locale.ts` are in, and `calendar.ts` and `date.ts` are out, which is this
    item's own content drawn in one diff: **the rule that decides is "does some spec of this
    file touch a mutated one", and nobody wrote that rule down.** The two that stayed out have
    specs that render components, so they pull `core` and satisfy the gate while contributing
    nothing to the score — exactly as `switch.ts`, `autosize.ts` and `slider.ts` do

- [ ] **C34 — a control knows its text is not a date and has no channel to say so**
  - `<pct-date>` reports malformed text with `aria-invalid="true"` and a `data-pct-malformed`
    state, and puts **no sentence** in the message line. Not a wording decision: `errors` is an
    `input` the form owns, and `PctFieldControl.errors` is the signal the chrome reads — so a
    control cannot add an error of its own without shadowing the member the
    `FormValueControl` contract requires. Two members cannot share one name
  - what the user gets today: a required date typed as `31.02.2026` leaves the value `null`,
    so the form says **"this field is required"** while three numbers stand in front of them.
    The red border and the ARIA flag are true; the sentence is wrong, and it is the form's
  - the shape of the answer is a second channel on the contract — a control-side error the
    chrome merges with the form's — and it is not the date field's alone: `[pctNumber]`
    silently clears junk on blur for want of the same channel, which is `req-api-number`'s own
    complaint about `<input type="number">` committed one floor down
  - binds at: **the first control that has to say something the form cannot know**, which is
    either the next one with a parser (a time field, a masked input) or C34 itself being
    picked up as filler · _notes:_ —

- [ ] **C35 — a state attribute that contains another entrypoint's selector is read as that
      entrypoint**
  - `check-bundle` point 7 reads an entrypoint's presence in a probe two ways — the bundler's
    metafile and a search of the bundle's TEXT for a marker, which is a component's selector
    from the built package — and requires the two to agree. The calendar's chosen day was
    `data-pct-chosen` only after the gate fired: written `data-pct-selected`, the way the
    select writes the same idea, the text `pct-selected` **contains** `pct-select`, so every
    bundle holding a calendar read as holding the select as well
  - the gate is right that the text is ambiguous and the report it gives is exactly the drift
    it exists for. What is missing is the rule one floor up: **no `data-pct-*` name may contain
    an entrypoint's selector as a substring**, and nothing says so — point 6(d) already guards
    markers against each other and stops there. The next component to want a `selected`,
    `switch`-ish or `menu`-ish state word finds this the same way, by a gate firing on
    something that looks like a tree-shaking defect and is a naming one
  - the shape of the answer is a word-boundary read in the marker scan, or the rule written
    into `check-parts` where part names already live. Which of the two is the item
  - binds at: **the next `data-pct-*` name that collides**, or the first change to
    `check-bundle`'s marker scan — whichever comes first · _notes:_ —

- [ ] **C36 — a message reports nothing by colour, and the channel that would repair it is a
      decision nobody has made**
  - every toast is drawn the same: one surface, one edge, one sentence. Success, warning and
    failure look alike, and the only thing that separates an urgent message from an ordinary
    one is what it is announced as (`role="alert"`) and the clock it does not have
  - that is deliberate and it is written down
    ([0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)): a tone
    painted in colour alone is a state carried by colour alone
    ([`req-a11y-forced-colors`](requirements/a11y.md#req-a11y-forced-colors)), so a tone needs a
    second channel, and the only one a card of text has is an **icon**. An icon is a public
    name and a promise that supplying one replaces the drawing
    ([0011](decisions/0011-icons.md)), so "success, warning, danger, info" is four names added
    to `PctIconName` at once — the kind of set D1's rule says one consumer cannot judge
  - what the item is: the decision, not the CSS. Whether tones exist at all; if they do,
    whether the icon is the library's or a slot; and whether the same set then serves the
    field's error, the dialog's confirm and whatever the banner turns out to be. Every one of
    those wants the same four drawings, which is exactly why the first component to want them
    should not settle it alone
  - binds at: **the second component that wants a tone** — a banner, an inline alert — or the
    first consumer report, whichever comes first · _notes:_ —

- [ ] **C37 — the assertive channel has no consumer, and therefore no gate**
  - `PctAnnouncer` opens two regions and has done since D4. The polite one is read by the
    select's empty panel and measured in `core.spec.ts`; the assertive one is created, hidden,
    exported — and spoken through by nothing in this library
  - 0026 said so out loud and named who would fix it: "the first callers are the toast and the
    dialog, at E1". Neither turned out to be one, and both for the same reason, which is 0026's
    own rule: a message with a place on the screen announces from that place. The dialog is a
    panel that takes focus; the toast is a `role="log"` with the message inside it
    ([0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)). So the
    prediction is not merely unfulfilled — it was **wrong twice**, and the second time on
    purpose
  - what is left is a mechanism this library ships, exports and never exercises: no unit case
    puts a sentence on it, no e2e page draws it, and the one thing that would notice it
    breaking is an application using it. That is the shape of a promise with no gate, and the
    two roads are opposite — find the consumer that needs an interruption with no place on the
    screen, or take the region out and let a consumer pass `'assertive'` into a channel opened
    on demand, which is the very failure 0026 refused
  - binds at: **the first message in this library that has no home** — or the next change to
    `announce.ts`, whichever comes first · _notes:_ —

- [ ] **C38 — a control in the corner is last in the page's tab order, and nothing carries the
      keyboard to it**
  - a toast's `Undo` is a real control on a real card, and it is a child of `body` — so it
    stands after every control on the page. A keyboard user who wants it walks the whole
    document first. The clock at least does not run out during that walk (an action makes a
    message standing, and focus inside the stack stops every clock), but "reachable in
    principle" is not the same promise as "reachable"
  - the usual answer is a global key that moves focus into the stack (F6 in several
    implementations, F8 in others), and the disagreement between them is the item: a library
    that installs a document-level listener is taking a keystroke away from the application,
    and this repository has measured nothing about which one is free
    ([`req-api-platform`](requirements/api.md#req-api-platform) is about not inventing what the
    platform already has, and here the platform has nothing)
  - the same gap will arrive from the other side at the first banner or skip link, which is why
    it is worth settling once: **how does a keyboard reach a region that is not where the
    reading order says it is?**
  - binds at: **the second body-level control this library draws**, or the first consumer
    report about the toast's action · _notes:_ —

## D. Phase 1 — the behaviour layer in `core`

The largest architectural risk. The list machinery (typeahead, `activeIndex`, skipping disabled
options) sat as private methods in `PctSelect`, and autocomplete, multiselect, menu,
combobox and a command palette all need it. **Extract before the second consumer, not after** —
otherwise [`lesson-21`](lessons.md#lesson-21) (the same logic copied into four controls) repeats
on a much bigger piece. **D1 has closed**, so that half of the risk is paid: what the walk
shares now stands in `core`, and what the roles do not share stayed with the control. **D2 has
closed the same way** — what an overlay severs stands in `core`, what a role decides stayed
with the select, and what the dependency already ordered was pinned rather than rewritten.
**D3 closed on the same reading**: of its four lines, one had a consumer and a measured defect
and three had none, so the layer holds the declaration that a panel takes no focus and the
modal half waits for the modal. **D4 closed on it too, and turned the reading around**: the
thing its line refuses — a live region per component — is already here, in four templates, and
it is correct, because those regions sit on messages the user can see. The channel took the one
change with no reader at all, which the line does not name. **D5 closed on a reading of its own**:
its line names a mechanism, and the mechanism named is the one that was measured out. A template
has two ways to be wrong — the name it is called by, the context it is handed — and
`*pctTemplate` is the one shape that checks neither, so the slot became a directive of its own
with the type carried by a required input. **D6 closed against its line twice**: the token it
names cannot hold a template at all, so an icon set is a component whose templates are the
icons, and the layer is not in `core` — measured there, it cost every entrypoint 754 B for a
component most of them never draw. **D7 closed last, and the phase is done**: the ban it asks
for is two bans, because the animation runtime reaches a consumer through a dependency and,
without one, through a binding that compiles with the package uninstalled.

Guiding principle: **mechanics from CDK, our own API** — CDK types never leak into the public
contract. The pattern is ready: `PCT_FIELD` is exactly that for the field chrome and its control.

- [x] **D1 — list navigation** → extracted from `PctSelect` into `core` · _notes:_ **done** —
      `pctListNavigation` in `libs/components/core/src/list.ts`: a function returning signals,
      the `pctFieldMessages` idiom that [0013](decisions/0013-no-headless-split.md) settled on.
      It owns the active index, skipping what cannot be reached, the edges and the typeahead
      prefix; **the key map stayed with the control**, because which key opens and which picks
      is a property of the combobox role, not of walking a list. Left out deliberately, one
      consumer being unable to tell a shared property from an accident of the only case:
      wrapping at the ends (a menu wraps, a listbox does not) and scrolling the active entry
      into view, which is DOM the walk never touches. Measured rather than declared: 17 cases
      under the primitive's own name ([`lesson-57`](lessons.md#lesson-57)), the select's
      keyboard cases unchanged as the proof that behaviour did not move, and the mutation run
      says **98.59%** for `list.ts` — `select.ts` rose 79.48 → 80.73 in the same pass, the
      weakly measured code having left it. **One mutant survives and stays**: `delta > 0` in
      `move()` reads the same as `delta >= 0` for every input but `move(0)`, and pinning a
      direction for a step of nothing would be inventing a promise to satisfy a mutant
      ([`lesson-60`](lessons.md#lesson-60) is the same instinct one floor down).
      Cost of the entrypoint, from the size snapshot: `./core` 1705 → 2628 B, `./select`
      30598 → 30510 B, and `./button` +44 B — the walk does not travel to controls that do not
      walk. The extraction also turned up a guard nothing had ever run
      ([`lesson-62`](lessons.md#lesson-62)); the two DOM cases it now has are here, the metric
      it exposed is **C9**
- [x] **D2 — overlay**: positioning, the closing stack (Escape order when nested), outside click,
      `inert` background, scroll lock, inheritance of theme and writing direction — the last one
      solved once in [`lesson-35`](lessons.md#lesson-35), to be generalised · _notes:_ **done**
      — `pctOverlay` and `PctOverlayPanel` in `libs/components/core/src/overlay.ts`: the open
      state, the four properties an overlay severs (theme, typeface, size, writing direction)
      and the anchor's width, plus one binding that puts on a panel **whatever the reading
      holds** rather than the four a template happened to name. The read is not a step of
      opening — `show()` **is** the read, so there is no path to an open panel that carries
      nothing, which is the half of `lesson-35` a control could previously forget. `PctSelect`
      is rewired onto it with its own spec unchanged, as the proof that behaviour did not move.
      **The six things this line named turned out to be three kinds of thing**
      ([0024](decisions/0024-the-closing-stack-is-the-dependency-s.md)): three with a consumer
      and a measurement behind them, two — `inert` and the scroll lock — with **no consumer at
      all** until there is a modal, and one already built in the dependency the library had
      already chosen. The CDK dispatcher delivers a keydown to the top-most attached overlay and
      to no other, so the closing stack is not code to write here but an ordering to pin: two
      overlays and two Escapes in `core.spec.ts`, and the rule that follows — **an overlay
      closes from the stack, never from a listener above the control**. Positioning stayed with
      the role for D1's reason (`'field'` is the chrome's vocabulary and the position list is
      the combobox's). Measured rather than declared: 11 cases under the layer's own name,
      100% on all four metrics for the new file. The cost is in the snapshot: `./core`
      2248 → 3185 B, `./select` 19494 → 20072 B, and **+11 B on every other entrypoint** — an
      unused `input` import that a directive in the shared kernel drags into a module every
      consumer already has. That last byte count is how the task found its second half:
      `./core`'s first directive turned the tree-shaking gate red on a bundle measured at
      1003 B that contains no directive at all, because point 4 read modules where the promise
      is about bytes ([`lesson-81`](lessons.md#lesson-81)). Three points of `check-bundle` moved
      onto the text read, and the fake library in its fixtures now has a mixed kernel, like the
      real one
- [x] **D3 — focus**: trap, restore, initial focus, roving tabindex as an alternative to
      `aria-activedescendant` · _notes:_ **done, and three of the four lines are deliberately
      not built** — `PctFocusStays` in `libs/components/core/src/focus.ts`, the declaration that
      a panel takes no focus, plus the measurement that says why the other three wait
      ([0025](decisions/0025-a-panel-says-whether-it-takes-focus.md)). The consumer count
      decided it, as at D2: the trap, the restore and the initial focus are the modal half —
      the same half `inert` and the scroll lock were deferred for — and the roving tabindex has
      no consumer either, `pct-radio-group` standing on native radios the browser walks and
      `pct-select` pointing with `aria-activedescendant`. What **does** have a consumer is a
      fourth thing the line does not name: the promise that focus stays on the trigger while
      the panel is open, which the browser breaks for free. Measured before it was repaired, in
      all three engines: a press on the panel's own background puts focus on `body`, the panel
      stays open, `ArrowDown` moves nothing — the key map sits on the trigger — and
      `aria-activedescendant` goes on naming the active option from an element that no longer
      has focus; only Escape survives, through the CDK's document listener (which is
      **C19**, seen from the other side). The guard reads `mousedown` and not the wider
      `pointerdown`, because the wider one cancels the compatibility events after it and in
      webkit that takes the `click` a tap needs ([`lesson-82`](lessons.md#lesson-82)); touch
      never had the defect at all. The negative control is a recorded run: `pctFocusStays` off
      the panel leaves every unit case green and all three browsers red — jsdom moves focus on
      no `mousedown`, so the unit suite can see the cancellation and never what it is for. One
      line went as the guard arrived: `selectAt` used to hand focus back to the trigger after a
      mouse pick, and the control no longer loses it
- [x] **D4 — live announcer**: one `polite` channel, one `assertive`, with deduplication — not a
      region per component · _notes:_ **done, and the region per component the line refuses was
      already here and stays** — `PctAnnouncer` in `libs/components/core/src/announce.ts`: two
      regions for the whole document, one `aria-live` value each, fixed when the region is
      created, opened by `afterNextRender` and cleaned up on the injector that made them
      ([0026](decisions/0026-one-channel-per-politeness.md)). The consumer count decided the
      shape again, as at D2 and D3. Four templates already draw their message inside
      `role="alert"`, and that is **right where it stands**: the sentence is on the screen, in
      the element `aria-describedby` names, and `role="alert"` is the one live region an
      assistive technology reads when it arrives with its text — which is what an `@if` around
      an error does. What has **no reader at all** is the select's empty panel, measured in
      three engines before anything was written: focus stays on the trigger,
      `aria-activedescendant` is absent because there is no option to name, `aria-describedby`
      is absent, and `texts().selectEmpty` sits in a `<div>` with no role inside the listbox —
      a sighted user is told the list is empty, a screen reader user hears "expanded" and then
      silence. So the channel has one consumer, it is polite, and it speaks the application's
      language, `PCT_TEXTS` being where the sentence comes from (`Aucune option` in the
      sandbox, which is what the e2e asserts). **The deduplication is what makes `retract`
      necessary** — a channel that will not repeat itself has to be emptied before the same
      words can be said twice, which is `attach`/`detach` again one layer down
      ([`lesson-68`](lessons.md#lesson-68)), and the select therefore withdraws on close **and**
      on being destroyed with the panel open. The task's second half is where CDK stopped being
      the answer: `LiveAnnouncer` hides its element with `cdk-visually-hidden`, a class from
      `@angular/cdk/a11y-prebuilt.css` — a stylesheet neither the README nor `ng add` mentions
      — so on the two this library does ask for, its element measures **573 × 18 px of visible
      text** at the bottom of the page ([`lesson-83`](lessons.md#lesson-83)). The promise in
      `req-a11y-built-in` named that class's owner by name and was amended, not obeyed.
      Measured: 11 cases under the layer's own name plus 4 on the select, 4 in three engines,
      mutation 85.97 → 86.70% with `announce.ts` at 94.44%, and the price in the snapshot —
      `./core` 3482 → 4440 B, +939 B on every entrypoint that re-exports it, `./select` a
      further 308 B. **The two mutants that survive are the hiding itself** — empty the style
      and every unit case stays green, because jsdom has no layout to make the region visible
      in; the mutant dies in the browser, where the e2e measures the region's box, which is
      [`lesson-82`](lessons.md#lesson-82)'s second half met again in a different file. Negative controls are two recorded runs, the
      announcement out and the withdrawal out, and they fail on different cases. The task left
      **C20** behind: the `role="alert"` this decision keeps is in four templates by hand and
      no gate reads it
- [x] **D5 — `*pctTemplate` / `TemplateRef`** → closes `req-api-templates`; unblocks icons
      · _notes:_ **done, and the shape the line names is the one shape that was measured out**
      — `providePctTemplateHost` and `pctReportOrphanSlot` in
      `libs/components/core/src/template.ts`, `PctSelectOptionTemplate` in
      `libs/components/select/src/select.template.ts`, the select's option row drawn by the
      consumer with a fallback to its own label
      ([0027](decisions/0027-a-slot-is-a-directive.md)). The consumer count decided that the
      layer gets built at all, as at D2, D3 and D4: the option row is this requirement's own
      binding trigger and the icons of D6 are the second caller, so two, not one.
      **A template has two ways to be wrong and they are bought separately**
      ([`lesson-84`](lessons.md#lesson-84)) — the name it is called by and the context it is
      handed. Four probes under `strictTemplates` settle it: an attribute is invisible to the
      compiler in **every** form (misspelt, unimported, structural or not), while a context
      guard types `let-option` only when the context type is fully known — a directive with no
      input has no inference site, so Angular instantiates its generic as `any`. So
      `*pctTemplate="'option'"` gives up **both** halves at once, which is why the slot is a
      directive of its own with a required input carrying the type: the context is checked by
      the guard, the spelt-right name by `NG8008`. The half that stays open is the
      **misspelling**, and the obvious repair was measured shut rather than merely disliked:
      `contentChildren(TemplateRef)` does see every template (`3/1` over three of them), but an
      `@if` in projected content **is** a `TemplateRef` — one with the condition false, two
      with it true, every anchor an identical `<!--container-->` — so the count accuses a
      consumer who wrapped a correct slot in a conditional, which is
      [`lesson-68`](lessons.md#lesson-68)'s defect. The check that survives runs the other way
      and is exact: a slot standing under a component that does not offer it reports itself
      through the element injector, and the case an `@if` between the two is **not** a fault is
      pinned in both suites. Measured: 4 cases under the layer's own name, 5 on the select,
      3 in three engines; `template.ts` at 96.00% with one survivor that is `isDevMode()`
      itself, total 86.70 → 87.25%. Two negative controls that fail on different cases — the
      report silenced leaves every rendering case green, the rendering taken out leaves every
      report case green. The price in the snapshot: `./core` 4440 → 5024 B, `./select`
      21582 → 23450 B, +48 B on every other entrypoint, and **a fourth peer**:
      `@angular/common`, for `NgTemplateOutlet` alone, argued for in
      `dependencies.policy.json` rather than added by reflex. Two gates moved on the way: the
      coverage exception for `select.html` (the denominator again, not the coverage), and
      `check-texts`, whose enclosure scanner could not see a **free function** — a free
      function's statements sit at the two-space indent a class puts its methods at, so it read
      `if (` as the enclosing method and called a guarded warning unguarded. It has a case of
      its own in the gate's fixtures now. And one thing the task found about itself: **`@param`
      could not be written anywhere in this package** — `param` is a Polish word by the
      dictionary, and the public surface admits no register of exceptions, deliberately. The
      tag had never been used here (`grep -c` says 0 before this task), so a standard JSDoc tag
      had been unavailable without anybody noticing. It is a word the dictionary reads wrong
      rather than an exception to be excused, so it joined `vocabulary.abbreviations` named
      singly — the one channel point 5 leaves open
      ([`lesson-80`](lessons.md#lesson-80)) — and the tag is in the artefact
- [x] **D6 — icons**: `pct-icon` over a projected SVG plus a `PCT_ICONS` token mapping semantic
      names to templates, with built-in defaults → closes `req-api-icons` · _notes:_ **done,
      and neither the mechanism nor the place the line names survived being measured** —
      `PctIcon`, `PctIconTemplate`, `providePctIcons` and `PCT_ICONS` in a new entrypoint,
      `@pacit/components/icon`, with `pct-select`'s arrow and `pct-checkbox`'s mark rewired
      onto them ([0028](decisions/0028-an-icon-set-is-a-component.md)). **A token cannot map a
      name to a template**, and that is a fact about the framework rather than a preference: a
      `TemplateRef` is a handle on part of a component's view, and a provider array at
      bootstrap is not in a view. Four probes over what a provider CAN hold
      ([`lesson-85`](lessons.md#lesson-85)) — the string of markup renders **nothing**, Angular's
      sanitizer deleting the whole `<svg>` from `[innerHTML]`, so the shape most icon libraries
      ship works only through `bypassSecurityTrustHtml` on consumer input; a component type
      renders correctly and puts the consumer's host element between the icon's box and the
      drawing. What is left is the fourth row: **an icon set is a component whose templates are
      the icons**, created once, outside the document, attached to nothing — and measured to be
      cheap, `createComponent()` giving a readable `TemplateRef` with no change detection at
      all and the slots inside it constructed as the view is built. The second half of that
      lesson is the counterweight to [`lesson-84`](lessons.md#lesson-84): `pctIcon="chevrn-down"`
      is **`TS2820`, with the right name suggested**, because here the string is the VALUE of an
      input typed `PctIconName` and not a selector — the name half D5 could not buy, bought for
      free. The **placement** is where the plan's line lost to the snapshot
      ([`lesson-86`](lessons.md#lesson-86)): in `core`, where section D puts it, the layer cost
      **754 B and `@angular/common` on every entrypoint**, including a button that draws no
      icon; in its own entrypoint the same code costs `./checkbox` 11429 → 13354 and `./select`
      23450 → 25336, `./icon` stands at 2552 B and the other four rows do not move by a byte.
      The built-in defaults stayed **in the templates that draw them** rather than in a default
      set, which is what keeps that true and makes `req-api-icons-custom` literal in a second
      sense: there is no icon set anywhere in the package. What the task really turned on is
      **where the styling contract lives**: the part, the size, the colour and the state a
      component paints (the arrow's turn, the mark's hiding) moved onto the `pct-icon` element,
      which survives a swap, and the drawing kept only its own geometry, painting itself in
      `currentColor`. Two gates say so — `check-styles` point 8 (no `fill` / `stroke` /
      `stroke-width` in a component sheet; the fixture is the shape this library shipped until
      today) and `tools/check-icons.mjs`, six points over the templates: the denominator, a
      drawing inside a `pct-icon`, a name on it, a drawing of its own under it, the published
      names against the drawn ones both ways, and no `data-pct-part` below an icon. The
      denominator earned its place on the first run — Angular namespaces what it parses inside
      an `<svg>`, so the walk saw `:svg:svg` and reported zero drawings in two templates that
      hold one each. A second gate moved for a reason of the same family as
      [`lesson-81`](lessons.md#lesson-81): `check-bundle`'s differential control pairs the
      smallest component entrypoint with the largest, and excluded from the candidates the
      **kernel** — what **every** other probe pulls in, a property only `./core` had ever
      had. `./icon` is pulled by two entrypoints and not by four, so the pair became
      `./icon` + `./select`, whose sum double-counts nothing and whose bundle is `./select`'s:
      red on a measurement that was working perfectly. Shared by ALL was never the property
      that mattered; shared by THESE TWO is. Measured: 8 cases under the layer's own name, 2 on the select, 2 on the
      checkbox, 2 in three engines, `icon.ts` at **92.11%** in the mutation run (total
      87.25 → 87.50), and the whole e2e suite green — **488 cases and not one visual baseline
      moved**, which is the claim the swap rests on: an element appeared in the DOM around
      every icon in the library and the page is the same page. The forced-colors spec did move,
      and honestly: it used to read `stroke` off the part, and the part is now the box, so it
      reads the box's `color` and the drawing's `stroke`. Negative control: the lookup in
      `PctIcon` returning `null` always — **7 cases red, 291 green**, every red one a
      replacement and every fallback case untouched; and the first run of it found one that
      should have gone red and did not:
      the set and the component drew the same NAME, so comparing names read the same either
      way, and the case now compares where each drawing came from. **The mutation run paid
      for itself twice over**: 77.50% on the first pass, with three of the nine survivors
      naming the same hole — the component-scoped set, the case the sandbox demo uses and no
      unit test did, and the destruction of a component that is attached to nothing and so
      would never be taken down by anybody else. Three more were optional chains on a field
      that is never null, that is defensive code with no reachable defect behind it; they are
      gone, and the file is at 92.11%. **The three survivors that stay are named**: the
      `isDevMode()` guard, which is [`lesson-60`](lessons.md#lesson-60)'s shape and D5's
      survivor met again; the token's own description string, a debugging name no assertion
      should freeze; and `name === null ? null : …`, which is equivalent — a set has no
      template under a name that is not a name, so both arms return `null`. The task left
      **C21** behind: `check-parts.mjs` carried a one-letter Polish
      word past every run of the language gate
- [x] **D7 — gate forbidding `@angular/animations`** → closes `req-api-animations` · _notes:_
      **done** — three points over the packed artefact, and the task's work was in finding that
      one line asked for three. Point 7 gained the rule `forbidden`: the banned **specifiers**
      (`@angular/animations`, `@angular/platform-browser/animations`, subpaths included) in the
      manifest, in the policy and among the imports — specifiers rather than names, because the
      second one reads as `@angular/platform-browser` to anything that asks for a package. It
      is evaluated **before** the rules that ask whether a dependency was deliberate, and that
      order is the finding: those rules answer an import with "declare it" and a declaration
      with "say why", so a ban placed after them would walk a maintainer to the forbidden
      dependency in two green commits and refuse on the third
      ([`lesson-88`](lessons.md#lesson-88)). Point 8 is the road with no dependency at all —
      an animation binding needs no import, in a template or on a host, and the four probes
      that measured it had `@angular/animations` absent from the workspace
      ([`lesson-87`](lessons.md#lesson-87)); its denominator is the count of component
      declarations, because the templates are only readable while the compilation keeps
      leaving them in the artefact as strings. Point 9 of `check-styles` is the requirement's
      other half, the one its **Binds at** named: a duration comes from the motion axis
      (`literal`) and a component sheet does not answer `prefers-reduced-motion` itself
      (`query`) — the e2e that guards `req-a11y-motion` measures the tokens, so a hand-written
      `150ms` beside them is invisible to it. Five prepared packages and two prepared inputs,
      each rejected on its own rule; the strongest of them is `dependency-forbidden`, where the
      dependency arrives declared, argued for and in the right field, and is refused anyway.
      `check-styles` gained a `rule` address for the same reason `check-package` has one — one
      point, two rules, and a case that cannot say which of them fired proves nothing. The
      recorded runs are in the requirement: all three roads fire on `dist/libs/components`

## E. Phase 2 — components

Ordered by architectural debt, not by popularity — with one reservation from
[decision 0016](decisions/0016-mit-irreversibility.md): the item with the highest build cost goes
**last**, because a release under MIT is irreversible and it is better settled with users in
hand. The numbers are stable, the list order is not.

Every new component fills in [`components/_template.md`](components/_template.md) — the DoD form
exists and is a condition of entering a release.

- [x] **E1 — dialog** — forces a focus trap, scroll lock, `inert`, focus restore, the Escape
      stack, SSR safety. The highest architectural gain per component. **Two of those arrive
      with it rather than before it**: `inert` on the background and the scroll lock are the
      modal half of D2's overlay layer, left out there for want of a consumer — a listbox panel
      that locked the page's scroll would be a defect
      ([0024](decisions/0024-the-closing-stack-is-the-dependency-s.md)). The Escape stack is
      **not** among them: it is the dependency's, measured in `core.spec.ts`, and what the
      dialog inherits is the rule that its own Escape may not live above its control
  - _notes:_ **done** — and the first question it answered was whether to build it at all.
    `<dialog showModal()>` was measured before anything was written and gives four of the six
    lines for free — the trap, the initial focus, the restore and `inert` — while severing
    nothing through the top layer. It was refused on one finding, measured twice in three
    engines: **everything outside the topmost modal dialog is inert, the top layer included**,
    so a `pct-select` inside one has a panel that takes no click, no focus and no Tab
    ([`lesson-89`](lessons.md#lesson-89),
    [0029](decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)). So `PctDialog` is a
    CDK overlay like every other panel here, and the two lines the plan promised — `inert` and
    the scroll lock — are `PctModalBackground` in `core`, exactly where 0024 said they would
    bind. What the plan did **not** foresee is the third thing that turned out to be ours: the
    **order** the pieces run in on the way out. Focus is restored to the element that opened the
    dialog, that element sits in the background, and an inert subtree refuses `focus()` — so the
    page is given back before the panel is detached, and that sequence is the component rather
    than a detail of it. One defect found by opening the page rather than by a test
    ([`lesson-90`](lessons.md#lesson-90)): the first `inert` walk silenced the library's own live
    regions, and with them the one sentence a select opened inside a dialog has to say.
  - gate: `apps/sandbox-e2e/src/dialog.spec.ts` (15 cases × 3 engines), the open panel added to
    the axe audit, `dialog-open` / `dialog-open-rtl` baselines, a forced-colours case, plus
    `dialog.spec.ts` and `core.spec.ts` in the unit suite — 330 unit cases green
  - control: the native element refused on a recorded measurement rather than on a taste; the
    release order has a run of its own (inert still on at detach ⇒ focus lands on `body`); and
    the size snapshot's differential control caught **itself** lying — deleting the export and
    re-measuring gave identical numbers because the build had failed, so the gate read the
    artefact from before the experiment
  - cost: `./core` +1041 B on every entrypoint that stands on it, `@angular/cdk/a11y` added to
    the dependency policy's reason, one ramp step (`slate.1000`), one semantic role (`pct.scrim`)
    and one rule in `check-tokens` point 7 — the amount slot of a `color-mix()` is not a colour,
    with a fixture pinning that boundary
- [x] **E2 — tooltip + popover** — the "describes vs names" distinction, hover/focus/touch
      parity, motion reduction on a real enter/leave; and the popover beside it — a panel with
      content in it, a trigger that says `aria-expanded`, and focus that goes in and comes back
  - _notes (the tooltip):_ **the half that answered the question the item was named for.** "Describes vs names" is not two ways of writing one thing: measured with axe over the
    state a tooltip spends its life in — **closed** — an icon-only button named by a panel that
    is not attached fails `button-name` at critical, and so does one pointing at that panel's id
    with `aria-labelledby`; a dangling `aria-describedby` produces not one finding
    ([`lesson-92`](lessons.md#lesson-92)). So the name is an attribute written once and kept and
    the description is a reference held exactly as long as the panel
    ([0030](decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md)), and the
    asymmetry is what the two relations mean rather than a convenience. The enter/leave the
    dialog's card said would arrive here did: `@starting-style` gives the enter with no
    JavaScript at all, the leave has no CSS answer — an element removed from the DOM takes its
    transition with it — and `pctAfterTransition` in `core` is that half. It reads the duration
    rather than assuming one, which is where `motion.reduced.json`'s `0.01ms` rather than `0s`
    stopped being a note and became the reason a panel is ever detached. What the item did not
    foresee is the third thing that turned out to be shared: **placement**. D2 left positioning
    with the role deliberately, and two roles arriving at once — a tooltip and a popover both
    take a side from the author — is the moment to extract; `pctPlacementPositions` carries the
    one line the dependency does not, that `offsetX` is physical while `start`/`end` are not.
    One defect found by opening the page rather than by a test
    ([`lesson-91`](lessons.md#lesson-91)): the dev-mode report about an unnamed control fired a
    false alarm on the first page it ran on, because the name of a native control lives in a
    `<label for>` somewhere else and the control carries no attribute saying so
  - gate: `apps/sandbox-e2e/src/tooltip.spec.ts` (13 cases × 3 engines), the open panel added to
    the axe audit over the icon-only button, a `tooltip-open` baseline, a forced-colours case,
    plus `tooltip.spec.ts` and `core.spec.ts` in the unit suite — 377 unit cases green, 603
    e2e cases green; `tooltip.ts` at 70.54% mutation, total 85.38 → 83.35
  - control: the two roads for the text audited in the closed state rather than the open one;
    `pctAfterTransition` measured on all four of its endings (the event, the timeout floor, the
    cancel, and nothing to wait for); the reduced-motion case reads the duration off the panel
    and still ends
  - cost: `./core` +1309 B for an application importing the entrypoint whole, **+4 B for
    `./dialog` and `./select`** — the shared layer is tree-shaken by the components that do not
    use it; `./tooltip` 12597 B; one semantic role (`pct.surface-inverse` with its `on-` pair)
    and one word in the token dictionary (`inverse`)
  - _notes (the popover):_ **done, and it is the dialog minus one word.** `role="dialog"`
    without `aria-modal`, no veil, nothing `inert`, no scroll lock — and every question the
    component asked came out of that. The one the item had not written down: **where does Tab
    go when the panel is not modal?** Measured in the browser rather than assumed — a CDK
    overlay is `body`'s **last element child**, so the panel's content stands at the end of the
    document's tab order however near the trigger it is drawn, and Tab out of it would leave
    the page for the browser's chrome. So the order is spliced back onto the trigger, in both
    directions ([0031](decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)); the road
    not taken is in the decision, because `focusout` reports focus going nowhere and the WINDOW
    losing focus with the same `null`, and a panel that closed on that would be gone when the
    user came back from another application. Focus goes to the **panel** and not to the first
    control in it — the panel is what carries the role and the name — and comes back only if it
    was still inside. Two defects the shape of an afternoon each. **The dismissal arrives
    before the press it is** ([`lesson-93`](lessons.md#lesson-93)): the CDK's outside-press
    dispatcher listens on `body` in the CAPTURE phase and fires on `click`, so the naive
    version closed the panel and its own toggle reopened it on the way back up — the one
    control that opens a popover could never shut it. And **a registration in an `effect` that
    reads what it writes** ([`lesson-94`](lessons.md#lesson-94)): with one trigger it costs a
    second pass, with two it never finishes, and the symptom was a fifteen-minute unit suite
    that simply stopped — no error, no warning. `pctFieldControl` has the same shape and is
    safe only because its partner arrives by injection, so the registration sits in a
    constructor; an input moved it into a reactive context and took the safety with it
  - gate: `apps/sandbox-e2e/src/popover.spec.ts` (15 cases × 3 engines), an open popover added
    to the axe audit **with the whole page** rather than the panel alone — nothing is `inert`
    here, so the trigger and what it points at are one tree — a `popover-open` baseline, a
    forced-colours case, plus `popover.spec.ts` in the unit suite (27 cases) — 405 unit cases
    green, 663 e2e cases green
  - control: two recorded runs, each on the line it defends. The trigger guard removed ⇒ two
    unit cases red, and they are the two that press the trigger twice; the Tab splice removed
    ⇒ the two Tab cases red. Beside them the e2e measures the promise the component exists
    for — the counter behind the panel still counts and `<html>` still scrolls — which is
    exactly the case a modal fails
  - cost: `./popover` 13075 B, `./core` **unchanged** — the popover uses the shared layer and
    adds nothing to it; twelve tokens and three pairs in the contrast policy, no new word in
    the token dictionary and no new string in `PCT_TEXTS`; `@angular/cdk/a11y` gains a second
    use (`InteractivityChecker`) and the dependency policy's reason says so
- [x] **E3 — menu** — roving focus, submenus, reuse of the typeahead from D1
  - _notes:_ **done, and the item's three words each turned out to be a question the plan had
    not written down.** _Roving focus_ is not a technique this component picked, it is what
    separates it from the select — and the two now stand side by side in one library, so the
    fork is written down rather than left to be reconstructed
    ([0032](decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)): a combobox keeps
    focus on the trigger because the user is editing a value, a menu gives it to the row
    because the row is all there is. Each road brings its own bill and both were already paid
    here — `PctFocusStays` for the one, an answered Tab for the other. _Submenus_ needed no
    second component: an item carrying `[pctMenuTrigger]` opens another `pct-menu`, which
    learns its parent from that registration, and the tree closes from the root down so that
    nothing is left hanging off a panel on its way out. _The typeahead_ came from `core`
    unchanged — but the walk beside it did not: **D1 had listed wrapping as the thing one
    consumer cannot judge, and the second consumer arrived with the opposite answer**, so the
    edge became a parameter (`wrap`) rather than a second copy. What that parameter had to be
    careful about is the difference between _past_ the end and _at_ it: `PageDown` is
    `move(10)`, and a modulo would answer "ten rows down" with a lap round the menu.
    Two defects of the kind only a browser reports. **A row's styles never reached it**
    ([`lesson-96`](lessons.md#lesson-96)): written as a directive, every `.pct-menu__item` rule
    was dead, because projected content keeps the encapsulation of the template that DECLARED
    it — the panel was right, the rows were browser-default buttons, and jsdom computes no
    styles, so nothing was red. The repository already had the answer one entrypoint over
    (`input[pctText]` is a **component** on a native element) and half the reason written down.
    And **a host listener cannot stop one the template registered first**
    ([`lesson-95`](lessons.md#lesson-95)), which is why a disabled command carries the
    platform's `disabled` rather than the APG's preferred `aria-disabled`: a consumer's
    `(click)` sits on the same element and is always ahead of ours in the queue, so
    `aria-disabled` would say the command is unavailable and run it. The third thing cost an
    hour and taught nothing new — the dev server served a template calling a method the class
    no longer had, and three engines agreed on a defect that was not in the source.
    The mutation run then took a piece of the component away rather than adding tests to it:
    `holds()` walked its own subtree of open submenus, and **every test passed with the walk
    deleted**. The dependency's outside-press dispatcher stops at the first attached overlay
    containing the press, so a menu is never asked about a press that landed in a panel opened
    from it. What keeps that from being a guess about somebody else's code is a test rather
    than the walk: a press inside a submenu is not a press outside its parent, and that case
    goes red the day the dispatcher stops stopping. And it moved a register one floor up: the
    Angular plugin strikes the options object of a signal QUERY with a different sentence from
    the one it uses for `input()`/`model()`/`output()`, so the first `contentChildren()` in a
    measured file arrived looking exactly like a `// Stryker disable` comment smuggled past the
    configuration. An ignorer is not one sentence, and `mutation.policy.json` can now say so.
  - gate: `apps/sandbox-e2e/src/menu.spec.ts` (22 cases × 3 engines), an open menu **with a
    submenu beside it** in the axe audit — `role="menu"` has required children and
    `role="menuitem"` a required parent, and a nested panel is where either would break — a
    `menu-open` baseline showing both panels, a forced-colours case measuring the one state
    this component has, plus `menu.spec.ts` (40 cases) and two `core.spec.ts` cases for the
    edge the walk learned. 457 unit cases green, 744 e2e green; `menu.ts` at 78.87% mutation,
    total 79.51 → **80.82** against the 80% floor
  - control: the wrap parameter measured on both readings of "the end" — one step past it comes
    round, ten steps past it do not; `Enter` and `Space` measured in three engines precisely
    because nothing in the component reads them, so the case fails the day the claim stops
    being true; and the RTL case measures the side and the arrow keys **together**, which is
    the one place in this library where the writing direction reaches a key map. One control
    ran the other way and took code with it: the walk inside `holds()` was deleted and the
    whole unit suite stayed green, which is what a piece of code with no reachable caller looks
    like — the promise it was written for is kept by the dependency and pinned by one test
  - cost: `./menu` 17561 B, no `@angular/cdk/a11y` — a panel that takes focus without trapping
    it or asking where its tab order ends; `./core` +46 B for `wrap`, which reaches `./select`
    (+48 B) and, through a shared identifier, `./popover` (+13 B); sixteen tokens, four pairs in
    the contrast policy, one new word in the token dictionary (`item`) and no new string in
    `PCT_TEXTS`
- [x] **E4 — closing out the select family** — projected `pct-option`, an option template,
      groups, multiple selection, filtering, clearing, async, virtualisation. Deliberately
      **after** the behaviour layer
  - _notes:_ **two of the eight are done, and the first of them decided the shape of the rest.**
    The option template closed back at D5 ([0027](decisions/0027-a-slot-is-a-directive.md)) and
    the line had not been read since. **Projected `pct-option` is refused on a measurement**,
    not on a taste: four probes say the road works — content renders into the overlay template,
    a close and a reopen move the instances back with no rebuild, and `textContent` is readable
    with the panel never attached — and that it costs the type and the count.
    `<pct-probe-option [value]="1">` beside `[value]="'pl'"` is **silent**, where the same pair
    in an array literal is TS2322, because two elements of one template are two instantiations
    and neither is evidence about the other; `contentChildren` of a class reference hands back
    `any`, so the same expression was taken as a `string` and as a `number` in one pass
    ([`lesson-97`](lessons.md#lesson-97)). And 1000 projected options are **1000 component
    instances** with the panel never opened, because content is created by the view that
    declares it — which takes virtualisation, async and a filter that never renders what it
    hides out of the panel's hands for good ([`lesson-98`](lessons.md#lesson-98),
    [0033](decisions/0033-an-option-is-a-row-of-data.md)). **Groups** shipped with the decision,
    as the first item the data road makes cheap: a heading is a shape in the same array, and
    the panel draws it as `role="group"` named by `aria-labelledby` — the one wrapper ARIA
    allows to stand between a listbox and its options, which is exactly what the audit of the
    **open** panel measures and a template could not. Everything else stays one list: the rows
    are numbered across the headings, so the walk, the ids, `aria-activedescendant` and the
    typeahead read a flat list however many headings stand in it, and a disabled group reaches
    its options **beside** them rather than by rewriting them — a consumer's own object comes
    back the one they handed in. Two smaller things fell out. The row markup is declared once
    and drawn through `ngTemplateOutlet`, and what travels through the context is the section's
    **index** rather than its rows: an inline `<ng-template>`'s `let-` is `any`
    ([`lesson-84`](lessons.md#lesson-84)), so the rows come back through a typed method and the
    `any` reaches one number instead of every binding of the row. And the language gate went red
    on `lv` — an ISO country code the Polish dictionary holds — which is the `codes` register
    doing its job rather than a finding.
  - gate: `apps/sandbox-e2e/src/select.spec.ts › headings in the list` (3 cases × 3 engines),
    the open grouped panel added to the axe audit, a `select-panel-groups` baseline, plus 11
    unit cases in `select.spec.ts` — 468 unit cases green
  - control: two recorded runs — `role="group"` off the wrapper leaves the audit red with a
    **critical** `aria-required-children`, and it is reported from the **listbox** ("children
    which are not allowed: `div[aria-labelledby]`") rather than from the option, so what the
    audit measures is the owner; the row numbering restarted inside each group leaves five unit
    cases red
  - cost: `./select` 26478 → **29058 B** (+9.7%), no new peer; five tokens and one pair in the
    contrast policy; two parts (`group`, `group-label`); the coverage exception for
    `select.html` raised to 98.75% on its denominator again, the uncovered statement being the
    same one it has always been. The mutation run went **85.13 → 86.17** on `select.ts` and
    left two survivors that are worth reading rather than chasing: merging consecutive bare
    options into one nameless section is invisible to every behavioural test, because a
    nameless section draws no element — one section and n sections are the same DOM. It stays
    for the view count (a hundred bare options as one embedded view rather than a hundred),
    and that reason is now written beside the code so nobody simplifies it out on the strength
    of a green run
  - _notes (multiple selection):_ **the third of the eight, and the second decided by a
    measurement rather than by taste.** The obvious shape is `<pct-select multiple>`, and it
    cannot hold the type: an input is a value at runtime, so one component serving both shapes
    declares `T | T[] | null` — and fifteen bindings compiled through the real template
    compiler say what that costs. The union **accepts an array on a control nobody told to be
    multiple** and **breaks the single-choice consumer's own `(valueChange)` handler**, which
    is the one channel still carrying a check: a two-way binding's write-back is not
    type-checked at all ([`lesson-99`](lessons.md#lesson-99)). The generic-marker road fails
    one floor lower, at the authoring site: `multiple` written as the plain HTML attribute is
    the string `''`, so without a transform it is TS2322 and with `booleanAttribute` the
    generic can never be inferred and the value is typed **single** while the control behaves
    multiple. So the tag decides — `pct-multi-select`, `value: T[]`
    ([0034](decisions/0034-multiplicity-is-a-tag.md)) — over **one** implementation: one
    template file, one stylesheet, and the base class this repository had refused until now.
    0013's ban is on a base class under **somebody else's** template, and the reason
    composition could not do this job is narrow and worth keeping: Angular declares an input
    in exactly one way, as a field on the class the tag resolves to, so a kit function would
    have moved the plumbing and left the fifteen input declarations — that is, the half that
    drifts. Parity is measured off `ɵcmp.inputs` instead of hoped for. What the tag adds is
    four things, each the value in another guise: `aria-multiselectable`, a pick that toggles
    and leaves the panel open, a mark on the chosen rows (three states do not fit in two
    backgrounds, and forced-colors leaves fewer still), and a trigger reading the chosen
    labels — joined by a separator from `PCT_TEXTS`, because punctuation is a string and a
    count would have needed a plural rule. The value comes back in the **list's** order, so
    the same set of choices is the same array however the picking went. And the step cost two
    gates their sight: `check-aria` reported a combobox that "declares no `ariaLabel`" and
    `check-texts` a class the package does not export — both read one class body, which was a
    complete description of every component here until that day
    ([`lesson-100`](lessons.md#lesson-100)).
  - gate: `libs/components/select/src/multi-select.spec.ts` — 23 unit cases (the panel that
    stays open, list order, a value the list cannot name, the marks, the walk opening on the
    first chosen row, the entity comparison, the signal-forms field, and the **input parity**
    of the two tags); `apps/sandbox-e2e/src/select.spec.ts › more than one answer` (3 cases ×
    3 engines), the open many-choice panel added to the axe audit, `select-panel-multiple` and
    its RTL twin as baselines — 492 unit cases and 771 e2e cases green
  - control: three recorded runs on the component — a pick that ends the question (the
    single-choice behaviour, one line) leaves **six** cases red, the value written in the
    order the picking went leaves **three** (one of them the signal-forms case), and an input
    declared on one tag and not the other leaves **one**, which is the only thing here that
    would have said so. And two on the gates: with the inheritance merge disarmed
    `check-aria`'s own reference input stops passing, and with "an unexported base is not a
    class of its own" disarmed so does `check-texts`'s; each gained a prepared input of its own
    for a base the scan cannot see (`base-not-read`, `base-without-declaration`), so the rule
    that fires on it is measured and not only written
  - cost: `./select` 29058 → **46749 B** (+61%), one template compiled twice and one
    stylesheet emitted twice — the price of the tag, recorded rather than argued about; no new
    token (the mark takes the arrow's box and `currentColor`) and no new peer; one part
    (`option-check`), one `PCT_TEXTS` string (`selectSeparator`); the coverage exception for
    `select.html` moved to 98.82% on its denominator again, the uncovered statement being the
    same one it has always been. The mutation run reads the three files the select is now
    written in rather than the one it used to be — the patterns were widened with the split,
    because a file struck from the measurement takes its survivors with it — and it went
    **81.48 → 81.70** overall, with `multi-select.ts` at **100.00**: the two mutants that
    survived the first pass were a default nobody bound and an id prefix a comment promised,
    and both are now cases rather than reasons
  - _notes (filtering):_ **the fourth of the eight, and the first whose fork was settled by a
    rule this plan already had rather than by a new measurement.** 0034 said a tag is what the
    **type** cannot say otherwise; filtering changes no type, so it is an input — as a tag it
    would have multiplied the family into four (`pct-filter-select`,
    `pct-multi-filter-select`) for two questions, all four the same implementation. Which
    leaves the question that does have defects in it: a combobox with a text field holds **two
    things that look like one**, the answer and the question being typed, and every way of
    getting filtering wrong is those two conflated — a trigger that goes blank while the user
    types, a many-choice value that loses the choices the question hid, a panel that reopens
    narrowed by letters nobody can see, a native submit that sends `country=Pol`. So the rule
    is one sentence and every item of the implementation is a reading of it: **the question
    narrows the panel, never the value, and it does not outlive the panel it was asked in**
    ([0035](decisions/0035-a-filter-is-a-question-not-a-value.md)). The trigger changes
    **element** with the role — a `<button>` for the select-only pattern, an `<input
role="combobox" aria-autocomplete="list">` for the editable one, on two branches of one
    `@if` — and with it the key map: the arrows, `Enter`, `Escape` and `Tab` stay with the
    list, the letters, the space bar and `Home`/`End` go back to the caret, and the typeahead
    goes altogether, because letters already going somewhere cannot also jump within the list
    they have just narrowed. The value is read against `allOptions` and the panel draws `rows`,
    which is what keeps a chosen label on a trigger whose question hides it. Three smaller
    things fell out. The default predicate folds case and stops there: whether an accent is a
    letter of its own is a question of **language** — `Intl.Collator` at `sensitivity: 'base'`
    says one thing for German and the opposite for Swedish on one pair of letters, and the NFD
    trick every library reaches for folds what decomposes and leaves what does not
    ([`lesson-101`](lessons.md#lesson-101)). A `#ref` declared inside an `@if` is invisible
    outside it, so the overlay's origin stopped being the CDK directive's export and became
    the element a `viewChild.required` resolves to — which reaches into both branches
    ([`lesson-103`](lessons.md#lesson-103)). And the step cost `check-aria` its arithmetic:
    two elements binding both name inputs used to be a violation by counting, and two branches
    of one conditional are not two names for one control. The gate already knew how to ask —
    point 6 asks it of the hint and the error — so points 4 and 6 now read one tree, joined to
    the tag scan by the offset both report.
  - gate: `libs/components/select/src/select.spec.ts` and `multi-select.spec.ts` — 26 unit
    cases (the text trigger, the list narrowing, the cursor on the first row still standing,
    the two empty sentences, the chosen label behind the question, the caret's keys, the query
    that dies with the panel, the pick that keeps what the question hid, the chrome's cursor,
    the default predicate); `apps/sandbox-e2e/src/select.spec.ts › a question typed into the
trigger` (7 cases × 3 engines), the narrowed panel added to the axe audit **whole-page**,
    `select-filter-trigger` and its RTL twin as baselines — 519 unit cases and 797 e2e cases
    green
  - control: with the branch distinction disarmed in `check-aria`, the gate's own reference
    input stops passing — the two triggers it now carries are read as two names for one
    control; a new prepared input (`two-names-at-once`) holds the same two elements **side by
    side**, so the widening did not turn into a shrug. And with the arrow skipped in
    `check-texts`' bracket matcher disarmed, that gate's reference input fails too:
    `computed<(o: T) => U>(…)` ends at the arrow for a scanner counting angle brackets.
  - cost: `./select` 46749 → **55713 B** (+19.1%), the second trigger and what stands behind
    it; every other entrypoint grew by **29 B**, which is one `PCT_TEXTS` string — a default
    in `core` is carried by everything that imports `core`, including the entrypoints that
    never read it. No new part (the filtering trigger keeps `trigger`; `value` and
    `placeholder` become the input's own properties), no new token, no new peer, one string
    (`selectNoMatches`). The two coverage exceptions this repository had left are **gone**:
    `select.html` measures 100% on all four metrics, and the reason the last one gave — that
    jsdom cannot raise the CDK's outside click — was never true, it was a test nobody had
    written ([`lesson-102`](lessons.md#lesson-102)). The mutation run went **81.70 → 82.25** overall and
    `select.base.ts` **86.99 → 89.17**, six of the new survivors having been read rather than
    counted: two are guards whose reason is now written beside them (a question nobody asked is
    not cleared, and `show()` on an open panel re-reads the anchor's computed style), one was a
    line no test could ever have failed on and is deleted, and three became cases — the
    predicate that is not consulted without a question, the placeholder that is the library's
    while nothing is chosen, and the cursor a second click must not move. What it also left is
    **C26**: `multi-select.ts` reads 97.14 with nothing surviving, because the pick's guard now
    **errors** instead of failing, and the snapshot has no column for that
  - _notes (clearing):_ **the fifth of the eight, and the one whose every fork was settled by
    something outside this repository.** Written down it is one line — a cross that puts the
    value back to empty — and three questions sit under it. **Where the cross goes** is
    answered by the parser: the select-only trigger IS a `<button>`, and a `<button>` inside a
    `<button>` is not a nesting the platform keeps. The HTML parser closes the first when the
    second opens, the DOM API keeps the nesting, and Angular's template parser reports no error
    at all — so the same template is two different trees depending on **who read it**, and the
    place the two readings meet is server rendering ([`lesson-104`](lessons.md#lesson-104)). So
    the cross is a sibling, the box the filtering branch already had now wraps both, and it
    became the panel's origin as well: the CDK reads "outside the panel" as "outside the
    origin", so with the trigger as origin a press on a control beside it would have arrived as
    a click outside. **Whether it is a tab stop** is answered by the platform, measured in the
    three engines: the one clear control a browser draws by itself — `<input type="search">` —
    is in **no** engine's tab order, and Escape empties it in two of the three. So the cross
    carries `tabindex="-1"` (a `<button>` still, so a virtual cursor reaches it) and **Escape
    over a shut panel is the keyboard's cross**, spent only when it did something: a control
    with nothing to take back leaves the key to the dialog it may be standing in. **What it
    clears** is answered by 0035 read once more — the trigger holds the answer and the question
    at once, so **the cross takes back what the trigger is showing**
    ([0036](decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)), which also decides
    when it is drawn at all: off the trigger's own TEXT, so a value no option names offers to
    undo nothing. The step's own defect was found by the gate that was not supposed to be
    involved: the wrapper moved nothing — same `x`, same width, same height to three decimals —
    and the visual baseline went red on 309 pixels, because `position: relative` makes a paint
    layer and Chromium hands the text inside one greyscale antialiasing instead of subpixel
    ([`lesson-105`](lessons.md#lesson-105)). The box is therefore a positioning context only
    where something is positioned in it. And `reset()` came back one floor: it is `clearValue()`
    plus the panel, so what the empty state IS stayed with the subclass and what a reset MEANS
    is written once
  - gate: `libs/components/select/src/select.spec.ts` and `multi-select.spec.ts` — 22 unit
    cases (what the cross takes back in each of the four states a trigger can be in, the value
    a list cannot name, the control nobody may change, the control nobody asked, Escape spent
    and Escape left alone, the key that is not Escape, the press that keeps focus on the
    trigger, the press that is not a click outside the panel, and the reserved space that does
    not follow the cross);
    `apps/sandbox-e2e/src/select.spec.ts › a cross that takes the answer back` (8 cases × 3
    engines, in a page that was really **parsed**), the cross added to the axe audit,
    `select-clear-trigger` and its RTL twin as baselines — 542 unit cases and 826 e2e cases
    green
  - control: five recorded runs on the component. The cross clearing the value whatever the
    trigger is showing leaves **three** cases red, all of them about a question; Escape spent
    whatever the state leaves **two**, and they are the two that say the key travels on;
    the trigger back as the panel's origin leaves **six**, because the CDK then reads a press
    on a sibling of the origin as a click outside; the `tabindex` taken off leaves the e2e
    tab-order case red in three engines; and the `mousedown` default kept leaves **two** —
    focus on `body` is not only a lost ring, it is the next arrow key going nowhere. The
    sixth control was not arranged: the visual gate fired on its own, on 309 pixels of a card
    nothing had moved ([`lesson-105`](lessons.md#lesson-105))
  - cost: `./select` 55713 → **62106 B** (+11.5%); every other entrypoint grew by **20 B**,
    which is the one new `PCT_TEXTS` string, carried by everything that imports `core`. One
    part (`clear`), one string (`selectClear`), one host attribute (`data-pct-clearable`), no
    new token — the target is `--pct-target-min` and the colour is the arrow's — and no new
    peer. Coverage stands where it stood: `select.html` at 100% on all four metrics, and no
    exception anywhere in the repository. The mutation run went **82.25 → 82.57** overall and
    `select.base.ts` **89.17 → 90.10**, and the shape of that is worth more than the number:
    the file gained **34 mutants and not one survivor**, the surviving count standing at the
    35 it stood at before. It took two passes to get there, and both of the first pass's new
    survivors were read rather than counted. One was the `clearable` default read as `true` —
    no control in this repository had ever been asked to draw **no** cross. The other is the
    sharper, and the eye would not have found it: `key === 'Escape'` read as `true`, which is
    **any** key over a shut panel taking the answer back, with every Escape case still green
    because Escape is one of the keys `true` also covers. The run also handed **C22** its
    fourth data point and a second file: run inside an `nx run-many` beside the build and the
    unit tests it reported `motion.ts` at 86.21 **and `placement.ts` at 89.23**, against 91.38
    and 98.46 from a run of its own over the same code — so the gate went red naming two files
    this step never touched
  - _notes (async):_ **the sixth of the eight, and the one whose sharpest measurement came
    from a gate that was expected to be a formality.** Written down it is an input called
    `loading`, and three questions sit under it. **What the panel says**: "no options" and "no
    matches" are **conclusions**, and a request in flight has reached neither — so a third
    sentence takes both off the screen, through `PCT_TEXTS` like the two it replaces, and onto
    the same polite channel. **What the state takes away**: nothing, which is where the input
    parts company with `pctButton`'s of the same name — there the loading IS the control's
    action in flight, here the control works and its list is late, and disabling would drop
    focus on `body`, the end of the key map. And **what happens to the cursor**, which is the
    half nobody would have written down as part of "async": every list change this library had
    seen came from a keystroke, and all three keystroke paths set the cursor on the same line
    that changed the list. A server's answer is the first change that arrives on nobody's, and
    an index kept as a number then names a different row — `aria-activedescendant` pointing at
    an id nothing carries, `Enter` picking a row nobody pointed at
    ([`lesson-107`](lessons.md#lesson-107)). So the walk in `core` learned one rule — **a
    cursor names an entry, not a position** — as a `linkedSignal` rather than an effect (an
    effect would read the index it writes, [`lesson-94`](lessons.md#lesson-94)), and what makes
    two entries one is asked of the control rather than assumed: the select answers
    `compareWith`, which is already its answer to "does this option carry the value", and the
    menu keeps identity because its items are instances that survive the change.
    **The gate that was supposed to be a formality is the one that decided the shape**: the
    waiting panel audited by axe came back **critical** — a `role="listbox"` owning no
    `role="option"` is `aria-required-children`, reported from the listbox — and the repair is
    not a placeholder row but the state the specification has for exactly this, which axe
    implements: `aria-busy` marks a container whose content has not arrived, so the rule waits
    with it ([`lesson-106`](lessons.md#lesson-106),
    [0037](decisions/0037-loading-is-a-fact-about-the-list.md)). The same run said something
    that is **not** this step's: the panel of a control whose list is genuinely empty is the
    same tree without that excuse, and four axe cases over this component had never opened
    one — that is **C28**. Two smaller things fell out. The withdrawal of the announced
    sentence stopped naming the sentences it knew: with three of them a list can stop loading
    while the panel stays open, so what is retracted is now what was actually said. And the
    server-side filter got a name, `pctKeepAll` — 0035 had already opened that door ("on
    nothing at all when a server is doing the narrowing"), and a constant rather than
    `() => true` in a template is the difference between one identity and a new function on
    every change detection pass, which rebuilds every row of the panel for as long as the page
    lives
  - gate: `libs/components/select/src/select.spec.ts` — 11 unit cases (the third sentence and
    the conclusion that replaces it, the busy listbox, the rows a refresh keeps, the focus a
    late list does not take, the retraction, the cursor an arriving list lands on, the cursor
    a second fetch keeps, the trigger that never names a row that is gone, the list somebody
    else narrowed, and the question nobody has answered yet);
    `libs/components/core/src/core.spec.ts › a list replaced under the cursor` — 7 unit cases
    over the walk itself; `apps/sandbox-e2e/src/select.spec.ts › a list that is
still coming` (7 cases × 3 engines, driven by an event rather than a press, because a
    press anywhere on the page closes the panel every one of them is about);
    `a11y.spec.ts › "a panel waiting for its list has no violations"` and a
    `select-panel-loading` baseline — 560 unit cases and 851 e2e cases green
  - control: nine recorded runs. `aria-busy` taken off the listbox leaves the **audit** red
    with a critical `aria-required-children`, which is the sharpest of them; a `loading` that
    disables leaves **eight** unit cases red, because a disabled trigger opens no panel at
    all; the loading sentence dropped leaves **three**; the old blind retraction leaves
    **one**, and it is the case where one sentence replaces another with the panel never
    closing; `aria-busy` written unconditionally leaves **one**. And four on the walk: the
    cursor kept as a number leaves **seven** (four in `core`, three in the select), the
    arriving list not starting the walk leaves **four**, the entry never found again leaves
    **six**, and the select's `sameItem` dropped leaves exactly **one** — the case that says a
    list fetched twice is two instances of one list
  - cost: `./select` 62106 → **62607 B** (+0.8%), and the shape of the rest is worth more than
    that number: `./core` and `./menu` each grew by **323 B**, which is the walk's re-anchor —
    the menu pays for a repair nobody asked it for and needed anyway, since an item list that
    changes used to leave its cursor on a position there too — and every entrypoint that
    imports `core` grew by **48 B**, which is the one new `PCT_TEXTS` string. No new part, no
    new token, no new peer, one string (`selectLoading`), one attribute (`aria-busy`, the
    platform's own — no `data-` twin, because a second copy of one state is two things to keep
    in step). Coverage stands where it stood: no exception anywhere in the repository, and the
    templates at their own floor of 100%. The mutation run went **82.57 → 82.77** overall, and
    the shape of it is the part worth keeping. `list.ts` gained **26 mutants and not one
    survivor** (98.78 → **99.07**, the one survivor being the pre-existing `delta > 0` in
    `move`) — but only after a first pass had left six, and all six were read: three said that
    "the first of an empty list" was measured by nobody, one that the cursor standing on the
    FIRST row was a case nobody had written, one that an entry following its list to the top
    while arriving disabled was another, and one that the `previous.value >= 0` guard was
    `array[-1]` written out — the guard is gone and two cases are there instead.
    `select.base.ts` reads **89.90** with **one** new survivor, and it is the initial value of
    the sentence the control remembers saying: any string behaves identically, because the
    announcer withdraws only what is on the channel. The same run took the two guards out of
    that closure — every mutant of both had survived, and they were the announcer's own
    contract written twice
  - _notes (virtualisation):_ **the eighth and last, and the one the card had been carrying an
    open question about since v0** — "what happens at 5,000 options" is answered in a browser
    and the answer is **626 ms** and 5,000 elements against **15 ms** and 11. 0033 had already
    said what the feature is ("a promise about how many rows exist, and it can only be made by
    whoever creates them"), so the work was four questions and every one of them was settled by
    a measurement. **Where the scroll lives**: the listbox itself, because the exemption that
    keeps a panel of unfocusable rows out of `scrollable-region-focusable` is written for a
    combobox's own popup — one element in, which is exactly what a virtual-scroll viewport is,
    and the same tree is a serious violation. That, plus a fixed item size where a grouped list
    has two heights and a wrapper, is what refused `@angular/cdk/scrolling`. **What holds the
    space**: a pseudo-element, because padding does not scroll (it is inside the padding box —
    `clientHeight` grows and `scrollHeight - clientHeight` stays 0, in all three engines) and
    any spacer element is a child the listbox does not own. **What the arithmetic runs on**: a
    measurement, never a number — the row is 35.59 px, it falls out of the type, and the input
    that was refused for drifting came back through `offsetHeight`, which rounds
    ([`lesson-108`](lessons.md#lesson-108)). **What a window owes the reader**: `aria-setsize`
    and `aria-posinset`, and this is the item's sharpest finding — **axe has no rule for
    either**, so the promise is a test's rather than a gate's, and the recorded control says so
    outright: dropped, the audit stays green and only the cases go red. Two defects of the kind
    that cost an afternoon: an `afterRenderEffect` following the cursor woke on the geometry it
    read as well, so a fraction of a pixel remeasured mid-scroll snapped the panel back to the
    cursor — in one engine ([`lesson-110`](lessons.md#lesson-110)); and Firefox reports the row
    as two values a fifteen-millionth of a pixel apart, alternating, because each measurement
    writes the spacer that decides where the next row is laid out — a loop Angular ends with
    NG0103 and a frozen panel. Rounding is the wrong repair (Blink lays out on 1/64 px, Gecko
    on 1/60): the reading stays exact and the QUESTION gets a tolerance
    ([`lesson-111`](lessons.md#lesson-111)). And one repair was deleted by its own control
    rather than confirmed — `overflow-anchor: none`, written while Firefox was failing for two
    other reasons, with the run going five red to two and nobody able to say which change did it
    ([`lesson-109`](lessons.md#lesson-109))
  - gate: `select.spec.ts › a window over a list nobody scrolls to the end of` — **18** unit
    cases (the count drawn whole and windowed, the pair written and not written, the cursor past
    the window, a value far down the list, the two spacers, a scroll, the arithmetic scroll up
    and down, a row already on the screen that is left alone, the row a panel drawn whole
    scrolls into view by ID, an empty windowed panel, a heading keeping its id, a heading
    counted into where its rows begin, the hair that is not a measurement, and two row heights
    reported); `apps/sandbox-e2e/src/select.spec.ts › a list too long to draw` — 7 cases × 3
    engines, because every number the window runs on is read from a real layout and jsdom has
    none; `a11y.spec.ts › "a panel drawing a window of a long list has no violations"` and a
    `select-panel-window` baseline — 578 unit cases and 874 e2e cases green. The two runs
    measure different halves on purpose: the unit one has no layout at all, so the panel draws
    its probe window and the COUNT is what it can prove; the browser has the geometry and
    nothing else does. Seven of the eighteen were written **after** the first mutation run and
    because of it: the measured paths are the ones a run with no layout never reaches, so they
    had the survivors
  - mutation: `select.base.ts` **89.90 → 84.97** on 570 more mutants than it had, and the drop
    is read rather than reported. Seven unit cases were written against the first run's 118
    survivors and took it to 99; what is left is a long tail of four kinds, none of which a
    case would honestly kill — guards that fire only where the view query is empty, which
    cannot happen once the panel has drawn (**C27**'s class); `<` against `<=` at boundaries
    where both branches do the same thing; the warning's own prose; and the `isDevMode()`
    conditionals. `multi-select.ts` went to **100.00** and `select.ts` to 91.43. The same run
    dropped `motion.ts` and `placement.ts` on three runs out of four, and that is **C22** rather
    than this step: run alone they come back at 91.38 and 98.46 to the digit, in four minutes,
    and the snapshot here records the run that landed their clock-kills rather than the ones
    that starved them
  - control: five recorded runs, and one of them deleted a repair. The pair dropped leaves two
    unit cases and two e2e cases red **and the audit green**, which is the reason that promise
    is written down at all; the tolerance replaced by exact equality leaves Firefox red with
    NG0103; `aria-activedescendant` left naming a row outside the window leaves one unit and one
    e2e case red; `offsetHeight` in place of the rect leaves the two `scrollHeight`s 2,027 px
    apart and the e2e case that compares them red; and `overflow-anchor` put back to its default
    leaves everything green, wheel-driven scrolling in Firefox included
  - cost: `./select` 62607 → **68536 B** (+9.5%), no new peer, no new token, no new string, no
    new part. One state attribute (`data-pct-virtual`) and one private custom property, which is
    deliberately not a `--pct-…` name: the prefix is the promise that a skin may set the value,
    and a number the window computes is not a skin's to move. The same snapshot also records
    **18 B off `./core` and `./menu`**, which this change did not cause — see C29
- [x] **E5 — switch, textarea (autosize), slider, date picker** — the date picker forced the
      deep i18n `[pctNumber]` had started, and went two floors further down: a calendar, a
      parser and a table of somebody else's data
  - _notes (switch):_ **one of the four is done, and it is the one whose whole content was a
    question about who owns a state.** The checkbox's card had said since v0 that a switch is a
    separate component "because the semantics differ", and that sentence settles the packaging
    and none of the three questions the control actually asks: what element carries
    `role="switch"`, whether the component writes `aria-checked`, and whether there is a third
    state. **All three were answered by a browser rather than by the specification**, and the
    second answer is the opposite of what the specification alone would give
    ([0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)).
    `aria-checked` is a REQUIRED state of the role — and on a native `<input type="checkbox">`
    it is **inert**: Chromium's own accessibility tree reports a checked box carrying
    `aria-checked="false"` as checked, and Playwright's spec-shaped reading agrees in all three
    engines. An attribute that cannot be wrong can drift with nothing to notice, so the switch
    writes none and its cases assert the ABSENCE
    ([`lesson-112`](lessons.md#lesson-112)). The same probe settled the element without a
    preference being needed: the role on a `<button>` or a `<div>`, with no checkedness to
    derive the state from, is a **critical** `aria-required-attr` in every engine. And the
    third state is refused by the TYPE — `switch` has no `mixed`, `aria-checked="mixed"` over
    the role drew not one violation with every axe rule enabled, so a gate would have had
    nothing to read and the missing input is the whole control. The step also found a defect in
    a component nobody was looking at: `PctCheckbox` has been writing the same inert attribute
    since v0, with a computed feeding it and an e2e case reading it back — **C30**, left where
    it was found rather than repaired in passing
  - gate: `apps/sandbox-e2e/src/switch.spec.ts` (6 cases × 3 engines), the `/switch` view added
    to the axe audit and to `SBX_ROUTES` (so hydration and the RTL audit take it too), the
    `switch-states` and `switch-states-rtl` baselines, a forced-colors case of its own plus the
    two cross-control cases that say "every control" and now mean it, and 18 unit cases in
    `switch.spec.ts` — 596 unit cases green
  - control: two recorded probes rather than repairs, and that is deliberate — what they
    measure is what would otherwise have been assumed. `role="switch"` moved onto a `<button>`
    and onto a `<div>` leaves the audit **critical** in three engines; `aria-checked="mixed"`
    written over the role on a native checkbox leaves it **green** in three engines with every
    rule enabled. The first is why the role sits on an input, the second is why the third state
    is refused by the compiler instead of by a run. Beside them, `check-styles` fired on the
    first draft of the stylesheet — a `border-color: FieldText` in the forced-colors block
    outranked by the hover and invalid rules, which is [`lesson-70`](lessons.md#lesson-70)
    caught by the gate built for it rather than by a person
  - cost: `./switch` **11905 B**, `./core` only — smaller than the checkbox's 14493 and
    carrying neither `./icon` nor `@angular/common`, because the thumb is a shape the
    stylesheet moves rather than a drawing anybody could replace. 22 tokens and 13 pairs in the
    contrast policy; three new words in the name dictionary (`track`, `thumb`, `width`); six
    parts, no new string, no new peer. **No other entrypoint moved** — the differential
    control's own reading, taken after a build with `--skip-nx-cache` because of
    **C29**. Two visual baselines were rewritten (`states-disabled`, `states-invalid`), which is
    the states view keeping its promise that every control appears in it
  - _notes (textarea):_ **the second of the four is done, and its whole content turned out to
    be a HEIGHT rather than a component.** `PctText`'s selector has read
    `input[pctText], textarea[pctText]` since v0, so a textarea in a field already worked; what
    the item names is the one thing it did not do. Four probes over three engines settled every
    fork before a line was written, and the first of them settled the shape:
    **`field-sizing: content` is in chromium 149 and webkit 26.5 and absent from firefox 151**,
    where the absence is silent and total — a `rows="2"` box stays two lines tall whatever is
    typed into it. So the height is the platform's where the platform has one and a measurement
    where it has not ([0041](decisions/0041-a-height-the-platform-computes.md)), and what makes
    that honest rather than convenient is that **the two are made to produce the same
    geometry**: the sheet gives the CSS road back the `rows` the property discards (measured:
    an empty `rows="2"` box under it is 34 px against 58), and the measurement adds back the
    border `scrollHeight` leaves out (measured: 2 px of scroll, three engines). The road most
    libraries ship — a replicated `::after` sharing a grid cell — was refused by a measurement
    and not by taste: **a `<textarea>` renders no generated content in any engine**, so it needs
    a wrapper, and a wrapper costs the native element that `req-api-platform` and
    [0003](decisions/0003-wrapper-and-control.md) exist to keep. The shape follows
    [0034](decisions/0034-multiplicity-is-a-tag.md) read once more: an `autosize` input would
    exist on `input[pctText]` too, where a height that follows the content means nothing, so
    what the type cannot say the **selector** says — and it is a directive rather than a
    component because `PctText` already is one on that element, which is why the rules live in
    the control's own sheet behind an attribute. **In two of the three engines that stylesheet
    IS the feature.**
  - _notes (what the fallback had to be told):_ this is the half that decides what the measured
    road is worth, and none of it was guesswork. Beside typing, it has to hear **a value written
    with no event at all** — `patchValue` reaches the DOM through
    `DefaultValueAccessor.writeValue`, which dispatches nothing, so the CSS road went 39 px to
    59 and the measured one stayed at 39 with two lines out of sight — and **a width that
    rewrapped the text**, where nothing announces anything and the same 39 → 59 split appeared.
    Each cost a lesson. The subscription that fixes the first is `null` at construction, because
    `NgControl` forwards to a control the forms directive binds in its own `ngOnChanges`: the
    optional chaining then makes an ordering bug into a **no-op rather than an error**, and
    three engines, a compiler and a unit suite all say nothing
    ([`lesson-114`](lessons.md#lesson-114)). The second is a `ResizeObserver` whose callback
    reads a WIDTH, because our own writes wake it on every height it sets —
    [`lesson-110`](lessons.md#lesson-110)'s loop waiting to happen. And building it FIRST cost
    the third lesson: jsdom has no `ResizeObserver`, so the constructor threw and took the
    subscription, the ready flag and the first fit down with it —
    **install what a consumer cannot do without before what merely improves the result**
    ([`lesson-115`](lessons.md#lesson-115)). The environment that found it is the one poorer
    than a browser, which no e2e case could ever have been
  - gate: `apps/sandbox-e2e/src/textarea.spec.ts` — 7 cases × 3 engines, and deliberately **one
    set of assertions over two implementations**: the floor compared against a plain
    `<textarea rows="2">` on the same page rather than against a number of ours, three lines,
    six lines, the way back down, a four-line value already in the page, the ceiling with its
    scroll, the silent write and the rewrap. Plus 10 unit cases in `autosize.spec.ts` for the
    plumbing a run with no layout can prove — jsdom reports `scrollHeight` 0 for everything, so
    the geometry is not a question it can be asked ([`lesson-82`](lessons.md#lesson-82)'s split
    met again). **606 unit cases and 937 e2e cases green.** The `/textarea` view is in
    `SBX_ROUTES`, so the axe audit, the RTL audit and hydration all take it. One case is written
    to **expire**: it asserts which engine lacks `field-sizing`, so the day firefox ships it the
    run goes red and says the measured road has lost its last consumer
  - control: five recorded runs, and they fail in different engines on purpose. The
    `field-sizing` declaration removed leaves **10 of 21** red — chromium and webkit, the whole
    feature; the floor removed, 6; the reset before measuring removed, 2 on firefox (a box that
    grows and never shrinks); the resize observer removed, 1 on firefox and 1 unit case; the
    subscription taken at construction rather than after the first render, again 1 and 1, which
    is [`lesson-114`](lessons.md#lesson-114) proved on both limbs at once
  - cost: `./field` 24460 → **26804 B** (+9.5%), `./core` only, no new peer, no new token, no
    new part, no new string a user reads. One dev-mode warning (a ceiling under a floor, which
    CSS resolves by silently keeping the floor). Two private custom properties and two data
    attributes. **`@angular/core/rxjs-interop` was in the external column for one commit and is
    not any more**: `takeUntilDestroyed` is the idiom and it put a whole entrypoint of the
    framework in the snapshot for a teardown the same four lines already hold a `DestroyRef`
    for — 35 B, and the bytes were not the argument. The measured road's own price, over 300
    keystrokes: chromium 34.2 → 39.6 ms, webkit 83 → 88, **firefox 41 → 66** — the engine that
    needs the fallback pays the most for it, which is the argument for it being a fallback
  - _the finding that was not there:_ `resize: none` under autosize raised the question about
    the control it does NOT cover — a plain `<textarea pctText>` keeps the browser's
    `resize: both`, and a frame the user can drag a control out of would be a defect worth an
    item. Measured instead of assumed, in three engines: the computed value really is `both`,
    and a width written onto the element moves nothing, because the field's control column is a
    flex line and the control carries `flex: 1 1 auto; min-width: 0`. The vertical drag grows
    the field, which is [0004](decisions/0004-explicit-height.md) working as written
    (`min-height`, so taller content pushes the control out). No item
  - _the baseline that moved for a reason worth reading:_ five visual baselines were rewritten.
    Four are the sandbox navigation gaining a row, which every whole-viewport shot carries
    (`dialog-open`, `dialog-open-rtl`, `menu-open`, `popover-open`) — the switch paid the same
    price. **The fifth is not that, and it nearly went down as a flake**: `states-dark`
    photographs an ELEMENT, and the element was 166 px before and 166 px after, same width,
    same children — while the picture went 166 to 167. What moved is the one number nobody
    photographs, the panel's `top`, from 1893 to **1991.1875**: a box 166 px tall starting at
    `.1875` covers 167 rows of device pixels ([`lesson-116`](lessons.md#lesson-116)). The
    fraction is a textarea being on the page above it — two rows of the field's type is
    39.1875 px — and it is **not** this step's arithmetic: a plain `<textarea rows="2">`
    measures 39.19 too, in three engines, which is exactly what `1lh` was chosen to reproduce.
    Three things settled it and each was cheap: the case repeated (167 three times out of
    three, so not noise), the change stashed and the gate run at `HEAD` (green, so ours), and
    then `height` and `top` read from the DOM, which said in one line what two identical
    pictures could not
  - _the finding that was:_ **C33** — `autosize.ts` is the most behaviour-shaped file this
    entrypoint has and it landed **outside** the mutation measurement without anybody deciding
    so, because the set is a curated list of 22 files and a new one is simply not in it. Two
    lists in `mutation.policy.json` make a file that DROPS OUT fire the gate, and neither says
    a word about one that was never in
  - _notes (slider):_ **the third of the four is done, and it is the first item where a
    decision written before the code was WRONG about a browser and said so in its own
    revision.** The five questions 0042 opened were all settled by measurement, and four of
    the five held. The element is the platform's `<input type="range">` — the role, both
    bounds, the value and the whole key map come free, byte-identical in three engines, and
    `disabled` drops the control from the Tab order without a line from us. What is ours is
    the one thing the platform cannot do: a value it can **pronounce**. `aria-valuenow` is a
    bare number a reader says in the user's own language; `15 %` or `Medium` is not, so a
    `format` or a `labels` list turns on a visible bubble AND `aria-valuetext` **together and
    only then** — one string in two places, the eye reading the bubble and the reader reading
    the control ([0009](decisions/0009-number-field.md)'s locale plumbing, met again).
  - _notes (0039 read twice more, and both times by the accessibility tree):_ the switch's
    lesson turned out to have two more instances waiting on this control, and neither is a
    guess. **`aria-orientation` is inert on a range**: chromium's own AX node reports
    `vertical` for a range under `writing-mode: vertical-lr` that says nothing, and reports
    `horizontal` for a horizontal one told `aria-orientation="vertical"` — the attribute is
    ignored in both directions. That turns `writing-mode` from a drawing choice into the
    MECHANISM that tells the accessibility tree, which is a better argument for it than the
    one 0042 made. **`aria-required` is inert too**, and the probe carries its own control:
    the same attribute on a `<input type="text">` in the same run reports `required: true`
    and on the range reports nothing at all, so it is the ROLE and not a missing CDP field.
    `aria-readonly` is the one of the three that IS read — it takes `settable` off the node —
    so it is the one the component writes ([`lesson-112`](lessons.md#lesson-112))
  - _notes (the decision that was rewritten):_ 0042's C1 said a range carries generated
    content in all three engines and the mechanism rested on it. It was measured by asking
    the browser for `getComputedStyle(el, '::before').content` — **which reports the
    declaration and not the rendering**, and an `<input>` is a replaced element on which the
    box is never generated. Sampled by PIXEL instead, `::before` renders in **chromium and
    in neither of the other two**, and where it does render an absolutely positioned one
    paints ABOVE the UA shadow content, covering half the thumb it ends at. The gradient
    half of C2 held — a `linear-gradient` on the engine track pseudo-element renders in all
    three — and it was refused for this repository's own reason instead: **a gradient's
    direction is physical**, there is no `to inline-end`, so the RTL slider would have needed
    a rule reading the direction, which is the very promise 0042 opened by claiming it kept.
    So the drawing is boxes of the component's own with the native range over them at
    `opacity: 0` — the switch's technique, and here it costs no consumer markup, because
    `PctSlider` is a component with a template while `PctAutosize` was a directive on the
    consumer's element ([`lesson-118`](lessons.md#lesson-118),
    [0041](decisions/0041-a-height-the-platform-computes.md)). The engine pseudo-elements
    survive for GEOMETRY alone: the platform maps a pointer to a value through the native
    thumb's width, so it is given the width of the thumb we draw and nothing else — measured,
    the drawn thumb's centre then lands within **1 px** of the pointer, in three engines
  - _notes (what the contrast gate settled that taste could not):_ the rail's colour was a
    preference until the gate refused it, and then it was arithmetic. **No single colour
    clears 3:1 against both the page and the travelled part**: `--pct-border-strong` passes
    against the page at 4.76 and fails against the fill at 1.09, `--pct-border` passes
    against the fill at 4.19 and fails against the page at 1.23. What SC 1.4.11 asks for is
    what identifies the control and its state — the thumb (5.17 against the page) and the
    fill (5.17 against the page, 4.19 against the rail) — so the light rail wins and the
    pair that gives way is recorded as a `warn` with the reason in the policy's own name. The
    same arithmetic decided where the ticks stand: a mark has ONE colour, so they sit behind
    the fill and are legible ahead of the thumb, which is where a reader needs them
  - gate: `apps/sandbox-e2e/src/slider.spec.ts` — 10 cases × 3 engines, and every one of them
    is about something jsdom has no answer for: the key map, a press landing the drawn thumb
    within 2 px of the pointer, a drag that never lets go, the fill ending at the thumb's
    centre at both ends, the mirror in RTL measured as geometry AND as the platform's own
    pointer reading, the vertical slider running bottom-to-top with the engine working the
    orientation out for itself, the tick standing where the thumb stands for its step, and
    the ring on the thumb. Plus 24 unit cases in `slider.spec.ts` for the arithmetic a run
    with no layout can prove. The `/slider` view is in `SBX_ROUTES`, so the axe audit, the
    RTL audit and hydration all take it; `states.spec.ts`'s cross-control list has it, and
    the forced-colors spec has a case of its own — **630 unit cases green**, and on the e2e
    side 30 of its own plus 153 axe, 60 hydration, 44 visual, 24 forced-colors, 18 states
  - control: the gate's own red runs are the record. The three that fired while it was built
    are each a measurement somebody would otherwise have assumed: `outline-width` reads
    `medium` (3 px) on an element whose `outline-style` is `none`, so the obvious focus-ring
    probe passes before the rule exists — it reads `outline-style` instead; playwright's
    `toMatchAriaSnapshot` reports `aria-valuenow` and never `aria-valuetext`, which is
    0042's own "what this costs us" arriving as a red test; and `page.mouse.click` takes
    VIEWPORT coordinates and scrolls nothing, so a control below the fold is pressed at a
    point that is not on it — one engine of three found that, on a page where the row was in
    view in the other two
  - _the finding that was not there:_ **a press ON the thumb is a grab in webkit and a jump
    in chromium** — the same press at the same fraction, 30 against 33. It is the platform's
    behaviour on the platform's own element and nothing of ours reaches it, so it is not an
    item; it is written into the case that nearly asserted it by accident, which now presses
    away from the current value on purpose
  - cost: `./slider` **16906 B**, `./core` only — no `./icon`, no `@angular/common`. 28
    tokens and 14 pairs in the contrast policy; three new words in the name dictionary
    (`bubble`, `fill`, `mark`), and two in the language one (`moz`, because a vendor prefix
    that reaches the artifact has no register, and `falsy`, which `american-english` does not
    carry). Nine parts, no new peer, no new string a user reads. **No other entrypoint
    moved.** Two visual baselines added and six rewritten — four of them the sandbox
    navigation gaining a row, which every whole-viewport shot carries, and two the states
    view keeping its promise that every control appears in it
  - _the finding that was:_ **C33 gets its third file.** `slider.ts` is the most
    behaviour-shaped file of this entrypoint — a fraction, a step count, a label index, a
    defensive read — and it landed outside the mutation measurement by default, exactly as
    `switch.ts` and `autosize.ts` did. It is left there on purpose: C33's own content is that
    the work is a RULE and not a bulk addition, and adding one file would hide the gap it
    names rather than close it
  - _notes (date picker):_ **the fourth is the date picker, and it is the item where the
    platform's own control was refused on three measurements rather than one.**
    `<input type="date">` takes the order it shows a date in from **`lang` in chromium, from
    the browser's locale in webkit, and from neither in firefox** — three engines, three
    sources, and exactly one of them is something an application can set, so an application in
    Polish shows `12/01/2026` to two users in three and has no way of saying otherwise. Beside
    that: a half-typed date reads `value === ''` in all three and `validity.badInput` — the one
    flag that tells junk from empty — is `false` in webkit, which is
    [`req-api-number`](requirements/api.md#req-api-number)'s own complaint about
    `<input type="number">` arriving a second time; and one such control is **four tab stops**
    in chromium and firefox and one in webkit, so the same form is walked differently by
    engine. Hence a text field the library formats and parses
    ([0043](decisions/0043-a-day-is-not-an-instant.md))
  - _notes (the value, which is the half that outlives the control):_ a `Date` is an INSTANT
    and a calendar day is not one — `new Date(2026, 7, 27).toISOString()` is the **26th** in
    Warsaw, so the day a user picked becomes the day before it the moment anything serialises
    it, with no error, no warning and no red test. `Temporal.PlainDate` is exactly the right
    type and is **absent from webkit 26.5** while present in the other two, so it cannot be a
    public one. The value is therefore the string `YYYY-MM-DD` — which is what
    `<input type="date">.value` carries, what `<time datetime>` takes, what SQL `DATE` stores
    **and what `PlainDate.toString()` emits**, so the day webkit ships it the interop is one
    call each way and no stored value changes. The arithmetic under it is UTC-only, and
    `Date.UTC` is never called from it: `Date.UTC(1, 0, 1)` is the year **1901** in all three
    engines
  - _notes (two things nobody asks about until a user does):_ `Intl` resolves **`th-TH` to the
    buddhist calendar and `fa-IR` to the persian one**, in all three engines — so a field
    formatting with the locale's default would write `01/12/2569` beside a grid drawn in 2026,
    the two halves of one control disagreeing about which year it is, in silence. The formatter
    pins `calendar: 'gregory'` and deliberately does **not** pin the numbering system, on a
    distinction worth the sentence: **a numbering system is how a number is written, a calendar
    is which number it is.** The other is the first day of the week:
    `Intl.Locale.prototype.getWeekInfo()` is in chromium and webkit and **absent from
    firefox**, and a week that started on Monday in two engines and on Sunday in the third is
    [`req-axis`](00-axis.md) itself — so 80 regions of the 676 are written down, and the gate
    over them is the platform's own CLDR, asked about **every** two-letter region code
  - gate: `apps/sandbox-e2e/src/date.spec.ts` — 16 cases × 3 engines, and every one is about
    something jsdom has no answer for: what the platform's own control does with the same
    keystrokes (measured on the same page rather than quoted), where focus goes when a panel
    outside the host tree opens, whether a month step that REBUILDS the grid carries focus with
    it, and which way an arrow moves in a grid written right to left — geometry and behaviour
    both. Plus **92 unit cases** in `day.spec.ts`, `locale.spec.ts`, `calendar.spec.ts` and
    `date.spec.ts`, of which the sharpest is the week-start table against `getWeekInfo()` over
    all 676 region codes — no sample, and a first assertion that the platform still HAS
    `getWeekInfo`, so the day the runtime loses it the check goes red rather than passing over
    nothing. The `/date` view is in `SBX_ROUTES`, so the axe audit, the RTL audit and hydration
    all take it; `states.spec.ts`'s cross-control list has it and the forced-colors spec has a
    case of its own — **723 unit cases green**, and 1045 e2e
  - control: **five recorded runs, and two of them found the gate rather than the code.** The
    Gregorian pin removed leaves 3 unit cases red, the sharpest reading `1405-09-10` instead of
    `2026-12-01` — the Persian year, round-tripped; the parser's refusal of an overflow
    replaced by the normalising builder leaves 2, with `32.08.2026` becoming 1 September; the
    RTL arrow mirror removed leaves the direction case red in **3 of 3 engines**; and the
    hook that lets focus follow a rebuilt grid leaves 6 red, in three engines and on two
    cases at once. **The fourth control found a gate that measured nothing** — the week-start
    table dropped Egypt and all twenty cases stayed green, because `pctFirstDayOfWeek` asks
    the platform first and node's ICU answers, so the comparison was the platform against
    itself ([`lesson-120`](lessons.md#lesson-120)); rewritten to take `getWeekInfo` AWAY —
    which is firefox — the same edit reads `EG: ours 1, ICU 6`. **The fifth found dead code**:
    the bidi strip the `ar-EG` comment argued for changes nothing, because the parser splits
    on runs of digits and every other character already separates — removed, and the cases
    stayed green. The mutation run then found a second piece of the same: `new Date(0)` IS
    midnight UTC, so the `setUTCHours(0, 0, 0, 0)` beside it was a no-op, and the mutant that
    deletes it is what said so
  - _the controls that were the tests' own defects:_ two of the cases were written so they
    could not fail. The RTL one asserted that the label after `ArrowRight` **contained `26`**,
    and every label on that page contains `26` — it is in the year; the case passed with the
    mirroring taken out. It compares DOM positions now, which have no second reading. The
    other named the focused cell by `27` where `2027` would have done as well; it compares
    ELEMENTS. Beside them, a page-wide `[tabindex="0"]` selector resolved to **two** cells —
    the view carries an inline calendar as well as the panel — 30 of 48 red, and the view
    doing exactly what it is there for; Playwright's own actionability check **reads
    `aria-disabled` and refuses to press the cell**, which is a third party confirming the
    state is legible; and `check-coverage` fired on the one template branch no case rendered,
    where the fix was a real defect — `aria-describedby` named a hint the error had just
    replaced, an id pointing at nothing
  - cost: `./date` **38835 B** on `./core` and `./icon`, with `@angular/cdk/overlay`,
    `@angular/common`, `@angular/forms` and `@angular/forms/signals`. 58 tokens and 23 pairs in
    the contrast policy; six new words in the name dictionary (`caption`, `day`, `icon`, `nav`,
    `toggle`, `weekday`) and two states (`muted`, `today`); one new icon name (`calendar`);
    twelve parts; **six new strings** — and those six are the line worth reading twice:
    **every other entrypoint grew by exactly 142 B**, because `PCT_DEFAULT_TEXTS` is one
    constant in `./core` and a consumer importing `./button` alone now carries the date
    field's vocabulary. `./icon`, which depends on `./core` not at all, is the control: it did
    not move
  - _the tool that writes more than the gate reads:_ `--update-snapshots` rewrote
    `checkbox-in-wrapper.png` and `number-amount.png`, neither of which had failed. Measured:
    reverting both and running the two cases again leaves them green, so the flag writes on
    ANY pixel difference while the gate judges on its own budget
    ([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md) — the writer and the
    gate disagreeing about what a change is). The two were reverted by hand; the seven that
    really moved are in the diff
  - _the finding that was not there:_ the toggle button's icon raised the question of whether
    `NgTemplateOutlet` earns `@angular/common` for one chevron drawn twice. It is left as the
    select left it — one `<ng-template>` and two outlets, because
    [`lesson-67`](lessons.md#lesson-67) is about a second drawing to keep in step, and the
    entrypoint already carries `@angular/common` for the calendar's own. No item
  - _the finding that was:_ **C34** — the control knows there is text in the field and that it
    is not a date, and has **nowhere to say so**: `errors` is an input the form owns, so a
    required date typed as `31.02.2026` leaves the form saying "this field is required" while
    three numbers stand in front of the user. It reports `aria-invalid` and a state attribute
    and stops there. **C35** is the second, and the gate found it: a calendar's chosen day
    written `data-pct-selected` makes every bundle holding one read as holding the select,
    because `pct-selected` contains `pct-select` and that is the marker `check-bundle` reads
    an entrypoint by. The attribute is `data-pct-chosen`; the missing rule is the item.
    **C33 has bound as well, and it bound by FIRING**: `check-mutation` reads
    its spec denominator out of the report's coverage, so `day.spec.ts` and `locale.spec.ts` —
    which touch no Angular and therefore covered nothing in the mutated set — read as "did not
    run". The sentence is false and the only remedy is true: measure the files they cover. So
    `day.ts` and `locale.ts` are the first two files added to that set since it was written,
    `calendar.ts` and `date.ts` stay out, and the rule that decides between them is exactly
    what C33 says nobody has written down
  - _the baseline that would have moved on its own:_ a calendar is the one control here whose
    DRAWING depends on the wall clock — today carries a ring, and which cell that is moves
    every midnight. Left alone, the calendar baselines would have been right for eleven months
    of the year and gone red in the twelfth with nothing having changed, and the forced-colors
    case would have compared today with itself on exactly one day of it (which is the day this
    was built, and how it was found). `visit()` takes a `now` now — `page.clock.setFixedTime`
    and deliberately not `install`, whose faked timers would take the transition waits down
    with them
- [~] **E7 — the rest**: toast, tabs, accordion, drawer, pagination, progress, skeleton, chips,
  avatar, badge, breadcrumb, stepper, tree
  - _notes (the toast):_ **one of thirteen is done, and it is the one whose every fork was
    settled by reading what an engine publishes rather than by reading a specification.** The
    item began with a prediction two phases old:
    [0026](decisions/0026-one-channel-per-politeness.md) said the assertive channel's "first
    callers are the toast and the dialog, at E1". Both turned out not to be, and by 0026's own
    rule — **a message with a place on the screen announces from that place** — so the toast
    is drawn inside a live region rather than duplicated into a hidden one, and the
    prediction is corrected in a document rather than left standing
    ([0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md),
    **C37**). What 0026 got right is the half this component is built on: a region entering
    the document together with its text is a region nobody has registered, so a render opens
    the viewport **empty** and every message after that is a change inside it.
    · The role was settled by chromium's own accessibility tree, and it is the reflex that is
    wrong: `role="status"` publishes `atomic=true`, which re-reads every message on the screen
    each time one arrives; `role="log"` publishes `polite`, `atomic=false`,
    `relevant="additions text"` — a stack read one message at a time — **with no attribute of
    ours at all**, which is
    [0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) read a fourth
    time and the first time it has decided a role rather than an attribute. Urgency is then a
    property of the MESSAGE: an `alert` nested in the `log` publishes `assertive` and `atomic`
    for itself while the log around it stays polite, so one stack in one place holds both
    kinds in the order they arrived
  - _the thing the plan did not foresee, and it cost the afternoon:_ **a `z-index` cannot get
    above the top layer.** The stack sat under a dialog's veil at 1100 against a container
    declaring 1000, and raising the number to 99999 changed nothing — the CDK renders every
    overlay inside a shown `popover`, and the `z-index: 1000` still on
    `.cdk-overlay-container` is exactly what makes the defect read as an ordinary stacking bug
    ([`lesson-122`](lessons.md#lesson-122)). The way out is the platform's: the viewport is a
    `popover="manual"`, shown when created and shown again per message, because the top layer
    orders by **when a thing was shown**. Three measurements came with that road — a closed
    popover is `display: none` and its live region is ABSENT from the accessibility tree; the
    user agent's own sheet gives a popover `inset: 0`, a border, padding, a background and
    `overflow: auto`, every one of which has to be taken back; and the toggle does **not**
    restart the transitions of the cards already in the stack, measured in three engines,
    which is the only reason the road is affordable
  - _the second cross-cutting finding:_ `PctModalBackground` leaves the live children of `body`
    speaking, and it recognised them by the `aria-live` **attribute** — which a `role="log"`
    does not carry. So the exemption learned the five live roles, and the claim it rested on
    stopped being a quotation: measured through CDP, a `role="status"` under `inert` is
    **absent** from chromium's accessibility tree, the same as under `aria-hidden`, and it
    comes back when the attribute goes. That is D1's rule arriving on a second consumer — one
    consumer cannot tell a shared property from an accident of the only case — and it is why
    the toast is a child of `body` rather than of `<app-root>`
  - _what the type does instead of a rule:_ the spec is a discriminated pair. A notice carries
    a `duration`; a **standing** message — one that is urgent or carries an action — has no
    `duration` field at all, so a clock on it is a compile error. The reason it must not have
    one is a measurement too: **focus removed with its element lands on `body`** in three
    engines, so a control expiring under a keyboard user takes their place on the page with it
    ([`lesson-121`](lessons.md#lesson-121)). Nothing expires while a pointer is over the stack
    or focus is inside it, and what is left of a clock is resumed rather than restarted
  - gate: `apps/sandbox-e2e/src/toast.spec.ts` (15 cases × 3 engines), the `/toast` view added
    to the axe audit, hydration and the RTL audit, a stack of three messages audited separately
    (the state the walk over the routes cannot reach), the `toast-stack` and `toast-stack-rtl`
    baselines, a forced-colours case of its own, and 21 unit cases in `toast.spec.ts` — 744
    unit cases green
  - control: the ABSENCE of `aria-live`, `aria-atomic` and `aria-relevant` asserted in both
    suites, which is the only way to hold an attribute that must not be written
    ([`lesson-112`](lessons.md#lesson-112)); the top layer's recency rule pinned from **both**
    sides — a message raised while the modal is up can be pressed through the veil, an older
    one cannot; and the pointer's pass-through measured on the page rather than on the
    stylesheet (a point in the corner the stack does not cover answers as the page)
  - cost: `./toast` **15311 B** on `./core` and `./icon`. `./core` grew 200 B, and the fan-out
    of that is the line worth reading twice: every entrypoint standing on it grew **142 B** for
    the one new string (`PCT_DEFAULT_TEXTS` is one constant) and the five that open overlays a
    further 35 B for `pctInheritedFrom` becoming a function instead of three lines inside
    `show()`. `./icon`, which depends on `./core` not at all, did not move — the same control
    the date field had. 21 tokens and 5 contrast pairs; two new part words (`action`,
    `message`) and two new properties (`inset`, `z-index`) in the name dictionary; one new
    system colour (`LinkText`) in the e2e palette; four parts; one new string
  - _the findings left behind:_ **C36** (a message reports nothing by colour, and the icon set
    that would repair it is a decision nobody has made), **C37** (the assertive channel now has
    no candidate consumer at all) and **C38** (a control in the corner is last in the page's
    tab order and nothing carries the keyboard to it). **C33 gained two more files** — the
    toast's two are the first added to the mutation set on nothing but the habit that component
    logic belongs in it, which is precisely the rule that item says is unwritten
- [ ] **E6 — table / datagrid** on a headless core (column model, sorting, filtering, grouping,
      selection as signals) separated from rendering. **The last item of the phase** — the only
      one counted in months rather than days; until the decision in
      [0016](decisions/0016-mit-irreversibility.md) is made it does not exist as a commit either,
      because the root `LICENSE` covers the whole repository

## F. Phase 3 — the trust surface

- [ ] **F1 — `apps/docs`** → closes `req-project-apps` and `req-project-layout`. Renders the
      **generated** inventories of parts and tokens, not hand-written ones
- [ ] **F2 — ACR / VPAT** out of the existing gates — you get the machine proof earlier than the
      document, which is the reverse of the industry norm (the EAA enforceable since June 2025,
      EN 301 549 in tenders)
- [ ] **F3 — benchmarks as a published number** + a performance regression that fails CI
- [ ] **F4 — DTCG ↔ Figma / Tokens Studio bridge** — the source of truth is already DTCG, an
      unused advantage
- [ ] **F5 — a surface for AI agents**: `llms.txt`, a machine-readable component catalogue from
      the same source as the docs, canonical examples

## G. Gaps with no deadline

Waiting for the trigger written in their **Binds at** field. They are not forgotten — they are
deferred.

- [ ] **G1 — `req-api-number`**: property tests for the parser (`parse(format(n)) === n` for any
      `n` and locale). Binds at the first locale outside `pl`/`en`
- [ ] **G2 — `req-project-files`**: a check on the entrypoint directory layout. Binds at the first
      component added by somebody other than the author of the rule
- [ ] **G3 — `req-token-directive`**: a theme directive instead of a hand-written `data-theme`.
      Binds once setting the attribute from a template starts repeating
- [ ] **G4 — `req-token-density`**: the DTCG sources contain **not one** density token. Binds once
      the size axis settles — note that density will go below the touch-target threshold, so it
      has to arrive together with a gate, not before one
