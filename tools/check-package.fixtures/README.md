# Negative control of the package gate

Deliberately defective packages. `libs/components/check-package.mjs` runs all nine of its
checks on each of them and **requires every one to be rejected — and rejected by the point
it declares**. A package that passes is a fault; a package that fires for a reason other
than the one written in its `fixture.json` is a fault just the same, because it proves
something other than what it declares.

The reason it exists is the same as for every other gate in this repository
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
The run the package gate came from is described by
[`lesson-36`](../../docs/lessons.md#lesson-36): removing `libs/tokens/dist` → the build
**passes**, and the package carries not one token definition. That run was **manual**,
that is, it does not exist between sessions — this is its machine form.

## How a case is built

A case is not one more copy of the correct package with one thing broken. The gate builds
it from three layers:

1. `_reference/` — the reference package in miniature, holding exactly what the gate
   reads,
2. the files from the case's directory, overwriting the reference (`fixture.json` is not
   copied),
3. the removals from the `drop` list in `fixture.json`.

That way the case directory holds **nothing but the defect** — it is visible without
comparing files — and does not drift from the reference when the shape of the package
changes.

The manifest is called `manifest.json` in the repository and becomes `package.json` only
in the assembled package. This is not cosmetics: **a real `package.json` in the
repository tree is a project to Nx** — the graph was getting a phantom `@pacit/components`
project rooted in the fixtures, and in three copies under the same name. The natural
workaround (`.nxignore`) fixes that and breaks something worse: the directory disappears
from the file map, so the `check-package` target's `inputs` stop seeing it, and weakening
a fixture **does not invalidate the cache**. The gate would then shine green from the
cache having checked nothing — that is, the negative control itself would become a silent
defect ([`req-axis`](../../docs/00-axis.md)).

**The reference package must pass**, and pass in `--release` mode. This is not a check for
good measure: were the reference itself defective, every case would fire because of it
rather than because of its own defect, and every "rejected" would be false — that is,
this whole negative control would become exactly what it stands against.

## The cases

| directory                                                       | what it breaks                                               | point | rule           |
| --------------------------------------------------------------- | ------------------------------------------------------------ | ----- | -------------- |
| [`theme-missing`](theme-missing/)                               | a package with no `themes/pct.css`                           | 1     | —              |
| [`theme-outside-exports`](theme-outside-exports/)               | the theme is in the package but outside `exports`            | 2     | —              |
| [`token-without-declaration`](token-without-declaration/)       | a used `var(--pct-*)` with no declaration in the package     | 3     | —              |
| [`wrong-version`](wrong-version/)                               | `PCT_VERSION` other than `version` from the manifest         | 4     | —              |
| [`no-version-constant`](no-version-constant/)                   | `PCT_VERSION` vanished from the package entirely             | 4     | —              |
| [`schematic-missing`](schematic-missing/)                       | the `ng add` collection points at an uncompiled factory      | 5     | —              |
| [`repository-missing`](repository-missing/)                     | a manifest with no `repository`                              | 6     | —              |
| [`licence-missing`](licence-missing/)                           | `"license": "MIT"` in the manifest and no LICENSE file       | 6     | —              |
| [`licence-mismatch`](licence-mismatch/)                         | the LICENSE file names a different licence than the manifest | 6     | —              |
| [`policy-without-reason`](policy-without-reason/)               | a policy entry with a name and no reason                     | 7     | policy         |
| [`dependency-field-unread`](dependency-field-unread/)           | the dependency arrives through `optionalDependencies`        | 7     | unread-field   |
| [`import-not-declared`](import-not-declared/)                   | the code imports a package the manifest never declares       | 7     | undeclared     |
| [`dependency-outside-list`](dependency-outside-list/)           | a declared dependency with no entry in the policy            | 7     | not-allowed    |
| [`dependency-as-runtime`](dependency-as-runtime/)               | an allowed peer declared under `dependencies`                | 7     | wrong-kind     |
| [`dependency-nothing-imports`](dependency-nothing-imports/)     | a declared dependency nothing in the package imports         | 7     | unused         |
| [`allowance-without-dependency`](allowance-without-dependency/) | a policy entry outliving the dependency it allowed           | 7     | dead           |
| [`peer-range-behind-compiler`](peer-range-behind-compiler/)     | a peer range that does not admit the compiler that built it  | 7     | compiler-drift |
| [`compiler-stamp-missing`](compiler-stamp-missing/)             | the compiler's version is nowhere in the package             | 7     | compiler-stamp |
| [`dependency-forbidden`](dependency-forbidden/)                 | `@angular/animations` declared as a peer AND permitted       | 7     | forbidden      |
| [`import-forbidden`](import-forbidden/)                         | an import of `@angular/platform-browser/animations`          | 7     | forbidden      |
| [`animation-binding`](animation-binding/)                       | `[@panel]` and `(@panel.done)` in a component's template     | 8     | binding        |
| [`animation-host-binding`](animation-host-binding/)             | the same pair in the declaration's `host`                    | 8     | binding        |
| [`no-component-declaration`](no-component-declaration/)         | a package point 8 finds no template in                       | 8     | declarations   |
| [`citation-relative`](citation-relative/)                       | a citation in the types by repository path                   | 9     | relative       |
| [`citation-bare`](citation-bare/)                               | a bare `req-*` identifier in the shipped JSDoc               | 9     | bare           |
| [`citation-none`](citation-none/)                               | a package whose types cite nothing, so point 9 reads nothing | 9     | none           |

