# Negative control of the e2e race gate

Deliberately defective corpora. `tools/check-e2e.mjs` runs all four of its points on each of
them and **requires every one to be rejected — and rejected by the point and the rule it
declares**. A corpus that passes is a fault; one that fires for a reason other than the one
written in its `fixture.json` is a fault just the same, because it proves something other
than what it declares.

The reason it exists is the same as for every other gate in this repository
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
Here that is literal to the point of being uncomfortable, because the two defects this gate
was opened for were _green on every run that did not happen to hit them_. Two full runs of
`sandbox-e2e` came back 1 red of 2062 and a different one each time; aimed at with
`--repeat-each=30` the two answered 3 of 30 and 2 of 30. A rule over the shape is the cheap
half of that, and a rule over a shape has exactly one way of going wrong quietly: it stops
matching. That is what these corpora are for.

## How a case is built

A case is not a thirteenth copy of a correct corpus with one thing broken. The gate builds it
from two layers:

1. `_reference/` — the reference corpus: a support tree with the helpers every reading goes
   through, and three specs,
2. the case directory's files, copied **onto a copy of the reference**, plus the removals
   from `drop` in `fixture.json`.

That way the case directory holds **nothing but the defect** — it is visible without
comparing files — and does not drift from the reference when the shape of a spec changes.

The specs sit here as `*.ts.txt` and become `*.ts` only at assembly, in a temporary
directory outside the repository. The reason is hard and was written down earlier in
[`tsconfig.root.json`](../../tsconfig.root.json): a `.ts` file under `tools/` belongs to no
compiler program, so it would fire `check-typecheck`. One gate's fixture may not be
another's defect — the same class of problem as the fake `package.json` in
[`check-package.fixtures`](../check-package.fixtures/README.md) and the component sources in
[`check-styles.fixtures`](../check-styles.fixtures/README.md).

## The reference carries both real bugs — in their FIXED shape

**The reference corpus must pass.** This is not a check for good measure: were the reference
itself defective, every case would fire because of it rather than because of its own defect,
and every "rejected" would be false.

It carries one thing besides, and it is the half of the proof that a case directory cannot
give. `toast.spec.ts` is the tone case as 58c1918 left it and `sheen.spec.ts` is the paused
sheen as 2af78c7 left it — the accepted cures, both of them, sitting in the input that must
stay silent. A rule that grew until it fired on the fix would be caught **here**, by the
reference refusing to pass, rather than out in a spec somebody then rewrites to please a
gate. `sheen.spec.ts` holds all three of the wait shapes point 4 deliberately says nothing
about: the poll that leaves on a condition, the 700 ms window in which nothing may change,
and the reading taken before the wait rather than after it. `static.spec.ts` is the third —
an index into a list nothing is appending to, read after an auto-retrying assertion has said
how long the list is, which is most of the real suite and must never fire.

## The runner's own control

The runner reports a case that passed, a case that fired more than its own point, a case that
fired another check, one that fired another rule and one whose refusal does not hold the text
its `message` pins, and no case here proves it does: every case is built to fire its own point
alone, saying what it pins. [`_runner.json`](_runner.json) holds those rules. Through
[`runner-control.mjs`](../runner-control.mjs) the runner plays `hovered-card-race` as written
and pinned to its own `message`, which it has to pass; pinned to its own refusal with the site
`toast-tone-race` holds in the middle, which it has to report, as only the whole pin tells the
two apart; and once for each other rule — over `_reference`, which the gate passes; over
[`_two-points/`](_two-points), the card's race beside the paused sheen's bare wait, two points
of which the race comes first, so that only the rule of one point alone reports it; with
`check` set to `baseline`; with `rule` set to `wait-then-baseline` — and has to report each.
`_two-points/` is no case: like `_reference`, its `_` keeps it out of the loop. The control is
played apart from the cases and counts as none. **Not held:** a `fixture.json` that cannot be
read, which the loop reports before the runner plays anything; and the wiring of the pins
itself, as `runner-control.mjs` leaves `pins` unplayed without a word when a gate hands it no
`pin`.

## The cases

| directory                                              | what it breaks                                                                          | point | rule                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----- | -------------------- |
| [`no-specs`](no-specs)                                 | not one spec to read — the walk found nothing and says nothing                          | 1     | `specs`              |
| [`support-not-read`](support-not-read)                 | the support tree gone, so no reading the specs take is recognisable                     | 1     | `readers`            |
| [`reader-dropped`](reader-dropped)                     | `support/css.ts` gone, `dom.ts` left: one reader counted, `styleOf` lost                | 1     | `helpers`            |
| [`reader-under-alias`](reader-under-alias)             | the card's race read through `styleOf` as another helper's name, aliased or the default | 1     | `helpers`            |
| [`reader-through-namespace`](reader-through-namespace) | the card's race read through `css.styleOf` of `import * as css`                         | 1     | `helpers`            |
| [`reader-leans-outside`](reader-leans-outside)         | `styleOf` a thin name over helpers imported from `..` and `.`, outside the corpus       | 1     | `helpers`            |
| [`nothing-to-rule-on`](nothing-to-rule-on)             | specs with neither a positional locator nor a bare wait in them                         | 1     | `material`           |
| [`unbalanced-spec`](unbalanced-spec)                   | a block the file never closes — the scanner loses the rest of it                        | 2     | `unbalanced`         |
| [`empty-spec`](empty-spec)                             | a spec the scanner makes no statement of, counted as examined                           | 2     | `empty-file`         |
| [`toast-tone-race`](toast-tone-race)                   | `items(page).last()` read in the instant after the click that fills it                  | 3     | `read-after-action`  |
| [`hovered-card-race`](hovered-card-race)               | the same, with the index written into the read instead of bound                         | 3     | `read-after-action`  |
| [`paused-sheen-baseline`](paused-sheen-baseline)       | a measured 150 ms deciding when the baseline is taken                                   | 4     | `wait-then-baseline` |

