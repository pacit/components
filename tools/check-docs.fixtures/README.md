# Negative control for the docs gate

Deliberately broken material. `tools/check-docs.mjs` runs all seven of its checks on each case
and **requires every one to be rejected**. A fixture that passes is a bug — it means the gate has
stopped measuring anything.

Most cases are requirements, which is what points 1–3 read. Point 7 reads a component CARD, so
its case stands in a subdirectory of its own: the loop for the other points parses everything
beside it as a requirement and would find none in a card.

The reason it exists is the same as for every other gate in this repository
(`req-quality-negative-control`): **a new gate is not ready when it passes — it is ready when
it has been shown to fail.** The two documented runs this rule came from are `lesson-38`
(emulation silently did nothing and the test passed on default values) and `lesson-39`
(a visual test could be born dead in two independent ways, both looking like a working test).

This directory is **exempt** from the citation check — the identifiers in it are fictional by
design.

## The cases

| file                                                 | what it breaks                                                                                        | which check must fire     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------- |
| [`no-gate.md`](no-gate.md)                           | a promise with no **Gate** field                                                                      | 1 — completeness          |
| [`none-without-reason.md`](none-without-reason.md)   | "none" without the `deliberately:` / `gap:` form                                                      | 1 — completeness          |
| [`gap-without-deadline.md`](gap-without-deadline.md) | `gap` with no **Binds at** field                                                                      | 1 — completeness          |
| [`path-does-not-exist.md`](path-does-not-exist.md)   | the gate points at a file that does not exist                                                         | 2 — existence             |
| [`cards/`](cards/)                                   | a card that says a requirement has no gate while that requirement's own **Gate** field says otherwise | 7 — no card denies a gate |

## Adding a new check to the gate

A new check in `check-docs.mjs` arrives **together with the fixture** that fires it. A check
without a fixture is exactly what `req-axis` forbids: a promise with no machine able to fire
on it, one floor up.
