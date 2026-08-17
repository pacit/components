# Negative control of the consumer gate

Deliberately defective **measurements**. `tools/check-consumer.mjs` runs all seven of its
points on each of them and **requires every one to be rejected — and rejected by the rule
it declares**. A measurement that passes is a fault; a measurement that fires somewhere
other than where its file says is a fault just the same, because it proves something
other than what it declares.

A case file **always** carries the pair `check` + `rule`, not the point alone — straight
from [`lesson-50`](../../docs/lessons.md#lesson-50). Measured on this gate:
disarming four of the twenty-eight rules moves their cases onto a **neighbouring rule in
the same point**, and without that field those four runs would be green.

The reason it exists is the same as for every other gate
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

## How a case is built

A case is a JSON file with a pair of descriptive fields and **one mutation** applied to a
copy of `_reference.json`. That way the case file holds nothing but its own defect, rather
than one more copy of a correct measurement in which it has to be looked for.

`_reference.json` is an **imprint of a real measurement**, not a sentence written by hand
beside one: it comes from `node tools/check-consumer.mjs --write-reference`. Written by
hand it would drift from the shape of the measurement at the first change, and the
reference input would stop passing for a reason nobody examined. The registry address and
the repository path are replaced in it by constants — the checks compare them **inside**
the measurement (the archive's address starts with the registry's, the module resolution
lies inside the application's directory), so the substitution weakens nothing and takes a
port number and somebody's home path out of a versioned file.

The reference input is checked separately and first: were it defective itself, every case
would fire because of it rather than because of its own — that is, this whole control
would become what it stands against. Measured: `tokensInCss: 0` in the reference moves
nine cases from points 6 and 7 onto somebody else's rule.

## What these cases do NOT exercise

The measurement arrives as **data**, not from a real run. Starting the registry, the
install, the SSR build and the browser for each of the twenty-eight cases would cost
quarters of an hour, and the gate runs on every commit — the same choice as in
`check-bundle` and `check-parts`. The price is outright: **the measuring code is not
exercised here once.** It is exercised instead by every run against the real repository,
and that it can fire was measured by seven ways of breaking the repository — one per
rule, described in
[`req-quality-consumer`](../../docs/requirements/quality.md#req-quality-consumer).

## The cases

| case                            | point | check      | rule                        | defect                                                 |
| ------------------------------- | ----: | ---------- | --------------------------- | ------------------------------------------------------ |
| `empty-tarball`                 |     1 | `tarball`  | `empty`                     | `npm pack` with not one file                           |
| `tarball-without-theme`         |     1 | `tarball`  | `theme-missing`             | the theme is in `dist`, not in the archive             |
| `tarball-without-entrypoint`    |     1 | `tarball`  | `entrypoint-missing`        | `exports` promises a file that was not packed          |
| `tarball-without-factory`       |     1 | `tarball`  | `schematic-missing`         | the collection is there, the factory is not            |
| `registry-publish-failed`       |     2 | `registry` | `publish`                   | `npm publish` ended in an error                        |
| `registry-version-differs`      |     2 | `registry` | `version`                   | the registry does not know the packed version          |
| `registry-integrity-differs`    |     2 | `registry` | `integrity`                 | the registry serves a different archive                |
| `registry-not-local`            |     2 | `registry` | `not-local`                 | the archive's address leads to npmjs                   |
| `install-without-entry`         |     3 | `install`  | `entry-missing`             | no entry in the application's lock file                |
| `install-outside-the-registry`  |     3 | `install`  | `outside-the-registry`      | the package came from the uplink                       |
| `install-integrity-differs`     |     3 | `install`  | `integrity-differs`         | installed ≠ packed                                     |
| `install-outside-the-app`       |     3 | `install`  | `outside-the-app`           | the module resolves to the repository's `node_modules` |
| `ng-add-failed`                 |     4 | `ng-add`   | `schematic-failed`          | the schematic cannot be run                            |
| `ng-add-without-change`         |     4 | `ng-add`   | `no-change`                 | it passed and changed nothing                          |
| `ng-add-without-theme`          |     4 | `ng-add`   | `theme-missing-from-styles` | it added something other than the package's theme      |
| `build-failed`                  |     5 | `build`    | `build-failed`              | the consumer application's build errored               |
| `build-without-server`          |     5 | `build`    | `server-missing`            | the build passed, there is no server bundle            |
| `build-without-library`         |     5 | `build`    | `library-absent`            | no trace of the library in the bundle                  |
| `build-without-theme`           |     5 | `build`    | `theme-absent`              | the application's sheet has no `--pct-*` declaration   |
| `ssr-status`                    |     6 | `ssr`      | `status`                    | the server answers with an error                       |
| `ssr-without-render`            |     6 | `ssr`      | `no-render`                 | the response is from a prerender, not the server       |
| `ssr-without-component`         |     6 | `ssr`      | `no-component`              | no component class in the HTML from the server         |
| `ssr-without-parts`             |     6 | `ssr`      | `no-parts`                  | no `data-pct-part` in the HTML from the server         |
| `e2e-without-element`           |     7 | `e2e`      | `element-missing`           | the browser did not find the button                    |
| `e2e-without-theme`             |     7 | `e2e`      | `no-theme`                  | the background token on the button is empty            |
| `e2e-background-initial`        |     7 | `e2e`      | `background-initial`        | the background fell back to its initial value          |
| `e2e-background-not-from-token` |     7 | `e2e`      | `background-not-from-token` | the button is painted with something else              |
| `e2e-console-error`             |     7 | `e2e`      | `console-error`             | an error in the browser console (a hydration drift)    |

`e2e-without-theme` and `e2e-background-initial` describe the same failure from two sides
and are kept apart on purpose: the first measures whether the theme **arrived**, the
second whether the button **painted itself** with it. They part company exactly when the
theme is loaded and a token was renamed on one side; the third one
(`e2e-background-not-from-token`) fires then.
