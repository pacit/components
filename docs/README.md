# `@pacit/components` documentation

The whole repository is in English — [`req-project-language`](requirements/project.md#req-project-language).
The order in which the remaining layers shed Polish is kept by
[section H of the plan](plan.md#h-one-language-for-the-repository).

## Map

```
00-axis.md      LEVEL 0   the one requirement every other one is ordered by
requirements/   LEVEL 1   promises: what has to be true                (83 entries)
decisions/      LEVEL 2   why this way, and what it costs us           (17 ADRs)
components/     LEVEL 3   whether this component keeps them            (filled-in DoD)
lessons.md                the evidence base: what actually happened    (59 entries)
registry.md               GENERATED: promise → gate → control → state
review.md                 dated snapshot of an outside review
plan.md                   task list and work journal — the only place holding "done"
```

Reading order is the reverse of writing order: **requirements come out of lessons.**

| I want to…                                    | start at                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| understand what this library wins on          | [`00-axis.md`](00-axis.md)                                                |
| add a component                               | [`components/_template.md`](components/_template.md)                      |
| understand why something is built this way    | [`decisions/`](decisions/)                                                |
| check what is still missing                   | [`registry.md`](registry.md) — do **not** read this from the requirements |
| know what to do next and what is already done | [`plan.md`](plan.md)                                                      |
| find out what went wrong in the past          | [`lessons.md`](lessons.md)                                                |

### Level 1 — requirements

| file                                                 | area            | covers                                         |
| ---------------------------------------------------- | --------------- | ---------------------------------------------- |
| [`requirements/project.md`](requirements/project.md) | `req-project-*` | monorepo, dependencies, stack, layout, package |
| [`requirements/api.md`](requirements/api.md)         | `req-api-*`     | the contract as the consumer sees it           |
| [`requirements/a11y.md`](requirements/a11y.md)       | `req-a11y-*`    | accessibility                                  |
| [`requirements/tokens.md`](requirements/tokens.md)   | `req-token-*`   | tokens, styling, themes                        |
| [`requirements/quality.md`](requirements/quality.md) | `req-quality-*` | tests, sandbox, gates, registry                |
| [`requirements/release.md`](requirements/release.md) | `req-release-*` | versioning, publishing, support                |

---

## Requirement shape

Every requirement has a **fixed, parsable** shape. Only the **Promise** is normative — the
rest is commentary and metadata.

```markdown
### <a id="req-api-wrapper"></a>`req-api-wrapper` — Form controls are a wrapper plus a control

**Promise.** One or two sentences. Checkable.

**Gate:** `path/to/test.ts`, `other/path.mjs`
**Control:** `file.spec.ts › "test name"` or a description of the run
**Decision:** [0003 — …](decisions/0003-wrapper-and-control.md)
**Lessons:** [`lesson-21`](lessons.md#lesson-21)
```

### Fields `Gate` and `Control`

Both are **mandatory**. Each takes either a list of paths or one of two explicit forms of
absence:

| written as                         | means                                                        | state in the registry    |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------ |
| `` `path/…` ``                     | a machine that fires on this promise                         | **enforced**             |
| `none — deliberately: <why>`       | there will **never** be a gate, and that is fine             | **deliberately ungated** |
| `none — gap: <what it takes>`      | there is **not yet** a gate; `**Binds at:**` is required too | **gap**                  |
| anything else (or a missing field) | —                                                            | **CI FAILURE**           |

**There is no "built, just unverified" state.** This is the sharpest consequence of
[`req-axis`](00-axis.md): if nothing confirms a promise, it makes no difference whether it
is unbuilt or built and unmeasured — either way **we do not know**. So one category
(`gap`) covers both.

They used to be told apart by hand-written `_(unimplemented)_` and `_(partial)_`
annotations. There were 18 of them, they were added in a single commit after the fact, and
the only thing maintaining them was somebody's memory.

---

## Identifiers

### Why slugs, not numbers

There is one rule:

> **A number is a good identifier where the order means something.**

- In the [lesson log](lessons.md) it **does** — the log is chronological and append-only,
  nothing gets inserted. The numbers stay.
- In requirements it **meant nothing** — which is why it drifted. Towards the end the order
  of `req-api-*` in the file read: `1,2,3,4,5,` **`13,14,15,`** `10,11,12,16,17,18,19,`
  **`6,7,8,`** `20,21,` **`9`**.

A number that says nothing about position **is a name** — just an uninformative one. On top
of that `wym-api-31` (transposed digits) looks plausible, and with 161 citations in the code
nothing was catching a typo like that.

The reasoning is not borrowed: [`req-token-names`](requirements/tokens.md#req-token-names)
demands that **a token be guessable without documentation**. A requirement identifier falls
under the same rule.

### Rules

- **An ID does not change because its meaning changed.** When the meaning changes, a **new**
  requirement is written and the old one gets `superseded by`. A slug is a name, not a summary.
- Shape: `req-<area>-<slug>`, slug 1–2 words, ASCII, no diacritics.
- Lessons: `lesson-<number>`, next free number.
- Decisions: `<NNNN>` chronologically.

### ID space migration (2026-08-06)

The whole space moved to English along with the rest of the repository
([`req-project-language`](requirements/project.md#req-project-language), task
[H1](plan.md#h-one-language-for-the-repository)). The rule above is about **meaning**, not
spelling, so it does not cover this exception — and this is the one exception, dated and
final. From that date the old identifiers are **rejected by the gate**, exactly like the
numeric ones from 2026-07-27.

Prefixes, directories and files:

| old           | new           | old           | new             |
| ------------- | ------------- | ------------- | --------------- |
| `wym-`        | `req-`        | `wymagania/`  | `requirements/` |
| `lekcja-`     | `lesson-`     | `decyzje/`    | `decisions/`    |
| `wym-projekt` | `req-project` | `komponenty/` | `components/`   |
| `wym-jakosc`  | `req-quality` | `lekcje.md`   | `lessons.md`    |
| `wym-wydanie` | `req-release` | `rejestr.md`  | `registry.md`   |
| `wym-token`   | `req-token`   | `00-os.md`    | `00-axis.md`    |
| `wym-api`     | `req-api`     | `opis.md`     | `overview.md`   |
| `wym-a11y`    | `req-a11y`    | `tokeny.md`   | `tokens.md`     |
| `wym-os`      | `req-axis`    | `_szablon.md` | `_template.md`  |

Requirement files: `projekt.md` → `project.md`, `jakosc.md` → `quality.md`,
`tokeny.md` → `tokens.md`, `wydanie.md` → `release.md`. Decision names moved with their
files (`0014-teksty-jako-sygnal.md` → `0014-texts-as-signal.md`), and the generated ID
union now lives in `apps/sandbox/src/app/ui/doc-ids.ts` — the former `req-ids.ts` had
started to look to the gate like a requirement citation.

Full identifier mapping:

| old                         | new                            |     | old                        | new                        |
| --------------------------- | ------------------------------ | --- | -------------------------- | -------------------------- |
| `wym-a11y-axe`              | `req-a11y-axe`                 |     | `wym-jakosc-widoki`        | `req-quality-views`        |
| `wym-a11y-dotyk`            | `req-a11y-touch`               |     | `wym-os`                   | `req-axis`                 |
| `wym-a11y-kolory-wymuszone` | `req-a11y-forced-colors`       |     | `wym-projekt-angular`      | `req-project-angular`      |
| `wym-a11y-ruch`             | `req-a11y-motion`              |     | `wym-projekt-aplikacje`    | `req-project-apps`         |
| `wym-a11y-wbudowana`        | `req-a11y-built-in`            |     | `wym-projekt-core`         | `req-project-core`         |
| `wym-a11y-wcag`             | `req-a11y-wcag`                |     | `wym-projekt-entrypointy`  | `req-project-entrypoints`  |
| `wym-api-animacje`          | `req-api-animations`           |     | `wym-projekt-jezyk`        | `req-project-language`     |
| `wym-api-atrybuty`          | `req-api-attributes`           |     | `wym-projekt-layout`       | `req-project-layout`       |
| `wym-api-bez-obudowy`       | `req-api-no-wrapper`           |     | `wym-projekt-lib-tokenow`  | `req-project-tokens-lib`   |
| `wym-api-czesci`            | `req-api-parts`                |     | `wym-projekt-monorepo`     | `req-project-monorepo`     |
| `wym-api-czesci-unikalne`   | `req-api-parts-unique`         |     | `wym-projekt-najnowsze`    | `req-project-latest`       |
| `wym-api-fundament`         | `req-api-foundation`           |     | `wym-projekt-pakiet`       | `req-project-package`      |
| `wym-api-generyk`           | `req-api-generic`              |     | `wym-projekt-pliki`        | `req-project-files`        |
| `wym-api-ikony`             | `req-api-icons`                |     | `wym-projekt-prefiks`      | `req-project-prefix`       |
| `wym-api-ikony-wlasne`      | `req-api-icons-custom`         |     | `wym-projekt-ssr`          | `req-project-ssr`          |
| `wym-api-konfiguracja`      | `req-api-config`               |     | `wym-projekt-tree-shaking` | `req-project-tree-shaking` |
| `wym-api-kontener`          | `req-api-container`            |     | `wym-projekt-zaleznosci`   | `req-project-dependencies` |
| `wym-api-liczba`            | `req-api-number`               |     | `wym-projekt-zwiezlosc`    | `req-project-concise`      |
| `wym-api-nakladka`          | `req-api-overlay`              |     | `wym-token-artefakty`      | `req-token-artifacts`      |
| `wym-api-natywne-pole`      | `req-api-native-input`         |     | `wym-token-bez-opacity`    | `req-token-no-opacity`     |
| `wym-api-nazwy`             | `req-api-names`                |     | `wym-token-css`            | `req-token-css`            |
| `wym-api-obudowa`           | `req-api-wrapper`              |     | `wym-token-domkniecie`     | `req-token-closure`        |
| `wym-api-platforma`         | `req-api-platform`             |     | `wym-token-dtcg`           | `req-token-dtcg`           |
| `wym-api-ramka`             | `req-api-frame`                |     | `wym-token-dyrektywa`      | `req-token-directive`      |
| `wym-api-signal-forms`      | `req-api-signal-forms`         |     | `wym-token-dystrybucja`    | `req-token-distribution`   |
| `wym-api-sygnaly`           | `req-api-signals`              |     | `wym-token-gestosc`        | `req-token-density`        |
| `wym-api-szablony`          | `req-api-templates`            |     | `wym-token-kontrast`       | `req-token-contrast`       |
| `wym-api-teksty`            | `req-api-texts`                |     | `wym-token-logiczne`       | `req-token-logical`        |
| `wym-api-wielkosc`          | `req-api-size`                 |     | `wym-token-nadpisanie`     | `req-token-override`       |
| `wym-jakosc-e2e`            | `req-quality-e2e`              |     | `wym-token-nazwy`          | `req-token-names`          |
| `wym-jakosc-hydracja`       | `req-quality-hydration`        |     | `wym-token-pary-tekstu`    | `req-token-text-pairs`     |
| `wym-jakosc-jednostkowe`    | `req-quality-unit`             |     | `wym-token-poziomy`        | `req-token-tiers`          |
| `wym-jakosc-karta`          | `req-quality-card`             |     | `wym-token-referencje`     | `req-token-references`     |
| `wym-jakosc-konsument`      | `req-quality-consumer`         |     | `wym-token-scoped`         | `req-token-scoped`         |
| `wym-jakosc-kontrola`       | `req-quality-negative-control` |     | `wym-token-scss`           | `req-token-scss`           |
| `wym-jakosc-pakiet`         | `req-quality-package`          |     | `wym-token-skorka`         | `req-token-skin`           |
| `wym-jakosc-pokrycie`       | `req-quality-coverage`         |     | `wym-token-system`         | `req-token-system`         |
| `wym-jakosc-prefiks`        | `req-quality-prefix`           |     | `wym-wydanie-metadane`     | `req-release-metadata`     |
| `wym-jakosc-przegladarki`   | `req-quality-browsers`         |     | `wym-wydanie-ng-add`       | `req-release-ng-add`       |
| `wym-jakosc-rejestr`        | `req-quality-registry`         |     | `wym-wydanie-semver`       | `req-release-semver`       |
| `wym-jakosc-scena`          | `req-quality-stage`            |     | `wym-wydanie-wsparcie`     | `req-release-support`      |
| `wym-jakosc-typecheck`      | `req-quality-typecheck`        |     |                            |                            |

### Typing on the code side

Identifiers are **generated into a TypeScript union** (`PctReqId`), and the sandbox card
takes `[reqs]="PctReqId[]"` instead of `string[]`. A typo in a citation is a **compile
error**, not a chip leading nowhere.

Same move as `PctCssVar` in [`lesson-43`](lessons.md#lesson-43), applied to a second class
of names.

---

## The docs gate

`tools/check-docs.mjs`, target `check-docs`, in CI. Same idiom as `check-package.mjs`:
numbered checks, a header explaining **why the script exists**, `exit 1` on a violation.

It checks six things:

1. **Completeness.** Every requirement has `Promise`, `Gate` and `Control`; every
   `none — gap` also has `Binds at`.
2. **Existence.** Every path cited in `Gate` / `Control` exists on disk (a glob must have
   at least one hit).
3. **Wired into CI.** The target implied by the cited path really does run in
   `nx affected -t …` from `ci.yml` — or is a dependency of one that does. Same check as
   point 5 in `check-package.mjs`, where we verify that the schematic factory points at the
   compiled file and not at the TS from before the build.
4. **No dangling citations.** Every `req-*` / `lesson-*` used **anywhere in the repo**
   resolves to an existing entry, and the dead spaces (numeric and Polish) are rejected.
5. **Registry freshness.** `registry.md` on disk equals a freshly generated one.
6. **Negative control.** A set of deliberately broken requirements in
   `tools/check-docs.fixtures/` — **every one** of them has to be rejected.

Point 6 is not decoration. The registry is itself a gate, so it falls under
[`req-quality-negative-control`](requirements/quality.md#req-quality-negative-control) like
any other. Without it, it would be exactly what [`lesson-39`](lessons.md#lesson-39)
describes: a gate born dead.

---

## Identifier migration (2026-07-27)

Historical. The old IDs live on in commits, PRs and in [`review.md`](review.md) — this table
resolves them. **New code must not cite them**; the gate rejects them.

| old            | new                                        |     | old           | new                            |
| -------------- | ------------------------------------------ | --- | ------------- | ------------------------------ |
| `wym-proj-0`   | `req-axis`                                 |     | `wym-api-9`   | `req-api-animations`           |
| `wym-proj-1`   | `req-project-monorepo`                     |     | `wym-api-10`  | `req-api-container`            |
| `wym-proj-2`   | `req-project-latest`                       |     | `wym-api-11`  | `req-api-platform`             |
| `wym-proj-3`   | `req-project-dependencies`                 |     | `wym-api-12`  | `req-api-parts-unique`         |
| `wym-proj-4`   | `req-quality-coverage`                     |     | `wym-api-13`  | `req-api-wrapper`              |
| `wym-proj-5`   | `req-project-apps`                         |     | `wym-api-14`  | `req-api-no-wrapper`           |
| `wym-proj-6`   | `req-quality-registry`                     |     | `wym-api-15`  | `req-api-native-input`         |
| `wym-tech-1`   | `req-project-package`                      |     | `wym-api-16`  | `req-api-frame`                |
| `wym-tech-2`   | `req-project-prefix`                       |     | `wym-api-17`  | `req-api-number`               |
| `wym-tech-3`   | `req-project-angular`                      |     | `wym-api-18`  | `req-api-size`                 |
| `wym-tech-4`   | `req-project-ssr`                          |     | `wym-api-19`  | `req-api-overlay`              |
| `wym-ws-1`     | `req-project-layout`                       |     | `wym-api-20`  | `req-api-generic`              |
| `wym-ws-2`     | `req-project-entrypoints`                  |     | `wym-api-21`  | `req-api-texts`                |
| `wym-ws-3`     | `req-project-core`                         |     | `wym-a11y-1`  | `req-a11y-wcag`                |
| `wym-ws-4`     | `req-project-tokens-lib`                   |     | `wym-a11y-2`  | `req-a11y-touch`               |
| `wym-ws-5`     | `req-project-tree-shaking`                 |     | `wym-a11y-3`  | `req-a11y-axe`                 |
| `wym-ws-6`     | `req-project-files`                        |     | `wym-a11y-4`  | `req-quality-negative-control` |
| `wym-sbx-1`    | `req-quality-views`                        |     | `wym-a11y-5`  | `req-a11y-motion`              |
| `wym-sbx-2`    | `req-quality-card`                         |     | `wym-a11y-6`  | `req-a11y-forced-colors`       |
| `wym-sbx-3`    | `req-quality-stage`                        |     | `wym-a11y-7`  | `req-quality-hydration`        |
| `wym-sbx-4`    | `req-quality-prefix`                       |     | `wym-styl-1`  | `req-token-css`                |
| `wym-api-1`    | `req-api-names`                            |     | `wym-styl-2`  | `req-token-scss`               |
| `wym-api-2`    | `req-api-foundation`                       |     | `wym-theme-1` | `req-token-css`                |
| `wym-api-3`    | `req-api-signals`                          |     | `wym-theme-2` | `req-token-tiers`              |
| `wym-api-4`    | `req-api-attributes`                       |     | `wym-theme-3` | `req-token-override`           |
| `wym-api-5`    | `req-api-signal-forms`                     |     | `wym-theme-4` | `req-token-scoped`             |
| `wym-api-6`    | `req-a11y-built-in`                        |     | `wym-theme-5` | `req-token-skin`               |
| `wym-api-7`    | `req-api-templates`                        |     | `wym-theme-6` | `req-token-system`             |
| `wym-api-8`    | `req-api-config`                           |     | `wym-ikon-1`  | `req-api-icons-custom`         |
| `wym-token-1`  | `req-token-dtcg`                           |     | `wym-ikon-2`  | `req-api-icons`                |
| `wym-token-2`  | `req-token-artifacts`                      |     | `wym-test-1`  | `req-quality-unit`             |
| `wym-token-3`  | `req-token-tiers`                          |     | `wym-test-2`  | `req-quality-e2e`              |
| `wym-token-4`  | `req-token-references`                     |     | `wym-wer-1`   | `req-release-semver`           |
| `wym-token-5`  | `req-token-names`                          |     | `wym-wer-2`   | `req-release-ng-add`           |
| `wym-token-6`  | `req-token-text-pairs`                     |     | `wym-real-N`  | `lekcja-N`                     |
| `wym-token-7`  | `req-api-parts`                            |     |               |                                |
| `wym-token-8`  | `req-token-density`                        |     |               |                                |
| `wym-token-9`  | `req-token-scoped` + `req-token-directive` |     |               |                                |
| `wym-token-10` | `req-token-distribution`                   |     |               |                                |
| `wym-token-11` | `req-token-contrast`                       |     |               |                                |
| `wym-token-12` | `req-token-no-opacity`                     |     |               |                                |
| `wym-token-13` | `req-token-closure`                        |     |               |                                |

### What changed beyond the numbering

- **`wym-real-*` stopped being requirements.** 43 lessons are an evidence base, not
  promises — they have no gates and cannot be "implemented". A shared prefix was the only
  reason they were mixed in with the requirement list.
- **Three duplicated pairs were merged:** `wym-styl-1` ≈ `wym-theme-1`,
  `wym-theme-2` ≈ `wym-token-3`, `wym-theme-4` ≈ `wym-token-9` (the scoped-theme part).
- **`wym-token-9` was split** into the mechanism (`req-token-scoped`) and the sugar
  directive (`req-token-directive`) — because the first works and the second does not exist.
- **`wym-token-7` moved to the `api` area** as `req-api-parts`: the `data-pct-part` contract
  is public styling API, not a token.
- **9 requirements were added** that had not existed even though the promises were already
  binding: `req-quality-package`, `req-quality-typecheck`, `req-quality-consumer`,
  `req-quality-browsers`, `req-token-logical`, `req-release-metadata`,
  `req-release-support`, `req-token-directive`, `req-api-icons-custom`.
- **The "What is still missing" section was removed** — it was a hand-made copy of
  information already present above. [`registry.md`](registry.md) replaces it, generated.
- **The "How to read this document" section was removed** — it existed because the
  requirements could be read as a description of the state of the code. Once the promise was
  separated from the state, there was nothing left to explain.
