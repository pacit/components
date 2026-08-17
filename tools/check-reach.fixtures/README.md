# Negative control of the reach gate

Deliberately defective inputs. `tools/check-reach.mjs` runs all five of its points on each
of them and **requires every one to be rejected — and rejected by the rule it declares**.
An input that passes is a fault; an input that fires somewhere other than where its file
says is a fault just the same, because it proves something other than what it declares.

Every case carries the pair `check` + `point`, not the point number alone — straight from
[`lesson-50`](../../docs/lessons.md#lesson-50).

The reason it exists is the same as for every other gate
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
Here it guards a promise whose violation has no symptom at all: a file nothing reads
compiles nothing, ships nothing and fires nothing. It is found by a person, months later,
who cannot tell what it was for.

## How a case is built

A case is not one more copy of the correct input with a single thing broken. The gate
builds it from two layers:

1. a copy of `_reference.json` — a small repository that **must pass**, sixteen files
   covering every way this gate reaches one,
2. the case's own mutation: `addFiles`, `dropFiles`, `setTexts`, `addRoots`, `addEntries`,
   `clearFiles`, `clearTexts`, `clearRoots`.

So a case file holds nothing but its own defect. The reference is checked separately and
first: were it defective, every case would fire because of it, and every "it fired" would
be false.

## The three cases the design rests on

| case                                        | what it pins                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `island-that-only-cites-itself.json`        | the walk starts at the roots — a copied tree citing itself is not reached         |
| `a-name-two-files-share.json`               | a bare name reaches a file only while that name belongs to one                    |
| `pattern-that-names-a-kind-not-a-file.json` | `**/*.md` names a kind of file, not a file — only a pattern with a directory does |

All three say one thing: **reach is entered from outside.** The scan that reads "does any
other file mention this one" answers yes for every file of a copied tree, because a copy
brings its own citations with it — which is how two byte-identical directories of a
vendored guide stood here for months.
