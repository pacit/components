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

A case is not a ninth copy of a correct corpus with one thing broken. The gate builds it
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

## The cases

| directory                                        | what it breaks                                                         | point | rule                 |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ----- | -------------------- |
| [`no-specs`](no-specs)                           | not one spec to read — the walk found nothing and says nothing         | 1     | `specs`              |
| [`support-not-read`](support-not-read)           | the support tree gone, so no reading the specs take is recognisable    | 1     | `readers`            |
| [`nothing-to-rule-on`](nothing-to-rule-on)       | specs with neither a positional locator nor a bare wait in them        | 1     | `material`           |
| [`unbalanced-spec`](unbalanced-spec)             | a block the file never closes — the scanner loses the rest of it       | 2     | `unbalanced`         |
| [`empty-spec`](empty-spec)                       | a spec the scanner makes no statement of, counted as examined          | 2     | `empty-file`         |
| [`toast-tone-race`](toast-tone-race)             | `items(page).last()` read in the instant after the click that fills it | 3     | `read-after-action`  |
| [`hovered-card-race`](hovered-card-race)         | the same, with the index written into the read instead of bound        | 3     | `read-after-action`  |
| [`paused-sheen-baseline`](paused-sheen-baseline) | a measured 150 ms deciding when the baseline is taken                  | 4     | `wait-then-baseline` |

Point 1 has three cases, because there are three different routes by which this gate ends a
run green having measured nothing: the file list returns no spec, the support tree drops out
so every `styleOf(…)` stops looking like a reading, or the corpus holds none of the two
shapes the rules are about. Each of them leaves a repository that looks perfectly sensible.

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
