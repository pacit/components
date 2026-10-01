# Negative control of the scripts gate

Deliberately defective inputs. `tools/check-tools.mjs` runs all five of its points on each of
them and **requires every one to be rejected — and rejected by the point and the rule it
declares**. An input that passes is a fault; an input that fires for a reason other than the
one written in its file is a fault just the same, because it proves something other than what
it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites twice over. Points 2 and 4 guard a script that goes quietly wrong:
a name nothing declares is invisible to a parser and a script nothing runs is read by nobody.
Point 5 guards a gate that goes quietly green: nx keys a task on its `inputs`, so a module the
gate imports and does not name is a module whose edit leaves the hash where it was, and the next
run is answered from the cache — on a desk, and in CI, whose gates job restores the previous
run's. Six gates stood like that until 2026-09-30, and nothing held the rule.

## How a case is built

A case is built ON A COPY of the live reading — the repository as it stands at the commit under
test — so its file holds nothing but its own defect. The operations: `scripts` and `tracked`
emptied, replaced or padded; `findings` extended; `reported` and `passed` set; `underTools` and
`exercised` emptied or extended; a `policy` entry dropped or set; `targets` emptied or extended
with a target that carries its `scripts` and either its `names` (the files its inputs resolve
to, as given) or its `inputs` (patterns, resolved by the planner the live reading asked, over a
copy of the graph that carries the target); an edge set in `imports`. A stored copy of the
input is deliberately absent — it would measure the repository as it stood the day somebody
stored it (`lesson-207`).

The two `.mjs` files are not cases of the judge but of the **reader**: point 3 hands them to
ESLint and holds it to one finding on the first and none on the second. They declare nothing,
and the table says what they are for.

## The cases

| file                                                                               | what it breaks                                                                                                                                         | point | check      | rule                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------- | -------------------- |
| [`no-script-was-read.json`](no-script-was-read.json)                               | the set of scripts is empty, so every name in it resolves                                                                                              | 1     | `measured` | `nothing-to-read`    |
| [`no-script-under-tools.json`](no-script-under-tools.json)                         | `tools/` reads empty, so point 4 has nothing that can be cold                                                                                          | 1     | `measured` | `nothing-to-read`    |
| [`no-target-runs-a-script.json`](no-target-runs-a-script.json)                     | no workflow target was found to run anything under `tools/`                                                                                            | 1     | `measured` | `nothing-to-read`    |
| [`no-target-in-the-graph.json`](no-target-in-the-graph.json)                       | the graph hands no target that runs a script, so point 5 holds nothing                                                                                 | 1     | `measured` | `nothing-to-read`    |
| [`a-key-nobody-could-read.json`](a-key-nobody-could-read.json)                     | a target the planner gave no file list for                                                                                                             | 1     | `measured` | `nothing-to-read`    |
| [`the-two-readings-disagree.json`](the-two-readings-disagree.json)                 | git sees one file the suffix match does not                                                                                                            | 1     | `measured` | `readings-disagree`  |
| [`a-name-resolves-to-nothing.json`](a-name-resolves-to-nothing.json)               | one script names something nothing declares — the defect itself                                                                                        | 2     | `names`    | `name-undeclared`    |
| [`a-name-nothing-declares.mjs`](a-name-nothing-declares.mjs)                       | the reader's prepared defect: exactly one name resolves to nothing                                                                                     | 3     | `control`  | —                    |
| [`a-name-the-browser-declares.mjs`](a-name-the-browser-declares.mjs)               | the reader's prepared pass: only names a browser hands a `page.evaluate` callback                                                                      | 3     | `control`  | —                    |
| [`the-reader-says-nothing.json`](the-reader-says-nothing.json)                     | the prepared defect went unreported                                                                                                                    | 3     | `control`  | `control-passed`     |
| [`the-reader-cries-wolf.json`](the-reader-cries-wolf.json)                         | the prepared browser names were reported                                                                                                               | 3     | `control`  | `control-cries-wolf` |
| [`a-script-no-pass-reaches.json`](a-script-no-pass-reaches.json)                   | a script nothing invokes and nothing imports, with no reason in the register                                                                           | 4     | `run`      | `unexplained`        |
| [`an-excuse-nobody-removed.json`](an-excuse-nobody-removed.json)                   | the register excuses a script a pass does reach                                                                                                        | 4     | `run`      | `stale-excuse`       |
| [`a-module-the-target-does-not-hash.json`](a-module-the-target-does-not-hash.json) | a target runs a script that imports a module, and its inputs name the script alone                                                                     | 5     | `inputs`   | `unnamed`            |
| [`a-module-imported-by-a-module.json`](a-module-imported-by-a-module.json)         | the script's import is named and the module that one imports is not, with a cycle back to the script; a reader one import deep passes it               | 5     | `inputs`   | `unnamed`            |
| [`a-script-named-and-not-run.json`](a-script-named-and-not-run.json)               | the inputs name a script the command does not run, complete with its import, and not the one it runs; a reader starting from the inputs passes it      | 5     | `inputs`   | `unnamed`            |
| [`everything-but-the-module.json`](everything-but-the-module.json)                 | `{workspaceRoot}/**/*` with a `!` that takes the module back out, resolved by nx's planner; a reader that calls the first pattern everything passes it | 5     | `inputs`   | `unnamed`            |

## What the live reading holds

Two halves of point 5 cannot be prepared, because a prepared input has to be rejected and these
have to pass. They stand in the repository itself, and the gate reads them on every run:
`check-docs`, `check-language` and `check-reach` name `{workspaceRoot}/**/*` and import
`workflow-targets.mjs` or `restore-dictionaries.mjs`, so the pattern alone has to name
everything; and `check-acr` names every `check-*.mjs` while running one of them, so a script
named in `inputs` and not run must not be held to its own imports — a reader that took the
scripts from the inputs would fire on `check-bench.mjs`'s `fresh-inputs.mjs` there.
