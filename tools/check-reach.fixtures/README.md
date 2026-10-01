# Negative control of the reach gate

Deliberately defective inputs. `tools/check-reach.mjs` runs all seven of its points on each
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

1. a copy of `_reference.json` — a small repository that **must pass**, seventeen files
   covering every way this gate reaches one, with nx's file set beside them and a listing
   of each place nx loads a dotenv file from,
2. the case's own mutation: `addFiles`, `dropFiles`, `setTexts`, `addRoots`, `addEntries`,
   `dropHashed`, `addHashed`, `addListings`, `clearFiles`, `clearTexts`, `clearRoots`,
   `clearListings`.

So a case file holds nothing but its own defect. The reference is checked separately and
first: were it defective, every case would fire because of it, and every "it fired" would
be false.

A case may also carry `names`: text its message has to hold, each found with no digit on
either side, so `2 dotenv files` is not read in `12 dotenv files`. A finding that names one
file of two, or a file without its directory, sends a person to the wrong place and passes
every other check here. The cases of points 1, 6 and 7 below carry it; the older ones do
not.

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

## What nx reads and no hash is bound to

Points 6 and 7 hold two routes by which a cached pass outlives what it measured, and no
`inputs` entry can name either: a tracked file out of nx's own file set, and a dotenv file
nx loads into a task's environment. The reference carries the edges that must pass — a file
the working tree lost (`docs/retired.md`), a file nx sees and the index does not
(`docs/draft.md`), four root names that only look like dotenv files, and a `.env` in a
directory that is no project root.

| case                                                 | what it pins                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `a-file-an-ignore-rule-hides.json`                   | a binary file out of nx's set fires, not only a readable one  |
| `a-hidden-file-first-in-the-index.json`              | the first path of the index is read                           |
| `a-hidden-file-last-in-the-index.json`               | the last path of the index is read                            |
| `two-files-out-of-nxs-set.json`                      | the message gives the count and names both files              |
| `a-dotenv-file-at-the-root.json`                     | `.env` itself, between two other names, reported once         |
| `a-dotenv-file-for-one-target.json`                  | `.env.<target>`, the last name of its listing                 |
| `a-dotenv-file-for-one-configuration.json`           | `.env.<target>.<configuration>`, two segments after `.env`    |
| `a-dotenv-file-in-the-other-form.json`               | `.<target>.env`, the second form nx loads for a target        |
| `a-local-dotenv-file-for-one-target.json`            | `.<target>.local.env`, two segments before `.env`             |
| `two-dotenv-files-in-one-place.json`                 | the message gives the count and names both files              |
| `a-dotenv-file-in-a-project-root.json`               | a project root taken from `project.json`, the middle of three |
| `a-dotenv-file-beside-a-package-manifest.json`       | a place taken from a `package.json` alone, the last place     |
| `a-dotenv-file-in-a-project-git-does-not-track.json` | a project nx sees before anyone adds its manifest             |
| `a-project-root-nobody-listed.json`                  | point 1: the workspace root keyed as `.` and not as `''`      |
| `project-roots-nobody-listed.json`                   | point 1: two places in the middle, both named                 |
| `an-untracked-project-nobody-listed.json`            | point 1: the places of nx's set, not of the index             |

The readers stay outside this control, as the index and text readers do: the file set nx
is asked for, the paths the working tree holds nothing at, and the listings of the disk. A
live run passes with any of them broken on a clean repository. What holds them is point 1,
which refuses a workspace root keyed as `.` and, while nx sees a project the index does not
hold, listings taken off the index — and the plants this change was checked by.
