# Negative control of the file-structure gate

Deliberately defective trees. `tools/check-files.mjs` runs all nine of its points on each of
them and **requires every one to be rejected — and rejected by the point and the rule it
declares**. A tree that passes is a fault; a tree that fires for a reason other than the one
written in its `fixture.json` is a fault just the same, because it proves something other than
what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule has a particular edge. What it guards is a **convention**, and a
convention is the one kind of promise that never produces a red anything: an inline template
compiles, ships and renders exactly like a template in a file, and Angular's own guidance
recommends it for a small component — so the defect arrives looking like good practice. The
cost is not paid on the day it is written but two years later, by whoever has to guess where a
component keeps its stylesheet. That is why
[`req-project-files`](../../docs/requirements/project.md#req-project-files) stood with no gate
at all until this directory existed: nothing in the toolchain was ever going to mention it.

## The two denominators, and why there are two

The layout points (2, 3 and 8) run over **entrypoints**, because `ng-package.json` and
`index.ts` are an entrypoint's files and there is exactly one of each per directory. The
template and stylesheet points (4 to 7) run over **`@Component` declarations**, because an
entrypoint is not a component: `breadcrumb/` declares three of them in a single source file,
and `core/`, `testing/`, `theme/` and `regions/` declare none at all. A rule written per
entrypoint would have to demand a `.html` of `core/` and would be excused on the day it was
written; a rule written per declaration asks every component the same question. The reference
tree carries both shapes for that reason — one entrypoint with two components in one file, and
one with no component in it anywhere.

## What the gate does not measure

The promise names `button.types.ts` among a component's files, and the repository does not keep
that half of it: of the 30 entrypoints that declare a component, **18 have no `*.types.ts` at
all**, and 13 export a public type from the component's own source instead. A point demanding
one would have been red on the day it was written — that is a plan, not a gate — and eighteen
entries in the register would have been the same thing with more words. So point 8 measures
what a types file must do **once it exists**, and the disagreement is written down here and in
the requirement rather than papered over.

## How a case is built

A case is not one more copy of a correct library with one thing broken. The gate builds it from
three layers:

1. [`_reference/`](_reference/) — the reference tree: a library in miniature, holding exactly
   what the gate reads. Four secondary entrypoints and the package's own,
2. the files from the case's directory, overwriting the reference (`fixture.json` is not
   copied),
3. the removals from the `drop` list in `fixture.json`.

That way the case directory holds **nothing but the defect** — it is visible without comparing
files — and does not drift from the reference when the shape of an entrypoint changes.

Sources sit in the repository as `*.ts.txt` and become `*.ts` only inside the temporary
directory the case is assembled in. The reason is hard: a `.ts` file under `tools/` belongs to
no compiler program, so it would fire `check-typecheck` (point 1 — a file with no project). One
gate's fixture must not be another's defect. The same move as in `check-styles` and
`check-parts`.

The tree mirrors the repository's own layout, `libs/components/…` and all, rather than starting
at the entrypoints. That is not decoration: this gate's points are **about paths**, and a
message naming `libs/components/button/src/button.html` has to read the same whether it came
from a fixture or from the library.

**The reference tree must pass.** Were it defective itself, every case would fire because of it
rather than because of its own defect, and every "rejected" would be false — that is, this whole
negative control would become exactly what it stands against. It carries the four shapes that
are easy to leave unexercised: an entrypoint with two components in one source file and a
template named after neither, a plain entrypoint with no component in it, the package's own
entrypoint (which point 3 asks nothing of, being named after the package and not after a
component), and a component whose host **is** a native input — the one that stands in the
register.

## The cases

