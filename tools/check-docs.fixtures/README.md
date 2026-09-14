# Negative control for the docs gate

Deliberately broken material. `tools/check-docs.mjs` runs all eight of its checks, and
**requires every case here to be rejected — by the check it was written for**. A fixture that
passes is a bug: it means that check has stopped measuring anything, and one rejected by the
wrong check proves something other than what it claims.

Most cases are requirements, which is what points 1–3 read. Point 7 reads a component CARD and
point 8 reads a PLAN, so those stand in directories of their own: the loop for the other points
parses everything beside it as a requirement and would find none in either.

A point 8 case is a directory rather than a file because a plan means nothing on its own — it is
only ever right or wrong about the requirements it names. Those requirements live once, in
[`_reference/requirements.md`](_reference/requirements.md), beside the plan that agrees with them
in every particular. The reference is not a case and is not listed below: the gate runs it too and
requires it to **pass**, because a case rejected on account of the material around it has proved
nothing about the rule written into it. Each case is then that reference plan with the one line
the case is about, and nothing else — a case that trips a neighbouring rule is a fault of the case,
and the gate says so by name.

The reason it exists is the same as for every other gate in this repository
(`req-quality-negative-control`): **a new gate is not ready when it passes — it is ready when
it has been shown to fail.** The two documented runs this rule came from are `lesson-38`
(emulation silently did nothing and the test passed on default values) and `lesson-39`
(a visual test could be born dead in two independent ways, both looking like a working test).

This directory is **exempt** from the citation check — the identifiers in it are fictional by
design.

## The cases

| case                                                                 | what it breaks                                                                                                 | which check must fire         | rule                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------- |
| [`no-gate.md`](no-gate.md)                                           | a promise with no **Gate** field                                                                               | 1 — completeness              | —                      |
| [`none-without-reason.md`](none-without-reason.md)                   | "none" without the `deliberately:` / `gap:` form                                                               | 1 — completeness              | —                      |
| [`gap-without-deadline.md`](gap-without-deadline.md)                 | `gap` with no **Binds at** field                                                                               | 1 — completeness              | —                      |
| [`path-does-not-exist.md`](path-does-not-exist.md)                   | the gate points at a file that does not exist                                                                  | 2 — existence                 | —                      |
| [`a-night-that-skips-a-gate/`](a-night-that-skips-a-gate/)           | a target on the push line that the nightly does not run — the gate that runs on a diff and never on the whole  | 3 — wired into CI             | `night-skips-a-target` |
| [`a-push-line-that-vanished/`](a-push-line-that-vanished/)           | a push workflow naming no target, which makes the night trivially a superset of nothing                        | 3 — wired into CI             | `push-line-empty`      |
| [`a-night-with-no-run/`](a-night-with-no-run/)                       | a nightly naming no target, under a header that promises everything, every night                               | 3 — wired into CI             | `night-line-empty`     |
| [`cards/`](cards/)                                                   | a card that says a requirement has no gate while that requirement's own **Gate** field says otherwise          | 7 — no card denies a gate     | —                      |
| [`plan-the-gate-cannot-read/`](plan-the-gate-cannot-read/)           | a case with no plan in it — the state in which point 8 compares nothing at all                                 | 8 — the plan and the registry | `no-plan`              |
| [`plan-with-no-tasks/`](plan-with-no-tasks/)                         | a plan whose prose survives and whose task lines do not, the one task-shaped line standing inside a code fence | 8 — the plan and the registry | `no-item`              |
| [`plan-mark-outside-the-notation/`](plan-mark-outside-the-notation/) | a task carrying a mark the plan's Notation table does not declare, which the parse passes by                   | 8 — the plan and the registry | `item-unparsed`        |
| [`plan-that-names-no-requirement/`](plan-that-names-no-requirement/) | tasks that name a requirement only in their bodies, which point 8 deliberately does not read                   | 8 — the plan and the registry | `no-claim`             |
| [`plan-offers-work-that-shipped/`](plan-offers-work-that-shipped/)   | an open task whose requirement has left the gap list — the plan offering work already done                     | 8 — the plan and the registry | `open-but-closed`      |
| [`plan-claims-work-with-no-gate/`](plan-claims-work-with-no-gate/)   | a ticked task whose requirement is still a gap — a claim that left no machine behind                           | 8 — the plan and the registry | `closed-but-open`      |

The first five rows declare nothing about themselves, so their `rule` cell is a dash: a prepared
`.md` input is read as a requirement and has no `fixture.json` to disagree with. Every directory
case carries one, and `tools/check-index.mjs` holds this table to it.

## Adding a new check to the gate

A new check in `check-docs.mjs` arrives **together with the fixture** that fires it. A check
without a fixture is exactly what `req-axis` forbids: a promise with no machine able to fire
on it, one floor up.
