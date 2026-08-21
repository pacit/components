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
all nine runs would be green.

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
reason: a build for each of the thirty-one cases would cost minutes, and the gate runs on
every commit. The price is outright: the code reading `ɵcmp.consts` and `ɵdir.hostAttrs` is
not exercised here once. It is exercised instead by **every** run against the real
repository.

## One rule with no case

`denominator/unknown-node` — fires when `parseTemplate` returns a kind of node this
workaround does not know. It cannot be reached today: selectorless syntax (`<Widget/>`,
`@Marker`), the only source of new node kinds on the horizon, is **off** in the parser's
default options — measured, `parseTemplate('<Widget/>')` gives an ordinary `Element`. The
rule exists so that the day it is switched on is the day the gate **says so**, and not the
day it quietly stops measuring the contents of such a node.
