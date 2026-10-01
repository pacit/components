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
run of a cached target is answered from the cache — on a desk, and in CI, whose gates job
restores the previous run's. Six gates stood like that until 2026-09-30, and nothing held the
rule.

## How a case is built

A case is built ON A COPY of the live reading — the repository as it stands at the commit under
test — so its file holds nothing but its own defect. The operations: `scripts` and `tracked`
emptied, replaced or padded; `findings` extended; `reported` and `passed` set; `underTools` and
`exercised` emptied or extended; a `policy` entry dropped or set; `targets` emptied or extended
with a target that carries its `scripts`, its `unresolved` tokens and either its `names` (the
files its inputs resolve to, as given) or its `inputs` (patterns, resolved by the planner the
live reading asked, over a copy of the graph that carries the target); an edge set in `imports`;
what the readers said of their prepared inputs set in `loads`, and set or dropped by target in
`runs`. A case that adds a target empties the list first, so that it is rejected for its own
target and not for a live one that happens to be wrong on the same day. A stored copy of the
input is deliberately absent — it would measure the repository as it stood the day somebody
stored it (`lesson-207`).

## The readers have a control of their own

The cases examine the **judge** — they hand it an input and require a rejection. Point 5's
judge rules on what two readers produced: the modules a script loads, and the scripts a command
runs. A reader that stops seeing one form leaves the gate green over the module it stopped
seeing, and no prepared case can miss that absence, because the edges of a case are exactly what
the reader was supposed to produce. So point 3 holds the readers as it holds the name reader:

- [`a-script-that-loads.mjs`](a-script-that-loads.mjs) carries every form of a load this
  repository writes — a static import, a re-export from the directory above, an `export *`, an
  `import()` and a load of [`a-hop-in-typescript.ts`](a-hop-in-typescript.ts), a file that is
  no script and loads one more — and two that are not loads, a specifier inside a string (the
  shape `check-consumer.mjs` writes into generated code) and one inside a comment. The import
  reader is held to exactly five, three of them files the index holds, and the walk from the
  script is held to arrive at what the `.ts` loads (`LOADS` in the gate);
- three prepared target definitions (`RUNS` in the gate) go through the same road the live
  targets take. One carries a list of commands, one of them quoted, one beside a `&&`, one under
  a configuration, all from a `cwd` of their own, and one script the index does not hold; the
  second changes directory inside the command, so its one script resolves to nothing, and
  passes a glob that is no script; the third hands `node` a glob, which the shell would expand
  into a script list the reader cannot. The command reader is held to what it has to make of
  each, by target.

[`a-name-nothing-declares.mjs`](a-name-nothing-declares.mjs) and
[`a-name-the-browser-declares.mjs`](a-name-the-browser-declares.mjs) are the same kind of input
for the name reader: point 3 hands them to ESLint and holds it to one finding on the first and
none on the second. The five prepared files declare nothing, and the table says what they are
for. The `.ts` enters the root project's compiler program
([`tsconfig.root.json`](../../tsconfig.root.json)), as the since gate's prepared library does:
code a gate is measured against is worth compiling. What the hop loads is a clean module of its
own rather than the name reader's prepared defect, so a compiler that one day followed the
import would not read a file that is wrong on purpose.

## The cases