| case                                                                                  | point | check                  | rule                        | defect                                                                    |
| ------------------------------------------------------------------------------------- | ----: | ---------------------- | --------------------------- | ------------------------------------------------------------------------- |
| [`no-entrypoint-in-the-project`](no-entrypoint-in-the-project/)                       |     1 | `denominator`          | `no-entrypoint`             | the walk finds no `ng-package.json`, so the layout points rule on nothing |
| [`no-source-under-an-entrypoint`](no-source-under-an-entrypoint/)                     |     1 | `denominator`          | `no-source`                 | the manifests are counted and every `src/` is gone                        |
| [`not-one-component-declared`](not-one-component-declared/)                           |     1 | `denominator`          | `no-declaration`            | sources by the dozen and no `@Component` among them                       |
| [`decorator-off-the-anchor`](decorator-off-the-anchor/)                               |     1 | `denominator`          | `decorator-unparsed`        | a decorator the parser misses and the counter sees                        |
| [`register-the-gate-cannot-read`](register-the-gate-cannot-read/)                     |     1 | `denominator`          | `register-unreadable`       | `inline` is an object where the gate reads a list                         |
| [`sources-without-an-entrypoint-manifest`](sources-without-an-entrypoint-manifest/)   |     2 | `entrypoint`           | `no-manifest`               | code that compiles, tests, lints and reaches no consumer                  |
| [`entrypoint-without-an-index`](entrypoint-without-an-index/)                         |     2 | `entrypoint`           | `no-index`                  | a manifest pointing at an entry file that is not there                    |
| [`component-entrypoint-not-named-after-it`](component-entrypoint-not-named-after-it/) |     3 | `component-entrypoint` | `no-eponymous-source`       | `button/` declares a component and holds no `button.ts`                   |
| [`component-entrypoint-without-its-spec`](component-entrypoint-without-its-spec/)     |     3 | `component-entrypoint` | `no-eponymous-spec`         | the same entrypoint with no `button.spec.ts`                              |
| [`template-in-the-decorator`](template-in-the-decorator/)                             |     4 | `template`             | `inline-template`           | the named control of the requirement: `template:` in a decorator          |
| [`component-naming-no-template`](component-naming-no-template/)                       |     4 | `template`             | `no-template`               | neither a file nor a string — the point's own denominator                 |
| [`styles-in-the-decorator`](styles-in-the-decorator/)                                 |     5 | `styles`               | `inline-styles`             | styles that no stylesheet rule can see                                    |
| [`component-naming-no-stylesheet`](component-naming-no-stylesheet/)                   |     5 | `styles`               | `no-styles`                 | neither `styleUrl` nor `styles`                                           |
| [`template-from-another-directory`](template-from-another-directory/)                 |     6 | `sibling`              | `not-a-sibling`             | a template in a file, and the file in somebody else's directory           |
| [`template-that-is-not-in-the-tree`](template-that-is-not-in-the-tree/)               |     6 | `sibling`              | `missing-file`              | a sibling the git index does not carry                                    |
| [`stylesheet-that-is-plain-css`](stylesheet-that-is-plain-css/)                       |     6 | `sibling`              | `wrong-extension`           | a `.css` beside the component, outside every SCSS rule                    |
| [`a-template-no-declaration-names`](a-template-no-declaration-names/)                 |     7 | `orphan`               | —                           | the file a rename left behind                                             |
| [`types-file-the-index-does-not-export`](types-file-the-index-does-not-export/)       |     8 | `types`                | —                           | types written, compiled, used — and invisible to the consumer             |
| [`register-entry-for-a-class-that-is-gone`](register-entry-for-a-class-that-is-gone/) |     9 | `register`             | `entry-without-declaration` | an excuse naming a class no source declares                               |
| [`register-entry-without-a-reason`](register-entry-without-a-reason/)                 |     9 | `register`             | `entry-without-reason`      | an entry that says what the decorator already says                        |
| [`register-entry-nothing-uses`](register-entry-nothing-uses/)                         |     9 | `register`             | `entry-unused`              | the component was fixed and the excuse stayed                             |

Point 1 has five cases and that is not thoroughness for its own sake: each names a different way
for this gate to examine **nothing** and report it in green. Two of them are the shape the
sibling gates were actually caught by — a git pathspec is not a shell glob, so a pattern with a
star returns an empty list rather than an error ([`lesson-48`](../../docs/lessons.md#lesson-48)).

Points 4, 5 and 6 each carry a case for a declaration that names **nothing**, beside the case
for the defect itself. The argument is the same in all three: "the template is not inline" is
also the answer for a component whose `templateUrl` this gate failed to read, and a point that
cannot tell those apart is a point whose denominator nobody is watching.

Points 4 to 6 run from the declaration towards the file; point 7 runs back the other way. Both
directions are needed, and a rename is what shows why: it moves the decorator to a new name and
leaves the old template behind, where nothing compiles it, nothing ships it and nothing reports
it.

The three cases of point 9 are the whole life cycle of an excuse: one that never named anything
real, one that names something real and says nothing about it, and one that has outlived what it
was written for. The third is the one that matters most, and it is the reason the register is
read at points 4 and 5 but audited at point 9 — an entry excuses on its **presence**, so a
register gone stale reads as a defect of the register rather than as a component quietly losing
its file. The split is `check-mutation`'s, one floor down.

## Adding a new point to the gate

A new point in `check-files.mjs` comes **together with the case** that fires it, and with a rule
name that tells you it was that rule which fired. A point with no case is exactly what
[`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able to fire on it, only
one floor up.
