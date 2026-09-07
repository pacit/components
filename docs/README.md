# `@pacit/components` documentation

The whole repository is in English — [`req-project-language`](requirements/project.md#req-project-language).

## Map

```
00-axis.md      LEVEL 0   the one requirement every other one is ordered by
requirements/   LEVEL 1   promises: what has to be true                (94 entries)
decisions/      LEVEL 2   why this way, and what it costs us           (71 ADRs)
components/     LEVEL 3   whether this component keeps them            (filled-in DoD)
lessons.md                the evidence base: what actually happened    (178 entries)
support.md                what a consumer can count on: versions, notice, codemods
acr.md                    GENERATED: the Accessibility Conformance Report — WCAG 2.2 A/AA, from the gates
acr/                      the claims behind it: one entry per criterion, every citation held by check-acr
registry.md               GENERATED: promise → gate → control → state
plan.md                   the task list — the only place holding "done"
site.md                   the documentation site (apps/docs), designed before it is built
```

Reading order is the reverse of writing order: **requirements come out of lessons.**

| I want to…                                    | start at                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| understand what this library wins on          | [`00-axis.md`](00-axis.md)                                                |
| add a component                               | [`components/_template.md`](components/_template.md)                      |
| understand why something is built this way    | [`decisions/`](decisions/)                                                |
| check what is still missing                   | [`registry.md`](registry.md) — do **not** read this from the requirements |
| know what to do next and what is already done | [`plan.md`](plan.md)                                                      |
| hand a buyer the conformance report           | [`acr.md`](acr.md) — rendered from the gates, never typed                 |
| find out what went wrong in the past          | [`lessons.md`](lessons.md)                                                |
| know how long a version is supported          | [`support.md`](support.md)                                                |
| see how the site is designed, and build it    | [`site.md`](site.md)                                                      |

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
of that a number with transposed digits looks just as plausible as the real one, and with 161
citations in the code nothing was catching a typo like that.

The reasoning is not borrowed: [`req-token-names`](requirements/tokens.md#req-token-names)
demands that **a token be guessable without documentation**. A requirement identifier falls
under the same rule.

### Rules

- **An ID does not change because its meaning changed.** When the meaning changes, a **new**
  requirement is written and the old one gets `superseded by`. A slug is a name, not a summary.
- Shape: `req-<area>-<slug>`, slug 1–2 words, ASCII, no diacritics.
- Lessons: `lesson-<number>`, next free number.
- Decisions: `<NNNN>` chronologically.

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
