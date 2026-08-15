# Negative control of the package gate

Deliberately defective packages. `libs/components/check-package.mjs` runs all six of its
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

A case is not a sixth copy of the correct package with one thing broken. The gate builds
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

| directory                                                 | what it breaks                                           | point |
| --------------------------------------------------------- | -------------------------------------------------------- | ----- |
| [`theme-missing`](theme-missing/)                         | a package with no `themes/pct.css`                       | 1     |
| [`theme-outside-exports`](theme-outside-exports/)         | the theme is in the package but outside `exports`        | 2     |
| [`token-without-declaration`](token-without-declaration/) | a used `var(--pct-*)` with no declaration in the package | 3     |
| [`wrong-version`](wrong-version/)                         | `PCT_VERSION` other than `version` from the manifest     | 4     |
| [`no-version-constant`](no-version-constant/)             | `PCT_VERSION` vanished from the package entirely         | 4     |
| [`schematic-missing`](schematic-missing/)                 | the `ng add` collection points at an uncompiled factory  | 5     |
| [`repository-missing`](repository-missing/)               | a manifest with no `repository`                          | 6     |

Point 4 has two cases, because there are two different failures: a wrong value and a
missing constant. The second means the shape of the output changed and the version check
has nothing left to compare — while passing green.

Point 6 is the only one with two modes, so its case carries `"releaseOnly": true` in
`fixture.json` and is examined both ways: under `--release` it must block, in a normal run
it must **warn and pass**. An assertion on "it blocks" alone would let through a
regression after which point 6 always blocks — and then a repository with no remote would
not build at all.

## Why this directory sits in `tools/` and not beside the script

The script is in `libs/components/`, because the `check-package` target belongs to that
project. The fixtures do not stand there, because a project's directory is an input to its
own tasks: seven fake packages would enter the `inputs` of the library's build and lint,
and `manifest.json` would fall under the `@nx/dependency-checks` rule, which covers
`**/*.json` in that project. Standing next to
[`check-docs.fixtures/`](check-docs.fixtures/) is incidental: both directories are the
same kind of thing.

## Adding a new check to the gate

A new check in `check-package.mjs` comes **together with the case** that fires it, and
with an identifier that tells you it was this check that fired. A check with no case is
exactly what [`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able
to fire on it, only one floor up.
