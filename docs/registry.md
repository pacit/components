# Registry — promise → gate → control

> **This file is generated.** Do not edit it by hand —
> `node tools/check-docs.mjs --write`. The `check-docs` gate rejects drift.

The state is **derived** from the contents of the `Gate` and `Control` fields, not typed in.
There is no "built, just unverified" state — see
[README](README.md#fields-gate-and-control).

| state       | means                                                         |  count |
| ----------- | ------------------------------------------------------------- | -----: |
| ✅ enforced | gate and control exist and run in CI                          |     73 |
| 🟡 partial  | the gate is there, the negative control is not (deliberately) |     16 |
| ⛔ gap      | gate or control missing, with a recorded deadline             |      4 |
| **total**   |                                                               | **93** |

## Gaps by urgency

The order comes from the **Binds at** field, not from a requirement number.

| requirement                                                          | what is missing                                                                    | binds at                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`req-api-number`](requirements/api.md#req-api-number)               | property tests for the parser (`parse(format(n)) === n` for any `n` a… _(control)_ | the first locale outside `pl`/`en` reported by a consumer    |
| [`req-project-concise`](requirements/project.md#req-project-concise) | a prose volume budget per file, a **two-sided** snapshot in the idiom…             | the close of the compression pass — **not earlier**. A snap… |
| [`req-project-files`](requirements/project.md#req-project-files)     | a check of the entrypoint directory layout (a script in the spirit of…             | the first component added by somebody other than the author… |
| [`req-token-density`](requirements/tokens.md#req-token-density)      | the DTCG sources contain **not one** density token                                 | once the size axis has settled. Note: density will drop bel… |

## axis

| requirement                       | state       | gate                                                                   | control                                                                |
| --------------------------------- | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-axis`](00-axis.md#req-axis) | ✅ enforced | `req-quality-registry` — the promise → gate → control registry, read … | `req-quality-negative-control` — the rule that a gate without proof o… |

## accessibility

| requirement                                                             | state       | gate                                                                   | control                                                                |
| ----------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-a11y-wcag`](requirements/a11y.md#req-a11y-wcag)                   | ✅ enforced | `req-a11y-axe` (the rendered DOM) + `req-token-contrast` (the values … | see both gates above > **Formal conformance does not mean good qualit… |
| [`req-a11y-built-in`](requirements/a11y.md#req-a11y-built-in)           | ✅ enforced | `libs/components/*/src/*.spec.ts` — ARIA relations checked per compon… | `a11y.spec.ts › "the a11y gate really does detect violations (a contr… |
| [`req-a11y-touch`](requirements/a11y.md#req-a11y-touch)                 | ✅ enforced | `apps/sandbox-e2e/src/field-hitarea.spec.ts`, `apps/sandbox-e2e/src/c… | the gate has two documented runs in which it fired: `lesson-25` (a wr… |
| [`req-a11y-axe`](requirements/a11y.md#req-a11y-axe)                     | ✅ enforced | `apps/sandbox-e2e/src/a11y.spec.ts` — every audit reads the page at *… | `a11y.spec.ts › "the a11y gate really does detect violations (a contr… |
| [`req-a11y-motion`](requirements/a11y.md#req-a11y-motion)               | ✅ enforced | `apps/sandbox-e2e/src/preferences.spec.ts` — the axis itself, in the … | `preferences.spec.ts › "with no preference the motion axis stands at … |
| [`req-a11y-forced-colors`](requirements/a11y.md#req-a11y-forced-colors) | ✅ enforced | `apps/sandbox-e2e/src/forced-colors.spec.ts` — what the browser paint… | emulation goes through `page.emulateMedia()` in the `visit()` helper,… |
| [`req-a11y-acr`](requirements/a11y.md#req-a11y-acr)                     | ✅ enforced | `tools/check-acr.mjs` — eight points: the catalogue is the standard's… | `tools/check-acr.fixtures/` — sixteen prepared inputs, each rejected … |

## API

| requirement                                                        | state       | gate                                                                   | control                                                                |
| ------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-api-names`](requirements/api.md#req-api-names)               | 🟡 partial  | `libs/components/eslint.config.mjs` — `@angular-eslint/component-sele… | none — deliberately: an ESLint rule has no quiet-pass mode ---         |
| [`req-api-foundation`](requirements/api.md#req-api-foundation)     | ✅ enforced | `tools/check-zoneless.mjs` (target `check-zoneless`, in CI) — measuri… | `tools/check-zoneless.fixtures/` — doctored inputs, one per way of di… |
| [`req-api-signals`](requirements/api.md#req-api-signals)           | 🟡 partial  | `libs/components/button/src/button.spec.ts`, `libs/components/checkbo… | none — deliberately: a wrong transform shows up as a wrong type in th… |
| [`req-api-attributes`](requirements/api.md#req-api-attributes)     | 🟡 partial  | `apps/sandbox-e2e/src/states.spec.ts` — the cross-cutting states view… | none — deliberately: a selector matching nothing yields an empty loca… |
| [`req-api-config`](requirements/api.md#req-api-config)             | 🟡 partial  | `libs/components/button/src/button.spec.ts` — the default `size` from… | none — deliberately: the test compares two **different** values, so i… |
| [`req-api-signal-forms`](requirements/api.md#req-api-signal-forms) | ✅ enforced | the classic-forms interop suites in the per-control specs — `libs/com… | the tests start from a **non-empty** initial value — with an empty mo… |
| [`req-api-day`](requirements/api.md#req-api-day)                   | ✅ enforced | `libs/components/date/src/day.spec.ts › in a hostile timezone` — the … | the same cases build the day the old way beside the new — `new Date(2… |
| [`req-api-container`](requirements/api.md#req-api-container)       | 🟡 partial  | `libs/components/radio/src/radio.spec.ts`                              | none — deliberately: the violation would be a second `FormValueContro… |
| [`req-api-wrapper`](requirements/api.md#req-api-wrapper)           | ✅ enforced | `libs/components/field/src/field.spec.ts` — the chrome's own cases pl… | `field-hitarea.spec.ts` — a cursor map over a grid of points (`elemen… |
| [`req-api-no-wrapper`](requirements/api.md#req-api-no-wrapper)     | 🟡 partial  | `libs/components/field/src/field-controls.spec.ts` — every control is… | none — deliberately: the standalone mode is **the default**, so its f… |
| [`req-api-message`](requirements/api.md#req-api-message)           | ✅ enforced | `libs/components/field/src/field-controls.spec.ts` — the three contro… | `tools/check-aria.fixtures/hint-beside-error` — the same two messages… |
| [`req-api-frame`](requirements/api.md#req-api-frame)               | ✅ enforced | `apps/sandbox-e2e/src/field.spec.ts`, `req-a11y-touch`                 | the touch-target test caught the regression described in `lesson-25` … |
| [`req-api-native-input`](requirements/api.md#req-api-native-input) | 🟡 partial  | `libs/components/field/src/field-controls.spec.ts`                     | none — deliberately: swapping `<input>` for an element of our own kno… |
| [`req-api-platform`](requirements/api.md#req-api-platform)         | ✅ enforced | `apps/sandbox-e2e/src/radio.spec.ts` — keyboard navigation; `apps/san… | the keyboard half has none — deliberately: a navigation test has no m… |
| [`req-api-number`](requirements/api.md#req-api-number)             | ⛔ gap      | `libs/components/field/src/number.spec.ts`, `apps/sandbox-e2e/src/num… | none — gap: property tests for the parser (`parse(format(n)) === n` f… |
| [`req-api-generic`](requirements/api.md#req-api-generic)           | ✅ enforced | `libs/components/select/src/select.spec.ts` — the generic contract, p… | the probe from `lesson-37` — five deliberately contradictory bindings… |
| [`req-api-parts`](requirements/api.md#req-api-parts)               | ✅ enforced | `tools/check-parts.mjs` (target `check-parts` in the root project, in… | `tools/check-parts.fixtures/` — 22 inputs, each rejected on its own p… |
| [`req-api-parts-unique`](requirements/api.md#req-api-parts-unique) | ✅ enforced | `tools/check-parts.mjs` point 6 — a component whose parts share a pre… | `tools/check-parts.fixtures/part-outside-namespace`, and a run agains… |
| [`req-api-harness`](requirements/api.md#req-api-harness)           | ✅ enforced | `tools/check-harness.mjs` (target `check-harness` in the `components`… | `tools/check-harness.fixtures/` — 17 prepared inputs, each rejected o… |
| [`req-api-templates`](requirements/api.md#req-api-templates)       | ✅ enforced | `libs/components/core/src/core.spec.ts` — `pctReportOrphanSlot` under… | two recorded runs that fail on different cases. `pctReportOrphanSlot`… |
| [`req-api-icons`](requirements/api.md#req-api-icons)               | ✅ enforced | `tools/check-icons.mjs` (target `check-icons`) — six points over the … | `tools/check-icons.fixtures/` — six prepared inputs, each rejected on… |
| [`req-api-icons-custom`](requirements/api.md#req-api-icons-custom) | 🟡 partial  | `libs/components/check-package.mjs` — the absence of icon files in th… | none — deliberately: the violation here is **adding** something, not … |
| [`req-api-texts`](requirements/api.md#req-api-texts)               | ✅ enforced | `tools/check-texts.mjs` (target `check-texts`) — six points: a string… | `tools/check-texts.fixtures/` — 29 doctored inputs, each rejected on … |
| [`req-api-catalogue`](requirements/api.md#req-api-catalogue)       | ✅ enforced | `apps/docs/tools/build-content.mjs` (target `content` of the `docs` p… | the content pass's tripwires fired twice while 2.7.4 was writing the … |
| [`req-api-overlay`](requirements/api.md#req-api-overlay)           | ✅ enforced | `apps/sandbox-e2e/src/select.spec.ts` — measuring the panel's width a… | the measurement from `lesson-35` (a 301 px field ⇒ a 275 px panel, of… |
| [`req-api-size`](requirements/api.md#req-api-size)                 | ✅ enforced | `apps/sandbox-e2e/src/size.spec.ts` — measured in the browser          | the test checks that the heights are equal *_and what that height is_… |
| [`req-api-animations`](requirements/api.md#req-api-animations)     | ✅ enforced | `libs/components/check-package.mjs` point 7, rule `forbidden` — the b… | `tools/check-package.fixtures/` — five prepared packages, each reject… |

## project

| requirement                                                                    | state       | gate                                                                   | control                                                                |
| ------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-project-monorepo`](requirements/project.md#req-project-monorepo)         | 🟡 partial  | `.github/workflows/ci.yml` — the entire run goes through `nx affected` | none — deliberately: the failure is immediate and total (CI has nothi… |
| [`req-project-latest`](requirements/project.md#req-project-latest)             | 🟡 partial  | none — deliberately: this is a process rule, not a property of the ar… | not applicable                                                         |
| [`req-project-dependencies`](requirements/project.md#req-project-dependencies) | ✅ enforced | point 7 of `libs/components/check-package.mjs`, over the **packed** m… | `tools/check-package.fixtures/` — nine prepared packages for point 7 … |
| [`req-project-apps`](requirements/project.md#req-project-apps)                 | ✅ enforced | `apps/docs/project.json`, `apps/docs-e2e/project.json` — the two proj… | `apps/docs-e2e/src/shell.spec.ts › "renders the home page from the li… |
| [`req-project-package`](requirements/project.md#req-project-package)           | ✅ enforced | `libs/components/check-package.mjs` (target `check-package`, in CI) —… | `tools/check-package.fixtures/` — a doctored package for every point … |
| [`req-project-entrypoints`](requirements/project.md#req-project-entrypoints)   | ✅ enforced | `libs/components/check-package.mjs` — the `exports` map in the packed… | `tools/check-package.fixtures/theme-outside-exports/` — a file presen… |
| [`req-project-core`](requirements/project.md#req-project-core)                 | 🟡 partial  | `libs/components/field/src/field-controls.spec.ts` — the shared messa… | none — deliberately: the violation here is **duplication**, not a fai… |
| [`req-project-tokens-lib`](requirements/project.md#req-project-tokens-lib)     | ✅ enforced | `libs/components/project.json` → `implicitDependencies: ["tokens"]` +… | `tools/check-package.fixtures/theme-missing/` — a package without `th… |
| [`req-project-tree-shaking`](requirements/project.md#req-project-tree-shaking) | ✅ enforced | `tools/check-bundle.mjs` (target `check-bundle` in `components`, in C… | `tools/check-bundle.fixtures/` — 30 doctored inputs, each rejected on… |
| [`req-project-files`](requirements/project.md#req-project-files)               | ⛔ gap      | none — gap: a check of the entrypoint directory layout (a script in t… | none — gap: an entrypoint with an inline template has to fire the gate |
| [`req-project-prefix`](requirements/project.md#req-project-prefix)             | 🟡 partial  | `libs/components/eslint.config.mjs` — the `@angular-eslint/component-… | none — deliberately: an ESLint rule fires on the first violation and … |
| [`req-project-language`](requirements/project.md#req-project-language)         | ✅ enforced | `tools/check-language.mjs` (target `check-language` in the root proje… | `tools/check-language.fixtures/` — 32 doctored inputs, each rejected … |
| [`req-project-concise`](requirements/project.md#req-project-concise)           | ⛔ gap      | none — gap: a prose volume budget per file, a **two-sided** snapshot … | none — gap: a file with a paragraph added beyond the tolerance has to… |
| [`req-project-angular`](requirements/project.md#req-project-angular)           | ✅ enforced | `tools/check-zoneless.mjs` (target `check-zoneless`, in CI) — three p… | `tools/check-zoneless.fixtures/` — doctored inputs, one per way for z… |
| [`req-project-ssr`](requirements/project.md#req-project-ssr)                   | ✅ enforced | `apps/sandbox-e2e/src/hydration.spec.ts` — the check sits in the `vis… | `hydration.spec.ts › "the gate really does detect a hydration error (… |
| [`req-project-layout`](requirements/project.md#req-project-layout)             | 🟡 partial  | `apps/docs/project.json`, `apps/sandbox/project.json`, `apps/sandbox-… | none — deliberately: the violation is immediate and total — a project… |
| [`req-project-reach`](requirements/project.md#req-project-reach)               | ✅ enforced | `tools/check-reach.mjs` (target `check-reach` in the root project, in… | `tools/check-reach.fixtures/` — 17 prepared inputs, each rejected on … |

## quality

| requirement                                                                            | state       | gate                                                                   | control                                                                |
| -------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-quality-negative-control`](requirements/quality.md#req-quality-negative-control) | ✅ enforced | `tools/check-docs.mjs` — the **Control** field is required on every r… | `tools/check-docs.fixtures/` — a requirement with a gate but no contr… |
| [`req-quality-registry`](requirements/quality.md#req-quality-registry)                 | ✅ enforced | `tools/check-docs.mjs` (target `check-docs`, in CI) — the six checks … | `tools/check-docs.fixtures/` — a set of deliberately broken requireme… |
| [`req-quality-index`](requirements/quality.md#req-quality-index)                       | ✅ enforced | `tools/check-index.mjs` (target `check-index` in the root project, in… | `tools/check-index.fixtures/` — 23 prepared inputs, each rejected on … |
| [`req-quality-typecheck`](requirements/quality.md#req-quality-typecheck)               | ✅ enforced | `tools/check-typecheck.mjs` (target `check-typecheck`, in CI) — four … | `tools/check-typecheck.fixtures/` — eleven doctored inputs, each reje… |
| [`req-quality-unit`](requirements/quality.md#req-quality-unit)                         | ✅ enforced | in three parts, because "the tests run", "how many pass" and "how man… | `tools/check-mutation.fixtures/` — 42 doctored inputs on a fake libra… |
| [`req-quality-coverage`](requirements/quality.md#req-quality-coverage)                 | ✅ enforced | in three parts, because the percentage, its denominator and the templ… | `tools/check-coverage.fixtures/` — twelve doctored inputs, one per wa… |
| [`req-quality-e2e`](requirements/quality.md#req-quality-e2e)                           | ✅ enforced | `apps/sandbox-e2e/src/visual.spec.ts` and the remaining e2e specs      | there are **two** thresholds and both come from measurement. The pixe… |
| [`req-quality-hydration`](requirements/quality.md#req-quality-hydration)               | ✅ enforced | `apps/sandbox-e2e/src/hydration.spec.ts` + the `visit()` helper in `a… | `hydration.spec.ts › "the gate really does detect a hydration error (… |
| [`req-quality-package`](requirements/quality.md#req-quality-package)                   | ✅ enforced | `libs/components/check-package.mjs` (target `check-package`, in CI)    | `tools/check-package.fixtures/` — seven doctored packages, one per po… |
| [`req-quality-consumer`](requirements/quality.md#req-quality-consumer)                 | ✅ enforced | `tools/check-consumer.mjs` (target `check-consumer`, in CI) — seven p… | `tools/check-consumer.fixtures/` — 28 doctored inputs, each rejected … |
| [`req-quality-browsers`](requirements/quality.md#req-quality-browsers)                 | ✅ enforced | `apps/sandbox-e2e/playwright.config.mts` — three projects (chromium, … | `tools/check-browsers.fixtures/` — 25 doctored inputs, each rejected … |
| [`req-quality-benchmark`](requirements/quality.md#req-quality-benchmark)               | ✅ enforced | `tools/check-bench.mjs` (target `check-bench` of the `docs` project, … | `tools/check-bench.fixtures/` — 17 prepared inputs, each rejected on … |
| [`req-quality-views`](requirements/quality.md#req-quality-views)                       | ✅ enforced | `apps/sandbox-e2e/src/a11y.spec.ts`, `hydration.spec.ts` — both itera… | `apps/sandbox/src/app/app.spec.ts` — the view registry against the ro… |
| [`req-quality-card`](requirements/quality.md#req-quality-card)                         | ✅ enforced | `apps/sandbox/src/app/ui/demo.spec.ts`; `tools/check-docs.mjs` — ever… | `tools/check-docs.fixtures/` — a card with a non-existent identifier … |
| [`req-quality-stage`](requirements/quality.md#req-quality-stage)                       | ✅ enforced | `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/shell.spe… | `preferences.spec.ts › "with no dark preference :root stays light (th… |
| [`req-quality-prefix`](requirements/quality.md#req-quality-prefix)                     | 🟡 partial  | `apps/sandbox/eslint.config.mjs` — selector rules with the prefixes    | none — deliberately: an ESLint rule has no quiet-pass mode             |

## release

| requirement                                                            | state       | gate                                                                   | control                                                                |
| ---------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-release-semver`](requirements/release.md#req-release-semver)     | ✅ enforced | `libs/components/check-package.mjs` (point 4: `PCT_VERSION` == `versi… | `stamp-version` is **not** a dependency of `build` — if it were, the … |
| [`req-release-ng-add`](requirements/release.md#req-release-ng-add)     | ✅ enforced | `libs/components/check-package.mjs` (point 5) — the collections are i… | `tools/check-package.fixtures/schematic-missing/` — a package whose c… |
| [`req-release-metadata`](requirements/release.md#req-release-metadata) | ✅ enforced | `libs/components/check-package.mjs` (point 6) — two different severit… | `tools/check-package.fixtures/repository-missing/` — a manifest witho… |
| [`req-release-support`](requirements/release.md#req-release-support)   | ✅ enforced | `tools/check-support.mjs` (five points) over `docs/support.md`, which… | `tools/check-support.fixtures/` — fifteen prepared inputs, each rejec… |

## tokens

| requirement                                                               | state       | gate                                                                   | control                                                                |
| ------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-token-dtcg`](requirements/tokens.md#req-token-dtcg)                 | 🟡 partial  | `libs/tokens/build.mjs` — the build will not start on a malformed sou… | none — deliberately: a parse error is immediate and loud               |
| [`req-token-bridge`](requirements/tokens.md#req-token-bridge)             | ✅ enforced | `tools/check-bridge.mjs` (target `check-bridge` in the root project, … | `tools/check-bridge.fixtures/` — 16 prepared inputs, each rejected on… |
| [`req-token-artifacts`](requirements/tokens.md#req-token-artifacts)       | ✅ enforced | the `typecheck` target of the `sandbox-e2e` project — the `tokenOf` /… | swapping one name for a wrong one produces 6 type errors — a run docu… |
| [`req-token-tiers`](requirements/tokens.md#req-token-tiers)               | ✅ enforced | `tools/check-tokens.mjs` (target `check-tokens` in the root project, … | `tools/check-tokens.fixtures/` — one input per rule: `colour-under-se… |
| [`req-token-references`](requirements/tokens.md#req-token-references)     | ✅ enforced | `apps/sandbox-e2e/src/theme.spec.ts` — overriding a semantic token ch… | the test compares the component token in `:root` **and** in a scope —… |
| [`req-token-closure`](requirements/tokens.md#req-token-closure)           | ✅ enforced | `apps/sandbox-e2e/src/theme.spec.ts` — a **component** token compared… | the run from `lesson-17`: before the fix `--pct-surface` was correctl… |
| [`req-token-names`](requirements/tokens.md#req-token-names)               | ✅ enforced | `tools/check-tokens.mjs` (target `check-tokens` in the root project, … | `tools/check-tokens.fixtures/` — 34 inputs, each rejected on its own … |
| [`req-token-text-pairs`](requirements/tokens.md#req-token-text-pairs)     | ✅ enforced | `tools/check-tokens.mjs` (target `check-tokens` in the root project, … | `tools/check-tokens.fixtures/` — `unmeasured-colour` (a stylesheet pa… |
| [`req-token-contrast`](requirements/tokens.md#req-token-contrast)         | ✅ enforced | `libs/tokens/build.mjs` (target `tokens:build`, in CI through `^build… | the run from `lesson-6`: the original guard let `disabled` through at… |
| [`req-token-no-opacity`](requirements/tokens.md#req-token-no-opacity)     | ✅ enforced | `tools/check-styles.mjs` (target `check-styles`, in CI) — point 6: `o… | `tools/check-styles.fixtures/partial-opacity/` (a state expressed thr… |
| [`req-token-css`](requirements/tokens.md#req-token-css)                   | ✅ enforced | `apps/sandbox-e2e/src/theme.spec.ts`, `libs/components/check-package.… | `tools/check-package.fixtures/token-without-declaration/` — a package… |
| [`req-token-scss`](requirements/tokens.md#req-token-scss)                 | 🟡 partial  | none — deliberately: the file extension is visible in review, and a s… | not applicable ---                                                     |
| [`req-token-override`](requirements/tokens.md#req-token-override)         | ✅ enforced | `apps/sandbox-e2e/src/theme.spec.ts`                                   | as in `req-token-closure` — comparing the component token, not the se… |
| [`req-token-layers`](requirements/tokens.md#req-token-layers)             | ✅ enforced | `tools/check-tokens.mjs` (target `check-tokens` in the root project, … | `tools/check-tokens.fixtures/` — `layer-in-the-order-undefined` (an o… |
| [`req-token-scoped`](requirements/tokens.md#req-token-scoped)             | ✅ enforced | `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/a11y.spec… | see `req-token-closure`                                                |
| [`req-token-directive`](requirements/tokens.md#req-token-directive)       | ✅ enforced | `libs/components/theme/src/theme.spec.ts` — the attribute written, fo… | `theme.spec.ts › "the directive and the raw attribute are the same th… |
| [`req-token-system`](requirements/tokens.md#req-token-system)             | ✅ enforced | `apps/sandbox-e2e/src/preferences.spec.ts`                             | `preferences.spec.ts › "with no dark preference :root stays light (th… |
| [`req-token-skin`](requirements/tokens.md#req-token-skin)                 | ✅ enforced | `libs/tokens/build.mjs` — but **only for the built-in skin**           | see `req-token-contrast`                                               |
| [`req-token-distribution`](requirements/tokens.md#req-token-distribution) | ✅ enforced | `libs/components/check-package.mjs` — points 1 and 2: the skin is in … | `tools/check-package.fixtures/theme-missing/` — a package with no ski… |
| [`req-token-density`](requirements/tokens.md#req-token-density)           | ⛔ gap      | none — gap: the DTCG sources contain **not one** density token         | none — gap: a layout with the `compact` density token must pass the t… |
| [`req-token-logical`](requirements/tokens.md#req-token-logical)           | ✅ enforced | `tools/check-styles.mjs` (target `check-styles`, in CI) — point 5: a … | `tools/check-styles.fixtures/physical-padding/` (a property name) and… |

## Reverse index — lesson → requirements

Which lesson feeds which requirement. Generated from the **Lessons** fields.

| lesson                                | requirements                                                                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`lesson-1`](lessons.md#lesson-1)     | `req-project-layout`                                                                                                                                              |
| [`lesson-2`](lessons.md#lesson-2)     | `req-project-layout`                                                                                                                                              |
| [`lesson-3`](lessons.md#lesson-3)     | `req-quality-unit`                                                                                                                                                |
| [`lesson-4`](lessons.md#lesson-4)     | `req-token-dtcg`                                                                                                                                                  |
| [`lesson-5`](lessons.md#lesson-5)     | `req-quality-coverage`                                                                                                                                            |
| [`lesson-6`](lessons.md#lesson-6)     | `req-token-contrast`, `req-token-no-opacity`                                                                                                                      |
| [`lesson-7`](lessons.md#lesson-7)     | `req-api-foundation`, `req-project-angular`                                                                                                                       |
| [`lesson-8`](lessons.md#lesson-8)     | `req-project-angular`                                                                                                                                             |
| [`lesson-9`](lessons.md#lesson-9)     | `req-api-signal-forms`                                                                                                                                            |
| [`lesson-10`](lessons.md#lesson-10)   | `req-token-contrast`                                                                                                                                              |
| [`lesson-11`](lessons.md#lesson-11)   | `req-api-foundation`, `req-project-angular`                                                                                                                       |
| [`lesson-12`](lessons.md#lesson-12)   | `req-api-signals`                                                                                                                                                 |
| [`lesson-13`](lessons.md#lesson-13)   | `req-quality-e2e`, `req-quality-card`                                                                                                                             |
| [`lesson-14`](lessons.md#lesson-14)   | `req-a11y-touch`, `req-a11y-axe`                                                                                                                                  |
| [`lesson-15`](lessons.md#lesson-15)   | `req-api-parts-unique`                                                                                                                                            |
| [`lesson-16`](lessons.md#lesson-16)   | `req-api-container`                                                                                                                                               |
| [`lesson-17`](lessons.md#lesson-17)   | `req-quality-stage`, `req-token-references`, `req-token-closure`, `req-token-override`, `req-token-scoped`                                                        |
| [`lesson-18`](lessons.md#lesson-18)   | `req-api-overlay`, `req-token-css`, `req-token-scoped`                                                                                                            |
| [`lesson-19`](lessons.md#lesson-19)   | `req-quality-unit`                                                                                                                                                |
| [`lesson-20`](lessons.md#lesson-20)   | `req-api-signal-forms`                                                                                                                                            |
| [`lesson-21`](lessons.md#lesson-21)   | `req-api-wrapper`, `req-project-core`                                                                                                                             |
| [`lesson-22`](lessons.md#lesson-22)   | `req-api-wrapper`                                                                                                                                                 |
| [`lesson-23`](lessons.md#lesson-23)   | `req-quality-e2e`                                                                                                                                                 |
| [`lesson-24`](lessons.md#lesson-24)   | `req-api-wrapper`, `req-api-parts-unique`                                                                                                                         |
| [`lesson-25`](lessons.md#lesson-25)   | `req-a11y-touch`, `req-api-frame`                                                                                                                                 |
| [`lesson-26`](lessons.md#lesson-26)   | `req-api-signal-forms`                                                                                                                                            |
| [`lesson-27`](lessons.md#lesson-27)   | `req-api-wrapper`                                                                                                                                                 |
| [`lesson-28`](lessons.md#lesson-28)   | `req-api-wrapper`, `req-quality-unit`                                                                                                                             |
| [`lesson-29`](lessons.md#lesson-29)   | `req-api-size`, `req-quality-views`                                                                                                                               |
| [`lesson-30`](lessons.md#lesson-30)   | `req-project-ssr`, `req-quality-e2e`, `req-quality-hydration`                                                                                                     |
| [`lesson-31`](lessons.md#lesson-31)   | `req-a11y-built-in`, `req-project-ssr`, `req-quality-hydration`                                                                                                   |
| [`lesson-32`](lessons.md#lesson-32)   | `req-api-number`                                                                                                                                                  |
| [`lesson-33`](lessons.md#lesson-33)   | `req-a11y-built-in`, `req-a11y-axe`, `req-quality-views`                                                                                                          |
| [`lesson-34`](lessons.md#lesson-34)   | `req-api-wrapper`, `req-api-size`                                                                                                                                 |
| [`lesson-35`](lessons.md#lesson-35)   | `req-api-overlay`, `req-token-logical`                                                                                                                            |
| [`lesson-36`](lessons.md#lesson-36)   | `req-project-package`, `req-project-tokens-lib`, `req-quality-registry`, `req-quality-package`, `req-quality-consumer`, `req-token-css`, `req-token-distribution` |
| [`lesson-37`](lessons.md#lesson-37)   | `req-api-generic`                                                                                                                                                 |
| [`lesson-38`](lessons.md#lesson-38)   | `req-a11y-motion`, `req-a11y-forced-colors`, `req-quality-negative-control`, `req-token-system`                                                                   |
| [`lesson-39`](lessons.md#lesson-39)   | `req-quality-negative-control`, `req-quality-registry`, `req-quality-e2e`                                                                                         |
| [`lesson-40`](lessons.md#lesson-40)   | `req-a11y-forced-colors`                                                                                                                                          |
| [`lesson-41`](lessons.md#lesson-41)   | `req-quality-negative-control`, `req-quality-package`, `req-release-semver`                                                                                       |
| [`lesson-42`](lessons.md#lesson-42)   | `req-quality-typecheck`, `req-token-artifacts`                                                                                                                    |
| [`lesson-43`](lessons.md#lesson-43)   | `req-quality-card`, `req-token-artifacts`                                                                                                                         |
| [`lesson-44`](lessons.md#lesson-44)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-45`](lessons.md#lesson-45)   | `req-quality-coverage`                                                                                                                                            |
| [`lesson-46`](lessons.md#lesson-46)   | `req-api-foundation`                                                                                                                                              |
| [`lesson-47`](lessons.md#lesson-47)   | `req-quality-typecheck`                                                                                                                                           |
| [`lesson-48`](lessons.md#lesson-48)   | `req-token-logical`                                                                                                                                               |
| [`lesson-49`](lessons.md#lesson-49)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-50`](lessons.md#lesson-50)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-51`](lessons.md#lesson-51)   | `req-project-tree-shaking`                                                                                                                                        |
| [`lesson-52`](lessons.md#lesson-52)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-53`](lessons.md#lesson-53)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-54`](lessons.md#lesson-54)   | `req-api-texts`                                                                                                                                                   |
| [`lesson-55`](lessons.md#lesson-55)   | `req-quality-package`, `req-quality-consumer`, `req-release-ng-add`                                                                                               |
| [`lesson-56`](lessons.md#lesson-56)   | `req-quality-browsers`                                                                                                                                            |
| [`lesson-57`](lessons.md#lesson-57)   | `req-quality-unit`                                                                                                                                                |
| [`lesson-58`](lessons.md#lesson-58)   | `req-quality-unit`                                                                                                                                                |
| [`lesson-59`](lessons.md#lesson-59)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-60`](lessons.md#lesson-60)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-61`](lessons.md#lesson-61)   | `req-project-reach`                                                                                                                                               |
| [`lesson-62`](lessons.md#lesson-62)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-63`](lessons.md#lesson-63)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-64`](lessons.md#lesson-64)   | `req-project-dependencies`                                                                                                                                        |
| [`lesson-65`](lessons.md#lesson-65)   | `req-a11y-built-in`                                                                                                                                               |
| [`lesson-66`](lessons.md#lesson-66)   | `req-api-generic`                                                                                                                                                 |
| [`lesson-67`](lessons.md#lesson-67)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-68`](lessons.md#lesson-68)   | `req-api-wrapper`                                                                                                                                                 |
| [`lesson-69`](lessons.md#lesson-69)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-70`](lessons.md#lesson-70)   | `req-a11y-forced-colors`                                                                                                                                          |
| [`lesson-71`](lessons.md#lesson-71)   | `req-quality-unit`, `req-quality-coverage`                                                                                                                        |
| [`lesson-72`](lessons.md#lesson-72)   | `req-api-generic`                                                                                                                                                 |
| [`lesson-73`](lessons.md#lesson-73)   | `req-project-tree-shaking`                                                                                                                                        |
| [`lesson-74`](lessons.md#lesson-74)   | `req-token-tiers`                                                                                                                                                 |
| [`lesson-75`](lessons.md#lesson-75)   | `req-quality-index`                                                                                                                                               |
| [`lesson-76`](lessons.md#lesson-76)   | `req-api-message`                                                                                                                                                 |
| [`lesson-77`](lessons.md#lesson-77)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-78`](lessons.md#lesson-78)   | `req-project-tree-shaking`, `req-quality-benchmark`                                                                                                               |
| [`lesson-79`](lessons.md#lesson-79)   | `req-project-tree-shaking`, `req-quality-index`, `req-quality-unit`, `req-quality-benchmark`                                                                      |
| [`lesson-80`](lessons.md#lesson-80)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-81`](lessons.md#lesson-81)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-82`](lessons.md#lesson-82)   | `req-api-overlay`                                                                                                                                                 |
| [`lesson-83`](lessons.md#lesson-83)   | `req-a11y-built-in`                                                                                                                                               |
| [`lesson-84`](lessons.md#lesson-84)   | `req-api-templates`                                                                                                                                               |
| [`lesson-85`](lessons.md#lesson-85)   | `req-api-icons`                                                                                                                                                   |
| [`lesson-86`](lessons.md#lesson-86)   | `req-api-icons`                                                                                                                                                   |
| [`lesson-87`](lessons.md#lesson-87)   | `req-api-animations`                                                                                                                                              |
| [`lesson-88`](lessons.md#lesson-88)   | `req-api-animations`                                                                                                                                              |
| [`lesson-89`](lessons.md#lesson-89)   | `req-api-overlay`                                                                                                                                                 |
| [`lesson-90`](lessons.md#lesson-90)   | `req-api-overlay`                                                                                                                                                 |
| [`lesson-91`](lessons.md#lesson-91)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-92`](lessons.md#lesson-92)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-93`](lessons.md#lesson-93)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-94`](lessons.md#lesson-94)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-95`](lessons.md#lesson-95)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-96`](lessons.md#lesson-96)   | — _(not cited)_                                                                                                                                                   |
| [`lesson-97`](lessons.md#lesson-97)   | `req-api-generic`                                                                                                                                                 |
| [`lesson-98`](lessons.md#lesson-98)   | `req-api-generic`                                                                                                                                                 |
| [`lesson-99`](lessons.md#lesson-99)   | `req-api-generic`                                                                                                                                                 |
| [`lesson-100`](lessons.md#lesson-100) | — _(not cited)_                                                                                                                                                   |
| [`lesson-101`](lessons.md#lesson-101) | — _(not cited)_                                                                                                                                                   |
| [`lesson-102`](lessons.md#lesson-102) | `req-a11y-built-in`                                                                                                                                               |
| [`lesson-103`](lessons.md#lesson-103) | — _(not cited)_                                                                                                                                                   |
| [`lesson-104`](lessons.md#lesson-104) | — _(not cited)_                                                                                                                                                   |
| [`lesson-105`](lessons.md#lesson-105) | — _(not cited)_                                                                                                                                                   |
| [`lesson-106`](lessons.md#lesson-106) | — _(not cited)_                                                                                                                                                   |
| [`lesson-107`](lessons.md#lesson-107) | — _(not cited)_                                                                                                                                                   |
| [`lesson-108`](lessons.md#lesson-108) | — _(not cited)_                                                                                                                                                   |
| [`lesson-109`](lessons.md#lesson-109) | — _(not cited)_                                                                                                                                                   |
| [`lesson-110`](lessons.md#lesson-110) | — _(not cited)_                                                                                                                                                   |
| [`lesson-111`](lessons.md#lesson-111) | — _(not cited)_                                                                                                                                                   |
| [`lesson-112`](lessons.md#lesson-112) | `req-a11y-built-in`                                                                                                                                               |
| [`lesson-113`](lessons.md#lesson-113) | `req-project-reach`                                                                                                                                               |
| [`lesson-114`](lessons.md#lesson-114) | — _(not cited)_                                                                                                                                                   |
| [`lesson-115`](lessons.md#lesson-115) | — _(not cited)_                                                                                                                                                   |
| [`lesson-116`](lessons.md#lesson-116) | — _(not cited)_                                                                                                                                                   |
| [`lesson-117`](lessons.md#lesson-117) | — _(not cited)_                                                                                                                                                   |
| [`lesson-118`](lessons.md#lesson-118) | — _(not cited)_                                                                                                                                                   |
| [`lesson-119`](lessons.md#lesson-119) | — _(not cited)_                                                                                                                                                   |
| [`lesson-120`](lessons.md#lesson-120) | — _(not cited)_                                                                                                                                                   |
| [`lesson-121`](lessons.md#lesson-121) | — _(not cited)_                                                                                                                                                   |
| [`lesson-122`](lessons.md#lesson-122) | `req-token-layers`                                                                                                                                                |
| [`lesson-123`](lessons.md#lesson-123) | `req-quality-unit`                                                                                                                                                |
| [`lesson-124`](lessons.md#lesson-124) | — _(not cited)_                                                                                                                                                   |
| [`lesson-125`](lessons.md#lesson-125) | — _(not cited)_                                                                                                                                                   |
| [`lesson-126`](lessons.md#lesson-126) | — _(not cited)_                                                                                                                                                   |
| [`lesson-127`](lessons.md#lesson-127) | — _(not cited)_                                                                                                                                                   |
| [`lesson-128`](lessons.md#lesson-128) | — _(not cited)_                                                                                                                                                   |
| [`lesson-129`](lessons.md#lesson-129) | — _(not cited)_                                                                                                                                                   |
| [`lesson-130`](lessons.md#lesson-130) | — _(not cited)_                                                                                                                                                   |
| [`lesson-131`](lessons.md#lesson-131) | — _(not cited)_                                                                                                                                                   |
| [`lesson-132`](lessons.md#lesson-132) | — _(not cited)_                                                                                                                                                   |
| [`lesson-133`](lessons.md#lesson-133) | — _(not cited)_                                                                                                                                                   |
| [`lesson-134`](lessons.md#lesson-134) | — _(not cited)_                                                                                                                                                   |
| [`lesson-135`](lessons.md#lesson-135) | — _(not cited)_                                                                                                                                                   |
| [`lesson-136`](lessons.md#lesson-136) | — _(not cited)_                                                                                                                                                   |
| [`lesson-137`](lessons.md#lesson-137) | — _(not cited)_                                                                                                                                                   |
| [`lesson-138`](lessons.md#lesson-138) | — _(not cited)_                                                                                                                                                   |
| [`lesson-139`](lessons.md#lesson-139) | — _(not cited)_                                                                                                                                                   |
| [`lesson-140`](lessons.md#lesson-140) | — _(not cited)_                                                                                                                                                   |
| [`lesson-141`](lessons.md#lesson-141) | — _(not cited)_                                                                                                                                                   |
| [`lesson-142`](lessons.md#lesson-142) | `req-project-reach`                                                                                                                                               |
| [`lesson-143`](lessons.md#lesson-143) | — _(not cited)_                                                                                                                                                   |
| [`lesson-144`](lessons.md#lesson-144) | — _(not cited)_                                                                                                                                                   |
| [`lesson-145`](lessons.md#lesson-145) | — _(not cited)_                                                                                                                                                   |
| [`lesson-146`](lessons.md#lesson-146) | — _(not cited)_                                                                                                                                                   |
| [`lesson-147`](lessons.md#lesson-147) | — _(not cited)_                                                                                                                                                   |
| [`lesson-148`](lessons.md#lesson-148) | — _(not cited)_                                                                                                                                                   |
| [`lesson-149`](lessons.md#lesson-149) | — _(not cited)_                                                                                                                                                   |
| [`lesson-150`](lessons.md#lesson-150) | — _(not cited)_                                                                                                                                                   |
| [`lesson-151`](lessons.md#lesson-151) | — _(not cited)_                                                                                                                                                   |
| [`lesson-152`](lessons.md#lesson-152) | — _(not cited)_                                                                                                                                                   |
| [`lesson-153`](lessons.md#lesson-153) | — _(not cited)_                                                                                                                                                   |
| [`lesson-154`](lessons.md#lesson-154) | — _(not cited)_                                                                                                                                                   |
| [`lesson-155`](lessons.md#lesson-155) | — _(not cited)_                                                                                                                                                   |
| [`lesson-156`](lessons.md#lesson-156) | — _(not cited)_                                                                                                                                                   |
| [`lesson-157`](lessons.md#lesson-157) | — _(not cited)_                                                                                                                                                   |
| [`lesson-158`](lessons.md#lesson-158) | — _(not cited)_                                                                                                                                                   |
| [`lesson-159`](lessons.md#lesson-159) | — _(not cited)_                                                                                                                                                   |
| [`lesson-160`](lessons.md#lesson-160) | — _(not cited)_                                                                                                                                                   |
| [`lesson-161`](lessons.md#lesson-161) | — _(not cited)_                                                                                                                                                   |
| [`lesson-162`](lessons.md#lesson-162) | — _(not cited)_                                                                                                                                                   |
| [`lesson-163`](lessons.md#lesson-163) | — _(not cited)_                                                                                                                                                   |
