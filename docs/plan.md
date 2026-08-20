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
| ✅ enforced                                 |    62 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |     8 |

All 8 gaps have an owner below (B, D, F, G). If adding a requirement raises the gap count
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
both exist — and C, the filler, holds one open finding, **C19**, which binds at E1. **D2,
D3, D4, D5 and D6 have closed too**, so the next unstarted item in the order is **D7** — and C,
empty since C18, holds **C20**, left behind by D4, and **C21**, left behind by D6.

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
current. **Eighteen are closed and three are open** (the numbers run to C21; there is no C5) —
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

- [ ] **C19 — the select's panel closes on Escape twice, and only one of the two is written
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
  - binds at: **E1**, where the question stops being cosmetic · _notes:_ —

- [ ] **C20 — the message that announces itself does so on nobody's rule**
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
    caller the `assertive` channel has ever had · _notes:_ —

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
component most of them never draw.

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
- [ ] **D7 — gate forbidding `@angular/animations`** → closes `req-api-animations`; binds at the
      first component with an enter/leave transition, that is at D2 · _notes:_ —

## E. Phase 2 — components

Ordered by architectural debt, not by popularity — with one reservation from
[decision 0016](decisions/0016-mit-irreversibility.md): the item with the highest build cost goes
**last**, because a release under MIT is irreversible and it is better settled with users in
hand. The numbers are stable, the list order is not.

Every new component fills in [`components/_template.md`](components/_template.md) — the DoD form
exists and is a condition of entering a release.

- [ ] **E1 — dialog** — forces a focus trap, scroll lock, `inert`, focus restore, the Escape
      stack, SSR safety. The highest architectural gain per component. **Two of those arrive
      with it rather than before it**: `inert` on the background and the scroll lock are the
      modal half of D2's overlay layer, left out there for want of a consumer — a listbox panel
      that locked the page's scroll would be a defect
      ([0024](decisions/0024-the-closing-stack-is-the-dependency-s.md)). The Escape stack is
      **not** among them: it is the dependency's, measured in `core.spec.ts`, and what the
      dialog inherits is the rule that its own Escape may not live above its control
- [ ] **E2 — tooltip + popover** — the "describes vs names" distinction, hover/focus/touch
      parity, motion reduction on a real enter/leave
- [ ] **E3 — menu** — roving focus, submenus, reuse of the typeahead from D1
- [ ] **E4 — closing out the select family** — projected `pct-option`, an option template,
      groups, multiple selection, filtering, clearing, async, virtualisation. Deliberately
      **after** the behaviour layer
- [ ] **E5 — switch, textarea (autosize), slider, date picker** — the date picker forces deep
      i18n, which `[pctNumber]` has already started
- [ ] **E7 — the rest**: toast, tabs, accordion, drawer, pagination, progress, skeleton, chips,
      avatar, badge, breadcrumb, stepper, tree
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
