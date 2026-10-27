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

Every case pins what its refusal carries, so none of them proves that comparison is made: a
runner that stopped comparing would pass them all. [`_runner.json`](_runner.json) holds it.
Through [`runner-control.mjs`](../runner-control.mjs) the runner plays
`a-name-standing-for-a-class-nobody-exports` once more, pinned to what
`a-name-another-entrypoint-holds` says of `./other` under the same rule, and has to report it.
The control is played apart from the cases and counts as none.

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

## One rule with no case

`denominator/unknown-node` — fires when `parseTemplate` returns a kind of node this
workaround does not know. It cannot be reached today: selectorless syntax (`<Widget/>`,
`@Marker`), the only source of new node kinds on the horizon, is **off** in the parser's
default options — measured, `parseTemplate('<Widget/>')` gives an ordinary `Element`. The
rule exists so that the day it is switched on is the day the gate **says so**, and not the
day it quietly stops measuring the contents of such a node.