| file                                                                                   | what it breaks                                                                                                                                         | point | check      | rule                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------- | -------------------- |
| [`no-script-was-read.json`](no-script-was-read.json)                                   | the set of scripts is empty, so every name in it resolves                                                                                              | 1     | `measured` | `nothing-to-read`    |
| [`no-script-under-tools.json`](no-script-under-tools.json)                             | `tools/` reads empty, so point 4 has nothing that can be cold                                                                                          | 1     | `measured` | `nothing-to-read`    |
| [`no-target-runs-a-script.json`](no-target-runs-a-script.json)                         | no workflow target was found to run anything under `tools/`                                                                                            | 1     | `measured` | `nothing-to-read`    |
| [`no-target-in-the-graph.json`](no-target-in-the-graph.json)                           | the graph hands no target that runs a script, so point 5 holds nothing                                                                                 | 1     | `measured` | `nothing-to-read`    |
| [`a-key-nobody-could-read.json`](a-key-nobody-could-read.json)                         | a target the planner gave no file list for                                                                                                             | 1     | `measured` | `nothing-to-read`    |
| [`a-script-the-index-does-not-hold.json`](a-script-the-index-does-not-hold.json)       | a command names a script the index holds nowhere — a `cd` in the command where `cwd` belongs                                                           | 1     | `measured` | `script-unresolved`  |
| [`the-two-readings-disagree.json`](the-two-readings-disagree.json)                     | git sees one file the suffix match does not                                                                                                            | 1     | `measured` | `readings-disagree`  |
| [`a-name-resolves-to-nothing.json`](a-name-resolves-to-nothing.json)                   | one script names something nothing declares — the defect itself                                                                                        | 2     | `names`    | `name-undeclared`    |
| [`a-name-nothing-declares.mjs`](a-name-nothing-declares.mjs)                           | the name reader's prepared defect: exactly one name resolves to nothing                                                                                | 3     | `control`  | —                    |
| [`a-name-the-browser-declares.mjs`](a-name-the-browser-declares.mjs)                   | the name reader's prepared pass: only names a browser hands a `page.evaluate` callback                                                                 | 3     | `control`  | —                    |
| [`a-script-that-loads.mjs`](a-script-that-loads.mjs)                                   | the import reader's prepared input: five loads five ways, and two that are not loads                                                                   | 3     | `control`  | —                    |
| [`a-hop-in-typescript.ts`](a-hop-in-typescript.ts)                                     | the import reader's prepared hop: a file that is no script, loaded by one and loading one more                                                         | 3     | `control`  | —                    |
| [`a-module-beyond-the-hop.mjs`](a-module-beyond-the-hop.mjs)                           | the import reader's prepared far end: the module beyond the `.ts`, reached through nothing else                                                        | 3     | `control`  | —                    |
| [`the-reader-says-nothing.json`](the-reader-says-nothing.json)                         | the prepared defect went unreported                                                                                                                    | 3     | `control`  | `control-passed`     |
| [`the-reader-cries-wolf.json`](the-reader-cries-wolf.json)                             | the prepared browser names were reported                                                                                                               | 3     | `control`  | `control-cries-wolf` |
| [`the-load-reader-skips-a-form.json`](the-load-reader-skips-a-form.json)               | the import reader returned four loads of five, the `import()` missing                                                                                  | 3     | `control`  | `loads-misread`      |
| [`the-load-reader-reads-prose.json`](the-load-reader-reads-prose.json)                 | the import reader returned a sixth load, the one spelt inside a string                                                                                 | 3     | `control`  | `loads-misread`      |
| [`the-load-reader-keeps-a-ghost.json`](the-load-reader-keeps-a-ghost.json)             | the import reader returned the two modules nobody wrote as tracked                                                                                     | 3     | `control`  | `loads-misread`      |
| [`the-load-reader-stops-at-a-hop.json`](the-load-reader-stops-at-a-hop.json)           | the walk stopped at the `.ts` and never reached what it loads                                                                                          | 3     | `control`  | `loads-misread`      |
| [`the-run-reader-skips-a-script.json`](the-run-reader-skips-a-script.json)             | the command reader returned three scripts of four, the one under a configuration missing                                                               | 3     | `control`  | `runs-misread`       |
| [`the-run-reader-finds-a-ghost.json`](the-run-reader-finds-a-ghost.json)               | the command reader resolved the script the index does not hold                                                                                         | 3     | `control`  | `runs-misread`       |
| [`the-run-reader-loses-a-ghost.json`](the-run-reader-loses-a-ghost.json)               | the command reader dropped the unresolved token without a word                                                                                         | 3     | `control`  | `runs-misread`       |
| [`the-run-reader-finds-a-fifth-script.json`](the-run-reader-finds-a-fifth-script.json) | the command reader returned a script the target never runs                                                                                             | 3     | `control`  | `runs-misread`       |
| [`the-run-reader-drops-a-target.json`](the-run-reader-drops-a-target.json)             | the target whose only script resolves to nothing is missing from what the reader returned                                                              | 3     | `control`  | `runs-misread`       |
| [`a-script-no-pass-reaches.json`](a-script-no-pass-reaches.json)                       | a script nothing invokes and nothing imports, with no reason in the register                                                                           | 4     | `run`      | `unexplained`        |
| [`an-excuse-nobody-removed.json`](an-excuse-nobody-removed.json)                       | the register excuses a script a pass does reach                                                                                                        | 4     | `run`      | `stale-excuse`       |
| [`a-module-the-target-does-not-hash.json`](a-module-the-target-does-not-hash.json)     | a target runs a script that imports a module, and its inputs name the script alone                                                                     | 5     | `inputs`   | `unnamed`            |
| [`a-module-imported-by-a-module.json`](a-module-imported-by-a-module.json)             | the script's import is named and the module that one imports is not, with a cycle back to the script; a reader one import deep passes it               | 5     | `inputs`   | `unnamed`            |
| [`a-script-named-and-not-run.json`](a-script-named-and-not-run.json)                   | the inputs name a script the command does not run, complete with its import, and not the one it runs; a reader starting from the inputs passes it      | 5     | `inputs`   | `unnamed`            |
| [`everything-but-the-module.json`](everything-but-the-module.json)                     | `{workspaceRoot}/**/*` with a `!` that takes the module back out, resolved by nx's planner; a reader that calls the first pattern everything passes it | 5     | `inputs`   | `unnamed`            |

## What the live reading holds

Two halves of point 5 cannot be prepared, because a prepared input has to be rejected and these
have to pass. They stand in the repository itself, and the gate reads them on every run:
`check-docs` and `check-language` name `{workspaceRoot}/**/*` and import a module, so the
pattern alone has to name everything (`check-reach` names it too, and imports nothing); and
`check-acr` names every `check-*.mjs` while running one of them, so a script named in `inputs`
and not run must not be held to its own imports — a reader that took the scripts from the
inputs would fire on `check-bench.mjs`'s `fresh-inputs.mjs` there.
