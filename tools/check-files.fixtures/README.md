# Negative control of the file-structure gate

Deliberately defective trees. `tools/check-files.mjs` runs all ten of its points on each of
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

The layout points (2, 3, 8 and 10) run over **entrypoints**, because `ng-package.json` and
`index.ts` are an entrypoint's files and there is exactly one of each per directory — all but
point 8's second rule, which reads every `*.types.ts` of the library, an entrypoint's or not. The
template and stylesheet points (4 to 7) run over **`@Component` declarations**, because an
entrypoint is not a component: `breadcrumb/` declares three of them in a single source file,
and `core/`, `testing/`, `theme/` and `regions/` declare none at all. A rule written per
entrypoint would have to demand a `.html` of `core/` and would be excused on the day it was
written; a rule written per declaration asks every component the same question. The reference
tree carries both shapes for that reason — one entrypoint with two components in one file, and
one with no component in it anywhere.

## Why the index, and not the filename

[`req-project-files`](../../docs/requirements/project.md#req-project-files) gives the argument
and its numbers: the library never kept the filename half of the promise it used to make, so the
promise was narrowed to the axis that pays — whether a consumer can **name** a type, which is
point 10.

Point 8 stays beside it rather than folding into it, because it rules over the files where point
10 rules over the types in them. Its first rule holds the files whose whole reason for existing is
to be exported; its second, what the name does promise about what stands inside — the requirement
says why that half is no convention.

A type that is deliberately internal — one no public signature carries — goes into the
`internal` list of [`files.policy.json`](_reference/libs/components/files.policy.json) with a
reason, and point 9 holds that reason to the same forty characters as every other excuse here.
The list is meant to stay short: a type a public input, output or method carries does not belong
in it, because that is the defect point 10 exists for and the fix is the missing line of the
index.

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

Beside the point, the check and the rule, a case may list `names`: strings its message has to
contain, none of them empty, each found with no digit on either side — `button.types.ts:7` is
not named by `button.types.ts:70`, nor `2 statement(s)` by `12 statement(s)`. The rule is the one
that fires, so without them a finding naming the wrong line, or one statement of two, stays
green; the cases of point 8's second rule name the file and the line of every statement they
break, two name the excerpt too — one of them a statement of several lines, read by its first —
and the two with two statements name the count.

A case that lists `names` lists what its message carries, so none of them proves the comparison is
made, or that the runner refuses `names` it cannot compare. [`_runner.json`](_runner.json) holds
both: through [`runner-control.mjs`](../runner-control.mjs) the runner plays
`types-file-importing-for-its-effect` once more with its `names` replaced — its line and the one
`types-file-importing-with-type-on-each-name` names under the same rule, once after its own and once
before; a name that is no list; an empty list; a blank name and a name that is no string, each
beside a good one; and the file before its line number and the words after the count, which the
message holds only with a digit beside them — and has to report each, and nothing of the case with
its own `names`. The control is played apart from the cases and counts as none. The same control
holds the runner's other rules, which no case proves either, since every case is built to be refused
on its own — a case that passed, a case that fired another check and a case that fired another rule:
it plays the case over `_reference`, which the gate passes; with `check` set to `index`; with `rule`
set to `not-exported`; and, for the comparison runs both ways, with `rule` set to `null` where one
fires, and over `a-template-no-declaration-names` as `orphan`, without its `names`, where none
fires — and has to report each.

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
negative control would become exactly what it stands against. It carries the six shapes that
are easy to leave unexercised: an entrypoint with two components in one source file and a
template named after neither, a plain entrypoint with no component in it, the package's own
entrypoint (which point 3 asks nothing of, being named after the package and not after a
component), two types files — one holding a form of each kind point 8 lets through, and a clean
one sorting after it, so that a case breaking the first does not break the last file the rule
reads as well — a component whose host **is** a native input, and a source holding a type the
index deliberately passes over. The last two are the ones that stand in the register — an excuse
is a branch like any other, and one nothing exercises is one that can rot without a sound. The
first types file is the same argument for a rule that lets things through: `export type { … }`
and `declare` stand in no types file of the library, so a rule that stopped admitting them would
redden nothing in the library — only this file and the rows of `FORMS` that admit them.

## The cases

| case                                                                                                  | point | check                  | rule                            | defect                                                                    |
| ----------------------------------------------------------------------------------------------------- | ----: | ---------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| [`no-entrypoint-in-the-project`](no-entrypoint-in-the-project/)                                       |     1 | `denominator`          | `no-entrypoint`                 | the walk finds no `ng-package.json`, so the layout points rule on nothing |
| [`no-source-under-an-entrypoint`](no-source-under-an-entrypoint/)                                     |     1 | `denominator`          | `no-source`                     | the manifests are counted and every `src/` is gone                        |
| [`not-one-component-declared`](not-one-component-declared/)                                           |     1 | `denominator`          | `no-declaration`                | sources by the dozen and no `@Component` among them                       |
| [`decorator-off-the-anchor`](decorator-off-the-anchor/)                                               |     1 | `denominator`          | `decorator-unseen`              | a decorator the anchor misses and the parser counts                       |
| [`not-one-type-exported`](not-one-type-exported/)                                                     |     1 | `denominator`          | `no-exported-type`              | sources by the dozen and no `type`, `interface` or `enum` among them      |
| [`register-the-gate-cannot-read`](register-the-gate-cannot-read/)                                     |     1 | `denominator`          | `register-unreadable`           | `inline` is an object where the gate reads a list                         |
| [`decorator-behind-a-comment-on-its-line`](decorator-behind-a-comment-on-its-line/)                   |     1 | `denominator`          | `decorator-unseen`              | a decorator behind a comment on its line, which no pattern counted        |
| [`decorator-in-a-namespace`](decorator-in-a-namespace/)                                               |     1 | `denominator`          | `decorator-unseen`              | a declaration inside a namespace, which the parser counts                 |
| [`decorator-in-a-function`](decorator-in-a-function/)                                                 |     1 | `denominator`          | `decorator-unseen`              | a declaration inside a function, the other nesting                        |
| [`decorator-imported-under-another-name`](decorator-imported-under-another-name/)                     |     1 | `denominator`          | `decorator-under-another-name`  | `@Widget({…})` over `Component as Widget`                                 |
| [`angular-imported-as-a-namespace`](angular-imported-as-a-namespace/)                                 |     1 | `denominator`          | `decorator-under-another-name`  | `@ng.Component({…})` over a namespace import of `@angular/core`           |
| [`decorator-in-a-comment-above-another-decorator`](decorator-in-a-comment-above-another-decorator/)   |     1 | `denominator`          | `decorator-without-metadata`    | a decorator in a comment above a service, read by the anchor              |
| [`metadata-checked-with-satisfies`](metadata-checked-with-satisfies/)                                 |     1 | `denominator`          | `decorator-without-metadata`    | metadata ngc refuses (NG1001), read by the anchor                         |
| [`template-url-not-a-string`](template-url-not-a-string/)                                             |     1 | `denominator`          | `path-by-expression`            | `templateUrl` through a constant                                          |
| [`style-url-not-a-string`](style-url-not-a-string/)                                                   |     1 | `denominator`          | `path-by-expression`            | `styleUrl` through a constant                                             |
| [`style-urls-not-strings`](style-urls-not-strings/)                                                   |     1 | `denominator`          | `path-by-expression`            | `styleUrls` handed a constant array                                       |
| [`sources-without-an-entrypoint-manifest`](sources-without-an-entrypoint-manifest/)                   |     2 | `entrypoint`           | `no-manifest`                   | code that compiles, tests, lints and reaches no consumer                  |
| [`entrypoint-without-an-index`](entrypoint-without-an-index/)                                         |     2 | `entrypoint`           | `no-index`                      | a manifest pointing at an entry file that is not there                    |
| [`component-entrypoint-not-named-after-it`](component-entrypoint-not-named-after-it/)                 |     3 | `component-entrypoint` | `no-eponymous-source`           | `button/` declares a component and holds no `button.ts`                   |
| [`component-entrypoint-without-its-spec`](component-entrypoint-without-its-spec/)                     |     3 | `component-entrypoint` | `no-eponymous-spec`             | the same entrypoint with no `button.spec.ts`                              |
| [`template-in-the-decorator`](template-in-the-decorator/)                                             |     4 | `template`             | `inline-template`               | the named control of the requirement: `template:` in a decorator          |
| [`component-naming-no-template`](component-naming-no-template/)                                       |     4 | `template`             | `no-template`                   | neither a file nor a string — the point's own denominator                 |
| [`template-by-shorthand`](template-by-shorthand/)                                                     |     4 | `template`             | `inline-template`               | a template handed to the decorator by shorthand, `template,`              |
| [`template-under-a-quoted-key`](template-under-a-quoted-key/)                                         |     4 | `template`             | `inline-template`               | a template under a quoted key, `'template':`                              |
| [`template-under-an-escaped-name`](template-under-an-escaped-name/)                                   |     4 | `template`             | `inline-template`               | a template under an escaped name, `t\u0065mplate:`                        |
| [`styles-in-the-decorator`](styles-in-the-decorator/)                                                 |     5 | `styles`               | `inline-styles`                 | styles that no stylesheet rule can see                                    |
| [`component-naming-no-stylesheet`](component-naming-no-stylesheet/)                                   |     5 | `styles`               | `no-styles`                     | neither `styleUrl` nor `styles`                                           |
| [`styles-by-shorthand`](styles-by-shorthand/)                                                         |     5 | `styles`               | `inline-styles`                 | styles handed to the decorator by shorthand, `styles,`                    |
| [`template-from-another-directory`](template-from-another-directory/)                                 |     6 | `sibling`              | `not-a-sibling`                 | a template in a file, and the file in somebody else's directory           |
| [`template-that-is-not-in-the-tree`](template-that-is-not-in-the-tree/)                               |     6 | `sibling`              | `missing-file`                  | a sibling the git index does not carry                                    |
| [`stylesheet-that-is-plain-css`](stylesheet-that-is-plain-css/)                                       |     6 | `sibling`              | `wrong-extension`               | a `.css` beside the component, outside every SCSS rule                    |
| [`a-template-no-declaration-names`](a-template-no-declaration-names/)                                 |     7 | `orphan`               | —                               | the file a rename left behind                                             |
| [`types-file-the-index-does-not-export`](types-file-the-index-does-not-export/)                       |     8 | `types`                | `not-exported`                  | types written, compiled, used — and invisible to the consumer             |
| [`types-file-holding-a-value`](types-file-holding-a-value/)                                           |     8 | `types`                | `not-type-only`                 | a predicate beside its type, in a file the measurements skip              |
| [`types-file-holding-code-it-does-not-export`](types-file-holding-code-it-does-not-export/)           |     8 | `types`                | `not-type-only`                 | code a types file keeps to itself, so it exports no value                 |
| [`types-file-holding-an-enum`](types-file-holding-an-enum/)                                           |     8 | `types`                | `not-type-only`                 | a type to this gate's own pattern and an object to the compiler           |
| [`types-file-importing-with-type-on-each-name`](types-file-importing-with-type-on-each-name/)         |     8 | `types`                | `not-type-only`                 | `type` on each imported name and none on the clause                       |
| [`types-file-importing-for-its-effect`](types-file-importing-for-its-effect/)                         |     8 | `types`                | `not-type-only`                 | an import with no clause, there for what the module does                  |
| [`types-file-re-exporting-a-value`](types-file-re-exporting-a-value/)                                 |     8 | `types`                | `not-type-only`                 | a value handed on through a file that promises none                       |
| [`types-file-outside-an-entrypoint`](types-file-outside-an-entrypoint/)                               |     8 | `types`                | `not-type-only`                 | a value in a migration's types file, which the first rule never reads     |
| [`types-files-each-holding-a-value`](types-files-each-holding-a-value/)                               |     8 | `types`                | `not-type-only`                 | a value in each of two types files, and a message naming both             |
| [`register-entry-for-a-class-that-is-gone`](register-entry-for-a-class-that-is-gone/)                 |     9 | `register`             | `entry-without-declaration`     | an excuse naming a class no source declares                               |
| [`register-entry-without-a-reason`](register-entry-without-a-reason/)                                 |     9 | `register`             | `entry-without-reason`          | an entry that says what the decorator already says                        |
| [`register-entry-nothing-uses`](register-entry-nothing-uses/)                                         |     9 | `register`             | `entry-unused`                  | the component was fixed and the excuse stayed                             |
| [`register-internal-entry-for-a-type-that-is-gone`](register-internal-entry-for-a-type-that-is-gone/) |     9 | `register`             | `internal-entry-without-type`   | an excuse naming a type no source exports                                 |
| [`register-internal-entry-without-a-reason`](register-internal-entry-without-a-reason/)               |     9 | `register`             | `internal-entry-without-reason` | an entry that says what the missing index line already says               |
| [`register-internal-entry-nothing-uses`](register-internal-entry-nothing-uses/)                       |     9 | `register`             | `internal-entry-unused`         | the type went public and the excuse stayed                                |
| [`type-the-index-does-not-export`](type-the-index-does-not-export/)                                   |    10 | `index`                | `type-not-exported`             | a public type the consumer has no way to name                             |
| [`re-export-the-gate-cannot-follow`](re-export-the-gate-cannot-follow/)                               |    10 | `index`                | `re-export-not-followed`        | a star re-export that leaves the index's surface open                     |

Point 1's first six cases are not thoroughness for its own sake: each names a different way
for this gate to examine **nothing** and report it in green. Two of them are the shape the
sibling gates were actually caught by — a git pathspec is not a shell glob, so a pattern with a
star returns an empty list rather than an error ([`lesson-48`](../../docs/lessons.md#lesson-48)).

The other ten are the ways a declaration reaches ngc past the read: a decorator the anchor
misses (behind a comment on its line, inside a namespace or a function), one imported under
another name, a decorator the anchor reads where the parser holds no metadata, and a path given
by an expression. While the decorator was read with patterns, the two nestings were refused by
the old counter, from their indentation, and each of the others passed or was refused by the
rule for another defect; each is measured through ngc. The same spellings stand in
`check-texts`, `check-aria`, `check-styles`, `check-zoneless` and `check-parts`, which read
decorators through one module, `tools/decorators.mjs`. Points 4 and 5 hold the members a pattern
did not read — a template or styles by shorthand, under a quoted key, under an escaped name.

Points 4, 5 and 6 each carry a case for a declaration that names **nothing**, beside the case
for the defect itself. The argument is the same in all three: "the template is not inline" is
also the answer for a component whose `templateUrl` this gate failed to read, and a point that
cannot tell those apart is a point whose denominator nobody is watching.

Points 4 to 6 run from the declaration towards the file; point 7 runs back the other way. Both
directions are needed, and a rename is what shows why: it moves the decorator to a new name and
leaves the old template behind, where nothing compiles it, nothing ships it and nothing reports
it.

Point 8's second rule is held in two halves. Its eight cases hold **where** it reads: every
statement and not the exported ones alone, every types file and not the entrypoints' alone, the
first file and the last, the first statement and the last, and, through `names`, the line of each
statement, its excerpt, each of two in one file and each of two files. **How** it reads a form is
held by `FORMS`, a list in the gate — 43 statements, each alone in a types file not named after
its directory and admitted or refused by the rule itself as marked beside it, on every run —
because a case per keyword would be a directory per keyword, and a form no case carried could be
admitted in silence. Measured on copies of the gate, each changing one piece of the rule: 55
copies, all red, each named by the cases or rows it lets through — among them
`export { type X } from`, `export * from`, `export * as ns from`, `export import`, `const enum`,
`import defer`, `import {} from`, a function, a class or an enum of the file's own, a bare call,
a namespace, `export default`, `declare` taken on an import or an export, a filter in the rule's
loop rather than in its reading, the files named after their directory alone, the last file
alone, a stop after the first, a zero-based line, a line off by a factor of ten, an excerpt empty
or taken from the last line, a count off by one, by ten or with a digit in front, and one
statement of two — or, where it strikes an admitted form, by the rows it refuses, and by the
reference where it holds that form. **Not held:** a form the list does not name, which the allow-list refuses and nothing here
would notice being admitted, and the control's own rules but those `_runner.json` holds — the
`names` comparison, and a case that passed, fired another point or fired another rule: the `FORMS`
loop switched off leaves the run green, as does a search that stops at a name's first occurrence,
where a digit stands beside it, though it stands free further on.

Point 9 keeps two lists — the components excused their inline member, and the types excused
their absence from an index — and the three cases of each are the whole life cycle of an excuse:
one that never named anything real, one that names something real and says nothing about it, and
one that has outlived what it was written for. The third is the one that matters most, and it is
the reason the register is read at points 4, 5 and 10 but audited at point 9 — an entry excuses
on its **presence**, so a register gone stale reads as a defect of the register rather than as a
component quietly losing its file or a type quietly leaving the public surface. The split is
`check-mutation`'s, one floor down.

Point 10's second case is not about a defect in a library at all: it is about this gate losing
the ability to rule on one. The surface of an index is built by following its re-exports, and a
star hands on every name of the module it points at — so an edge the walk cannot read (a package
specifier, `export * as ns from`, a path to no source of the tree) leaves the surface open, and
over an open list "this type is not exported" has no evidence behind it. Reporting the edge is
the only honest answer; passing the entrypoint would be the silence this whole directory exists
against.

## Adding a new point to the gate

A new point in `check-files.mjs` comes **together with the case** that fires it, and with a rule
name that tells you it was that rule which fired. A point with no case is exactly what
[`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able to fire on it, only
one floor up.
