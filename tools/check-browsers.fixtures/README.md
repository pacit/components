# Negative control of the browser matrix gate

Deliberately defective inputs. `tools/check-browsers.mjs` runs all six of its points on
each of them and **requires every one to be rejected — and rejected by the rule it
declares**. An input that passes is a fault; an input that fires somewhere other than
where its file says is a fault just the same, because it proves something other than
what it declares.

Every case carries the pair `check` + `rule`, not the point number alone — straight from
[`lesson-50`](../../docs/lessons.md#lesson-50). Measured on this gate: disarming
**eight of the rules** (there were twenty-six of them the day that was measured) moves their
cases onto a neighbouring rule, and without that field all eight runs would be green.

The reason it exists is the same as for every other gate
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
Here it guards a promise with no symptom at all: undoing the browser matrix gives not one
red test, because Playwright exits zero after three projects exactly as it does after
one — and exactly as it does after zero collected tests.

## How a case is built

A case is not one more copy of the correct input with a single thing broken. The gate
builds it from two layers:

1. a copy of `_reference.json` — the picture of the repository on the day the gate was
   written, which **must pass**;
2. the changes from the case file (`dropEngines`, `addExclusions`, `dropCollected`, `ci`,
   `facts`, …).

That way the case file holds **nothing but its own defect** and the diff shows exactly
the one thing at issue. The reference input is checked separately and first: were it
defective itself, every case would fire because of it rather than because of its own —
that is, this whole control would become what it stands against.

## What these cases do NOT exercise

Three readings arrive here as data rather than from a real run:

- `collected` — instead of the result of `playwright test --list --reporter=json`,
- `e2e` — instead of the command from the Nx graph,
- `facts` — instead of probes in live browsers.

This is the same choice as in `check-parts` and `check-zoneless` and for the same reason:
three browsers and the Nx graph for each of the twenty-five cases would cost minutes, and
the gate runs on every commit. The price is written down outright — the code reading the
Playwright report, the graph and the probes is not exercised here once. It is exercised
instead by **every** run against the real repository.

## One rule with no case

`denominator/unreadable-measurement` — fires when `playwright test --list` cannot be run
or its output is not JSON. It cannot be reached by an input in the form of data, because
it belongs to the reading layer and not to the checks. Disarmed, it **gives no symptom**:
the gate stays green, because in a healthy repository that path is never taken.

It is verified instead by a run against the real repository: an unclosed bracket in
`playwright.config.mts` fires it with the parser's message. That is the only route to
this rule and therefore the only proof it has.