Point 1 has seven cases over four rules, because there are four different routes by which
this gate ends a run green having measured nothing: the file list returns no spec, the
support tree drops out so every `styleOf(…)` stops looking like a reading, a helper the specs
call is one the corpus does not define, or the corpus holds none of the two shapes the rules
are about. Each of them leaves a repository that looks perfectly sensible.

`helpers` is the third, and it was found by measurement rather than foreseen: on 2026-10-27,
`hovered-card-race`, `toast-tone-race` and `paused-sheen-baseline`, each built with
`support/css.ts` dropped, passed — the race and the baseline unreported, and `readers`
satisfied by the `boxOf` that `support/dom.ts` still defines. A count of readers says nothing
about which ones, so the rule names them: every helper a corpus file calls from a relative
module (`.`, `..` or a path under either) has to be one the corpus defines, under the name the
call writes, because that name is all a vocabulary matches. `reader-dropped` is the measured
case, beside a spec with a `styleOf` of its own, as a helper name is file-local. The other
three are the routes to the same silence: an alias, refused once it is called whatever the
corpus defines under it, written as `a as b` or as a default import (both here land on the name
of a lookup `support/swatch.ts` defines), and a namespace, refused whole, as no such call
writes the helper's own name; and a support file whose reader leans on imports from `..` and
`.`, the first written over lines with a comment between its names and the reader second. The
reference holds the other side: `static.spec.ts` takes `test` and `expect` from a fixtures
module of the suite's own, the first under an alias, as points 3 and 4 read both names as
themselves whatever binding hands them on, and the support tree's types as a namespace no call
goes through; and the `mergeTests` the fixtures module calls is Playwright's, as no name from a
package is a helper.

**Not held** — routes to a helper no vocabulary sees that this rule does not read. The import's
module is not resolved: a name is held to the whole pool of both suites' support trees, so a
lookup of the same name in another support file stands in for a reader that is gone, and a
re-export is not read (`export { styleOf as colourOf } from './css'`, `export * as css`, an
object of helpers called as `css.styleOf(…)`). What a fixtures module puts into `test` or
`expect` is not read either — a matcher of `expect.extend` reads in the window it is meant to
close, and nothing here says so. Nor is a helper reached through a package name or a path
alias, a dynamic `import()`, `require`, or a Playwright fixture; one a file defines in a shape
the scanner does not read (`const x = function …`) and calls itself, or rebinds (`const
colourOf = styleOf`); a call not written as `name(` — with type arguments, inside `${…}`, a
helper handed on as a value (`cells.map(boxOf)`); and a name with a `$`, which the matching
takes for a regex anchor. Of the import itself: an indented one is not read, which prettier
never writes, and a double-quoted module is read and no case holds it, as `.prettierrc` sets
`singleQuote`.

Points 3 and 4 hold **the two real bugs, reconstructed**. `toast-tone-race` is
`apps/sandbox-e2e/src/tones.spec.ts` as it stood before 58c1918 and
`paused-sheen-baseline` is `apps/sandbox-e2e/src/skeleton.spec.ts` as it stood before
2af78c7. Neither is a hypothesis about what a race might look like: both failed a real run,
and both were invisible until somebody pointed `--repeat-each` at them.

## Points 1 and 2 are the denominator, not a formality

The rules are in points 3 and 4; points 1 and 2 guard the material those rules work over.
The same mechanism that has shrunk the sample of files in a coverage report, the set of
measured components and the set of projects ([`lesson-48`](../../docs/lessons.md#lesson-48))
— here it is the set of statements that shrinks, and it shrinks without a word.

`unbalanced-spec` is not a hypothesis either. The first version of this gate's scanner reset
no depth on entering a block, so not one `;` inside a test body was a statement boundary: it
found 18 of the suite's 22 waits, zero races, and looked exactly as green as a working one.
The second version was taken down by `a11y.spec.ts`, which holds `.replace(/^\`\`\`\s*$/m, …)`
— a regex literal with three backticks in it, which opened a template literal that swallowed
the next eight lines and a brace with them. Point 2 is what reported both.

## Adding a new rule to the gate

A new rule in `check-e2e.mjs` comes **together with the case** that fires it, and with an
identifier that tells you it was that rule and not its neighbour. A rule with no case is
exactly what [`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able to
fire on it, only one floor up. And a rule that fires on something the repository has decided
is right belongs in `_reference/`, where the disagreement is loud, rather than in an
exemption that makes it quiet.