Point 4 has two cases, because there are two different failures: a wrong value and a
missing constant. The second means the shape of the output changed and the version check
has nothing left to compare — while passing green. Point 7 carries the same pair for the
same reason (`peer-range-behind-compiler` and `compiler-stamp-missing`).

Point 6 is the only one with two modes, so its case carries `"releaseOnly": true` in
`fixture.json` and is examined both ways: under `--release` it must block, in a normal run
it must **warn and pass**. An assertion on "it blocks" alone would let through a
regression after which point 6 always blocks — and then a repository with no remote would
not build at all.

Point 7 is the first with more than one rule under one check, so its cases name the
**rule** as well, and the gate compares that too. The argument is the one the whole
directory rests on, one floor down: a case built for a dead allowance and rejected because
of an undeclared import satisfies a comparison on the check alone — while proving nothing
about the rule it was written for. Measured, not assumed: with the `rule` of
`dependency-outside-list` changed to `dead`, the run reports `rule not-allowed of check
dependencies fired, and dead was meant to`.

Two of the point-7 cases are the ones a person reaches for first, and they are opposites:
a name declared and never imported, and a name imported and never declared. The second is
what a dependency added by reflex actually looks like — `npm i` writes it into the **root**
manifest and the import into a source file, so the library's own manifest, the only thing
a check of the declared list would read, never learns of it.

A case whose defect is in the manifest carries a whole `manifest.json`, not a patch of one:
that is what lets `repository-missing` remove a field at all. The cost is real — the day
the reference manifest grows a field the gate reads, every one of those copies needs it too
— and the run says so plainly, because the reference package is checked first and the cases
fire on their own points afterwards.

## Why this directory sits in `tools/` and not beside the script

The script is in `libs/components/`, because the `check-package` target belongs to that
project. The fixtures do not stand there, because a project's directory is an input to its
own tasks: twenty-three fake packages would enter the `inputs` of the library's build and lint,
and `manifest.json` would fall under the `@nx/dependency-checks` rule, which covers
`**/*.json` in that project. Standing next to
[`check-docs.fixtures/`](check-docs.fixtures/) is incidental: both directories are the
same kind of thing.

## Adding a new check to the gate

A new check in `check-package.mjs` comes **together with the case** that fires it, and
with an identifier that tells you it was this check that fired. A check with no case is
exactly what [`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able
to fire on it, only one floor up.
