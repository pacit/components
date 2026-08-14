# Directional review — `@pacit/components`

**Date:** 2026-07-27 · **State:** 28 commits, 7 components, every gate green
**Scope:** `docs/overview.md`, `libs/components`, `libs/tokens`, `apps/sandbox`, `apps/sandbox-e2e`, CI, release
**Method:** a full read of the sources plus a run of `nx run-many -t lint test build check-package --skip-nx-cache` (green; two SCSS budget warnings: `select.scss` +337 B, `field.scss` +8 B)

This document answers three questions: **is the direction right**, **what to change**, **what to do next** — plus the RTL decision separately.

> **A dated snapshot.** Translated into English on 2026-08-07 (task H4) and otherwise left as it
> was written; the identifiers below (`wym-*`) belong to the namespace that H1 replaced, and the
> [migration table](README.md#id-space-migration-2026-08-06) maps them onto today's. Its own
> recommendation to keep the working documentation in Polish (risk E) was reversed on 2026-08-06:
> the whole repository moves to English, because a rule with no gate is no rule.

## 1. Verdict

The direction is right — better than the competition on the axis you have chosen. But **that axis
is nowhere named out loud**, and without it „better than PrimeNG" is a goal unreachable by
definition: PrimeNG has ~90 components and a decade of lead. On the number of components you will
never win, and there is no point trying.

You can win on something else — and you already are, only without writing it down:

> **This is a library that enforces every promise it makes with a gate that can fail.**

The contrast gate blocks the build. `check-package` examines the packed artefact, not the sources.
The hydration gate sits in `visit()`, so it covers every view at once instead of waiting to be
added to the next spec. `wym-real-39` says it plainly: _„a new gate is not ready when it passes —
it is ready when it has been shown that it can fail"_.

None of the libraries named above has this. Material has a11y documentation; nobody fails a build
on a contrast ratio. PrimeNG has a JS theme engine with SSR/FOUC problems — your CSS-first
zero-runtime approach is simply a better solution to the same problem.

**To do:** write it down as `wym-proj-0` in `overview.md`. Every other priority follows from that
thesis, and an unnamed thesis cannot settle arguments about order.

## 2. What is already world class — and must not be traded away

| Thing                                                      | Why it is an advantage                                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `wym-token-13` — transitive closure of overrides           | A real defect PrimeNG had for years. Solved properly, with a regression test comparing a component token in `:root` and in a scope.       |
| The contrast gate as a skin policy (`wym-token-11`)        | Nobody does this. `wym-token-12` (no `opacity`) closes the hole through which hex arithmetic lies about composition with the background.  |
| Signal forms without `ControlValueAccessor` (`wym-real-9`) | A bet on Angular's future, verified by experiment rather than assumption. You will be ~2 years ahead of Material.                         |
| `check-package` examining the artefact (`wym-real-36`)     | „A green build is no proof that the artefact can be used" — a sentence worth a whole textbook chapter.                                    |
| Negative controls for gates (`wym-a11y-4`, `-38`, `-39`)   | A methodology above that of commercial libraries. A gate that always passes is more dangerous than no gate.                               |
| Cursor map × `elementFromPoint` (`wym-real-27`)            | It caught a class of defect („it looks clickable") that no automated audit sees.                                                          |
| The motion axis in tokens (`wym-a11y-5`)                   | Motion reduction holds from one rule, and a new component inherits it by using the token — instead of starting from its absence.          |
| The `wym-real-*` log                                       | **The jewel of the project.** An ADR with empirical evidence beside every decision. For onboarding people it is worth more than the code. |

These are **structural** advantages — the competition cannot catch up with a feature, only by
rewriting a foundation. Any decision to go faster at the cost of one of them is a bad trade.

## 3. Where the direction is at risk

### A. No behaviour layer — the largest architectural risk

Today every component is built by hand and `core` is 5 small files. The components ahead (dialog,
menu, tooltip, popover, tabs, drawer, autocomplete, date picker, tree) all need **the same set**:
focus trap, focus restore, roving tabindex / `aria-activedescendant`, the closing stack (Escape
order with nested overlays!), scroll lock, `inert` background, live announcer, positioning.

`wym-api-6` says CDK a11y „binds only at the dialog". That is one component too late. The decision
to take **now**: do overlay and focus semantics belong to CDK, or to you?

**Recommendation: mechanics from CDK, our own API.** Wrap `Overlay`, `FocusTrap`, `LiveAnnouncer`
and `Directionality` in a `@pacit/components/core` layer so that CDK types **never** leak into the
public API. Then CDK stays one replaceable dependency instead of growing into the contract.

The pattern is ready — `PCT_FIELD` is exactly that: a contract through which the field chrome and
the control talk, knowing nothing about each other beyond the interface. Repeat it for overlays.

### B. Select is a closed component

`options: PctSelectOption<T>[]` is the PrimeNG model and that is its ceiling. Missing: projected
`pct-option`, an option template, groups, multiple selection, filtering, clearing, loading/async
state, virtualisation.

Something else matters more, though: **the list machinery** (typeahead, `enabledIndexes`,
`moveActive`, `activeIndex`) sits as private methods in `PctSelect`. Autocomplete, multiselect,
menu, combobox and a command palette all need the same.

**Extract it into `core` before the second consumer, not after** — otherwise `wym-real-21` (the
same logic copied into four controls) repeats on a much bigger piece and with a much dearer fix.

### C. Nothing proves the library scales

There is no performance budget, no benchmark and no test on large data. `@for` over all options,
no virtualisation. A library meant to beat Telerik has to answer „what happens at 10 000 rows /
5 000 options". That is a legitimate choice for v0 — but it must be a **written** choice, because
it changes the inside of the select and determines the architecture of the table.

### D. The public API is not machine-controlled

`wym-token-7` promises a versioned `data-pct-part` contract. Today: no inventory of parts, no
snapshot of public exports, no test firing when somebody renames an input.

For a library whose selling point is „you can safely style the inside", that is **a promise
without a gate** — exactly the pattern you criticise yourselves in `wym-real-36`. It is the only
place where the project behaves like an ordinary library.

### E. The documentation is in Polish — including the JSDoc

The single most serious finding against the goal „the best known Angular library".

```ts
/** The chosen value — a required field of the `FormValueControl` contract. */
readonly value = model<NoInfer<T> | null>(null);
```

That text shows up **in the editor tooltip of every consumer of the library** — not in your repo
but in theirs, on every hover over an input.

A split that costs nothing:

- `overview.md`, `review.md`, the `wym-real-*` log — **stay in Polish.** That is where thinking
  happens, and thinking happens in one's own language. It is not a public surface.
- README, the docs app, **JSDoc on the public API**, CHANGELOG, developer warnings, issue
  templates, gate messages visible to a consumer — **English.**

The warnings in `[pctNumber]` are already in English and the justification in `wym-api-21` is the
right one („a programmer reads them, not a user"). JSDoc falls under the same rule, one step
further.

### F. One browser, one platform

`playwright.config.mts`: chromium only, the rest commented out. For a library that advertises a11y
that is not enough — Safari has the most CSS defects (`:has()`, `inert`, `dialog`,
`field-sizing`), and you test `forced-colors` by emulation alone.

Minimum: **webkit + firefox in the functional matrix.** Visual screenshots stay on linux/chromium
— rasterisation would break them anyway, which you wrote down yourselves in `snapshotPathTemplate`.

### G. No consumer test

`.verdaccio/config.yml` and the `local-registry` target in the root `project.json` **exist and are
used by nothing**. If your own lesson says „a green build is no proof that the artefact can be
used", then the logical next step after `check-package` is: `npm pack` → install into a fresh
application → an SSR build → one e2e. `check-package` examines the artefact statically; this would
examine it in use.

## 4. RTL — the decision

**Do not drop it. But do not „support" RTL either — make it a constraint, not a feature.**

The reasoning, because the question was asked honestly and deserves numbers rather than an opinion.

**The simplification you were after does not exist.** `padding-inline-start` is neither harder nor
longer than `padding-left`. There is no dividend to collect at the CSS layer — the stylesheets
already use logical properties consistently, so dropping RTL would save not one line, it would
only remove the guarantee that they stay that way.

**The real cost of RTL is elsewhere** and it is bounded: Left/Right arrows have to swap in
horizontal layouts (radiogroup, tabs, slider, carousel), overlays have to mirror (CDK
`Directionality` does that), `scrollLeft` has a different sign. That is work on **future**
components, not on the current ones.

**The retrofit cost is non-linear.** Today: a lint rule + an axis in the sandbox + a handful of
screenshots ≈ 1–2 days. After 40 components: weeks, plus hunting down every arrow and animation
with a baked-in direction.

**Commercially it is a tender gate, not a preference.** Material, PrimeNG, Telerik and Ant all
have RTL. A library without RTL drops out of procurement in the Gulf, in Israel and in some public
organisations **by a checkbox, before anyone looks at quality** — the exact opposite of the
strategy „we win on quality".

### What to do

1. Write it down as a requirement (`wym-styl-3`): _library stylesheets use logical properties only_.
2. **Gate:** a lint rule (stylelint or a script of your own in the spirit of `check-package.mjs`)
   forbidding `left`/`right`, `margin-left`, `padding-right`, `text-align: left|right`,
   `border-*-left` in `libs/components/**/*.scss`. Exceptions only with a comment giving the
   reason — you already have two good ones (the spinner's `border-right-color`, the symmetric
   `left: 50%` in hit areas).
3. **A `dir` axis in the sandbox shell** — of the same shape as the existing theme, skin and size
   axes. Then every view becomes an RTL test in passing, with no separate examples to write. The
   same trick you already used in `wym-sbx-2` for the theme.
4. One RTL visual screenshot per component + an axe audit in RTL.
5. **Draw the boundary explicitly:** _„the layout mirrors; full bidi (mixed directions inside one
   run of text, isolation when truncating labels) is not solved in v1"_.

What should be deliberately excluded is **full bidi**, not RTL. That is the honest omission the
question was reaching for.

## 5. Findings in the code

### 5.1 No `aria-label` on controls whose role is inside — a real a11y gap

`<pct-select aria-label="Country">` lands on the `<pct-select>` host, which has no role.
`role="combobox"` is on the inner `<button>`. A standalone select with no `label` and no field
chrome is **an unnamed combobox**, and a consumer has no way to fix it.

Needed: explicit `ariaLabel` / `ariaLabelledby` inputs forwarded to the element that has the role.
For a library of this class that is a mandatory escape hatch — it concerns `pct-select` and every
future component whose role does not sit on the host.

### 5.2 `PCT_TEXTS` will not survive a language change at runtime

`providePctTexts` returns `{ provide, useValue }` — a static object. `PctSelect` reads it once:

```ts
protected readonly texts = inject(PCT_TEXTS);
readonly placeholder = input<string>(this.texts.selectPlaceholder); // read at construction
```

An application switching language without a page reload (a very common pattern) **will not see the
new strings** — even if it swapped the token's content, `placeholder` already holds a default value
from the moment of construction.

To be settled before `PCT_TEXTS` grows: either the token carries `Signal<PctTexts>`, or
`providePctTexts` takes a factory, or we write down plainly that a language change requires a
reload. The third option is defensive, but it has to be a decision rather than an oversight — and
today it is written down nowhere.

### 5.3 `_tokens.scss` is generated, shipped in the package and used by zero lines of code

Components write `var(--pct-*)` as raw strings (159 unique ones, zero `@use` in component
stylesheets). `wym-token-2` requires SCSS maps „for internal use" — there is no use.

Either drop it from the requirement and from the package, or make it the mandatory road to a token.
For the second speaks `wym-real-43` (a typo should be a compile error), although here
`check-package` catches the typo after the fact — so this is not a live defect, only a dead
artefact in a published package.

### 5.4 `track option.value` in `select.html`

For a non-primitive `T` this tracks by reference, and two options with the same value give NG0955
in dev mode. With a generic `T` nothing prevents it. Either `track $index`, or a documented
uniqueness requirement with a warning under `isDevMode()`.

### 5.5 `PctField.attach()` — the last one wins silently

`private readonly control = signal<PctFieldControl | null>(null)`; `attach` simply overwrites. Two
controls in one field chrome is a silent defect of the kind this project usually catches. A cheap
`console.warn` under `isDevMode()`.

### 5.6 No `LICENSE` in the repository and no `repository` in the manifest

You know about it (`check-package` warns, the „What is still missing" table lists it), but
`"license": "MIT"` in the manifest without a LICENSE file is formally an incomplete licence — and
that is the first thing a corporate consumer's legal department checks.

### 5.7 The 80% coverage threshold is declared and not enforced

`wym-proj-4` / `wym-real-5`. This is the one place where the project breaks its own first
principle: a promise without a gate. It is also the oldest debt — the longer it stands, the more
there is to make up.

## 6. Roadmap

The logic of the order: **first build the machine that makes components correct by construction,
then produce components fast.** The reverse order is why PrimeNG has 90 components and a11y
problems in half of them.

### Phase 0 — close the promises already made

Everything here gets dearer with every additional component.

| Task                                                                        | Closes                     |
| --------------------------------------------------------------------------- | -------------------------- |
| `coverageInclude` + an enforced coverage threshold                          | `wym-proj-4`, `wym-real-5` |
| A snapshot of the public TS API (`api-extractor` → `.api.md` in the repo)   | risk D                     |
| A generated `data-pct-part` inventory + a gate on unaccepted change         | `wym-token-7`, risk D      |
| A snapshot of token names (you already generate `tokens.ts` — add a gate)   | `wym-token-2`              |
| JSDoc of the public API + README into English                               | risk E                     |
| RTL: requirement + lint + a `dir` axis in the sandbox + screenshots         | section 4                  |
| Closing the shape of `PctConfig` **with a per-component defaults strategy** | `wym-api-8`                |
| Browser matrix: + webkit, + firefox (functionally)                          | risk F                     |
| `LICENSE`, `repository`                                                     | release readiness          |
| A consumer test on Verdaccio (`pack` → install → SSR build → e2e)           | risk G                     |
| Fixes 5.1–5.5                                                               | —                          |

A note on `PctConfig`: the question is not „which fields to add" but **„do per-component defaults
go through configuration (`providePctConfig({ button: { variant: 'outline' } })`) or through
tokens"**. Material and PrimeNG both ended up with default providers. Decide before the fifteenth
component, because later it is a breaking change in every one of them.

### Phase 1 — the behaviour layer in `core`

The thing that makes Phase 2 fast.

- **List navigation**: `activeIndex`, typeahead, skipping disabled — extract from `PctSelect`.
- **Overlay**: positioning, the closing stack (Escape order when nested), outside click, `inert`
  background, scroll lock, inheritance of theme and writing direction. The last one is **solved
  once in `wym-real-35` — generalise it**, because the lesson was „every inherited property is
  silently broken in an overlay", which is a rule, not a peculiarity of the select.
- **Focus**: trap, restore, initial focus, roving tabindex as an alternative to
  `aria-activedescendant`.
- **Live announcer**: one `polite` channel, one `assertive`, with deduplication — not a region per
  component.
- **`*pctTemplate` / `TemplateRef`** (`wym-api-7`) — it also unblocks icons.
- **Icons** (`wym-ikon-2`): `pct-icon` taking a projected SVG **plus** a `PCT_ICONS` token mapping
  semantic names (`chevron-down`, `check`, `close`, `calendar`) onto templates, with built-in
  defaults. It satisfies „zero dependencies" and „swap in your own set" at once, without forcing
  anybody into either.

### Phase 2 — components in order of architectural debt

1. **Dialog** — forces a focus trap, scroll lock, `inert`, focus restore, the Escape stack, SSR
   safety. The highest architectural gain per component.
2. **Tooltip + Popover** — forces the „describes vs names" distinction, hover/focus/touch parity
   (the tooltip is the most frequently broken component in _every_ library) and motion reduction on
   a real enter/leave, which `wym-api-9` is waiting for.
3. **Menu** — roving focus, submenus, reuse of the typeahead from Phase 1.
4. **Closing out the select family** — projected `pct-option`, an option template, groups, multiple
   selection, filtering, clearing, async/loading, virtualisation. Deliberately **after** the
   behaviour layer, otherwise you build it twice.
5. **Switch, Textarea (autosize), Slider, Date picker** — the date picker is the most wanted and
   the hardest; it forces deep i18n (calendars, first day of the week, locale formats), which
   `[pctNumber]` has already started.
6. **Table / DataGrid** — the true differentiator against everybody. It has to stand on a
   **headless core** (column model, sorting, filtering, grouping, selection — all as signals)
   separated from rendering. Otherwise it becomes the component everybody forks.
7. Toast, Tabs, Accordion, Drawer, Pagination, Progress, Skeleton, Chips, Avatar, Badge,
   Breadcrumb, Stepper, Tree.

### Phase 3 — the trust surface

`apps/docs` rendering the **generated** inventories of parts and tokens (not hand-written ones),
migration guides, a compatibility matrix, published benchmarks, an a11y conformance report and a
log of screen-reader testing.

A note on the order: `overview.md` places `apps/docs` at „the first external user". That is too
late in one specific respect — **the inventory of parts and tokens has to be generated and gated
from Phase 0**. The pretty page that renders it can come in Phase 3. Those two things have to be
separated.

## 7. What separates „very good" from „the best in the world"

Phases 0–3 give a library technically better than the competition. The things below decide whether
anybody notices and whether adoption can be built on it. All of them are feasible only after Phase
1, but they have to be planned now, because some of them shape the API.

### 7.1 A component „Definition of Done" — the single most important artefact to write

Today the quality of every component comes from the same person having built it in the same mode of
attention. That scales neither to a second person nor to a twentieth component. What is needed is a
list a component has to pass to enter a release — **machine-checked** as far as possible, not by a
human eye:

| Criterion                                                          | How it is checked                     |
| ------------------------------------------------------------------ | ------------------------------------- |
| The ARIA APG pattern named explicitly in the class JSDoc           | review                                |
| A keyboard map written down and tested key by key                  | e2e                                   |
| `forced-colors: active` — state not carried by colour alone        | e2e (you already have the pattern)    |
| `prefers-reduced-motion` — duration from a token, not a stylesheet | e2e + a grep for `@media` in the file |
| RTL — no physical properties, a screenshot in `dir="rtl"`          | lint + screenshot                     |
| SSR + hydration with no `NG05xx`                                   | the gate in `visit()` (you have it)   |
| Forms: signal forms **and** `[formControl]` **and** `[(ngModel)]`  | unit tests                            |
| Size axis `sm`/`md`/`lg` aligned to `--pct-control-height-*`       | a measuring e2e (you have it)         |
| Density axis                                                       | after `wym-token-8`                   |
| Touch target ≥ 24×24 px directly, not through a spacing exception  | e2e (you have it)                     |
| `data-pct-part` parts registered in the inventory                  | the gate from Phase 0                 |
| Tokens registered + an entry in `contrast.policy.json`             | the token build                       |
| A visual screenshot + an axe audit on its own sandbox view         | e2e (you have it)                     |
| A screen-reader test log                                           | manual, see 7.2                       |
| A docs page with live examples                                     | Phase 3                               |
| An entrypoint size budget                                          | see 7.2                               |

Half of this already exists as scattered practice. The value is in writing it down and enforcing it
— otherwise the twentieth component gets only the checks somebody happened to remember.

### 7.2 The gates that do not exist yet

Consistently with the `wym-proj-0` thesis — every promise below needs a machine that can fire on it:

- **A size budget per entrypoint.** Today `field` is 62 kB and `select` 43 kB in FESM. Without a
  budget nobody notices when it doubles. Track it over time, fail on a jump.
- **Verification of tree-shaking.** `wym-ws-5` promises that the primary entrypoint is minimal and
  that you import through the secondary ones. Nothing checks it: a test should build an application
  importing **only** `@pacit/components/button` and check that the bundle contains neither
  `PctField` nor CDK Overlay.
- **Mutation testing of the core** (Stryker on `core`, `number`, `select`). It is the only method
  that answers „do these tests catch anything at all" — exactly the question the project asks
  itself at every gate. 136 green tests are not yet proof.
- **Property tests for the number parser.** `[pctNumber]` parses more broadly than it formats, over
  many locales, with clamping to bounds. A perfect candidate for fuzzing: „for any `n` and any
  locale, `parse(format(n)) === n`". That one property covers cases nobody invents by hand.
- **Memory-leak detection.** You caught the timer leak in `PctSelect` by reading the code. With
  twenty components carrying overlays you need a test that mounts and destroys a component N times
  and checks the number of detached nodes.
- **A zoneless gate.** `wym-real-8` removed `zone.js` and boasts that „coming back by accident is
  impossible". Nothing guards it: a test should fail when `zone.js` appears in the dependency tree
  or `window.Zone` in the bundle.
- **Automated screen-reader tests.** Tools exist that drive NVDA and VoiceOver from tests
  (guidepup). Even a few scenarios — „what the reader announces when the select opens", „what after
  a value change" — give you something **no** Angular library has. Axe examines structure; it does
  not hear.

### 7.3 Formal conformance — the shortest road to corporate adoption

In 2026 this is not decoration, it is an entry condition:

- **The European Accessibility Act** has been enforceable since June 2025. Digital products sold to
  consumers in the EU have to be accessible. Companies are frantically looking for components they
  can prove it with.
- **EN 301 549** — the standard cited in every European public tender.
- **VPAT / ACR** — the document a purchasing department demands before anybody sees the code.

Nobody in the Angular ecosystem ships a library with a ready ACR and **machine proof** behind every
point. You have the proof earlier than the document — the reverse of the industry norm and the
strongest possible sales material. Generating the ACR from the existing gates is largely editorial
work.

On top of that: a CSP guide (Angular emits inline styles — a consumer with a strict `style-src` has
to know what to do), an SBOM at release, a written security policy. Provenance you already have.

### 7.4 A bridge to design tools

The source of truth is DTCG (`wym-token-1`) and that is **an unused advantage**. The format is read
and written by Figma / Tokens Studio. Two-way synchronisation — a designer changes a token in
Figma, the PR trips the contrast gate, the build ships a skin — is a workflow no Angular library
has, and one that sells itself to every team with a designer.

It ties into `wym-theme-5` (the path for an outsider to build a skin). Done together they give a
complete story: _„your designer defines the theme in Figma, and our gate will not let them ship a
theme with too little contrast"_. That is a sentence that wins presentations.

### 7.5 A surface for AI agents

In 2026 a large share of code is written with assistants. A library an agent uses correctly the
first time beats a technically better library the agent keeps using wrongly. Concretely:

- `llms.txt` in the package and on the docs site — a concise catalogue of components, inputs and
  usage patterns.
- A machine-readable catalogue (JSON) generated from the same source as the docs — components,
  inputs, types, parts, tokens.
- A dozen or so canonical examples per component, marked as reference.
- Possibly an MCP server for the library — you already have the Angular CLI MCP in `.mcp.json`, so
  the pattern is familiar.

The cost is low, because you generate all this data for the docs and the Phase 0 gates anyway. It is
mostly a matter of a second output format.

### 7.6 i18n taken seriously

`PCT_TEXTS` is a good start and a good decision (a separate token, partial overrides). To close:

- reactivity on a runtime language change (finding 5.2),
- plurals / ICU wherever a string contains a number („3 of 17 selected"),
- compatibility with `$localize` for applications using Angular's native i18n,
- date, number and currency formats per locale (`[pctNumber]` started, the date picker will close
  it),
- **first day of the week, non-Gregorian calendars** — exactly the work that, together with RTL,
  opens the Middle Eastern markets.

### 7.7 Performance as a published number

If you are faster than PrimeNG and Material — prove it publicly, with a repeatable harness in the
repository: first render time, update time at 1 000 rows, bundle size for a typical form, hydration
cost. A benchmark the competition can run on their own machines is credible; a chart in a README is
not.

It is also a gate: a performance regression should fail CI rather than be noticed by a consumer.

### 7.8 Project governance as a trust signal

A company does not buy a library on the strength of its code, but on its predictability:

- a versioning policy and a **support window** (how many Angular versions back, for how long),
- a deprecation policy (how many minors of warning before removal),
- a migration collection **with real migrations** — today it is empty, and rightly ships in the
  package from the first release (`wym-wer-2`), but the first breaking change has to arrive with a
  codemod, not with a paragraph in the CHANGELOG,
- a public roadmap and an RFC process for API changes,
- CONTRIBUTING with the „Definition of Done" from 7.1,
- `beta`/`rc` channels with `dist-tag` (`wym-wer-1` leaves this to be pinned down).

## 8. The merged order

```
Phase 0  ──  gates and promises          (2–3 weeks)  blocks everything
Phase 1  ──  behaviour layer in core     (3–4 weeks)  blocks Phase 2
Phase 2  ──  dialog → tooltip → menu → select → fields → table
              └─ in parallel: 7.1 DoD, 7.2 gates (each at the first component that needs it)
Phase 3  ──  apps/docs, ACR, benchmarks, the Figma bridge, the AI surface
```

The one order that must not be reversed: **7.1 („Definition of Done") has to exist before the first
component of Phase 2**, otherwise the dialog will be built without some of the checks and become
the pattern for the ones after it.

## 9. The axis and its gate

The first version of this section said: _„name the axis you win on, and write a gate for it"_ — and
glued together two different things, suggesting that the gate for the axis is the gate on
`data-pct-part`. Not so; they are two matters of different orders of magnitude. Separated below.

### 9.1 What the axis is

An axis is the competitive dimension you win on. The competition has theirs: PrimeNG — the number
of components, Material — fidelity to the specification and the Google brand, Telerik — the support
contract and the depth of the table, Spartan — headless and code ownership through copy-paste.

Yours cannot be guessed from the README, but **it can be read out of `wym-real-*`**. That log looks
like a collection of independent lessons and is nine occurrences of one — see the table in
`wym-proj-0` (`overview.md`). Every one of them says „silently", „nobody saw it", „born dead",
„it survived".

Hence the name of the axis:

> **`wym-proj-0` — in this library nothing breaks silently.**

Three reasons to name it by the **silent defect** rather than by „verifiability" or „quality":

1. It is derived from your own evidence, not from a marketing ambition.
2. It explains **why** every gate needs a negative control — a gate without one is another silent
   defect, one floor up.
3. It is a sentence a person holds in their head **while writing code**. „Verifiability of
   promises" is not.

### 9.2 What the axis is about

Not a11y, not tokens, not tests. It is about **a class of failure that runs through every layer** —
the one where the platform answers an error with silence:

| layer       | what the platform does instead of erroring               | where in your code             |
| ----------- | -------------------------------------------------------- | ------------------------------ |
| CSS         | missing `var()` → the initial value                      | `wym-real-36`, `check-package` |
| DOM reads   | a non-existent token → `''`                              | `wym-real-43`                  |
| test infra  | no screenshot baseline → record the current one as good  | `wym-real-39`                  |
| test infra  | emulation does not arrive → a test on default values     | `wym-real-38`                  |
| build graph | a missing edge → the build succeeds, the output is wrong | `wym-real-36`                  |
| SSR         | id drift → a silent re-render, ARIA into the void        | `wym-real-31`                  |
| a11y        | state by colour alone → gone in `forced-colors`          | `wym-real-40`                  |
| types       | `T` too wide → contradictory bindings compile            | `wym-real-37`                  |

The common denominator: **the default behaviour of a layer is „nothing happened"**. That is why a
missing gate never shows up as an absence — it shows up as green.

### 9.3 The gate for the axis itself

The gate for the axis is not about parts or tokens. It is about **`overview.md`**.

The drift between the document and reality has already happened and has already been patched once.
The heading „How to read this document" exists precisely because the requirements could be read as
a description of the state of the code — and the answer was **adding 18 annotations by hand**
(`495483d`). That is the same pattern as the manual `node libs/tokens/build.mjs` in CI before
`wym-real-36`: a workaround masking a missing structure instead of exposing it.

The gate is **a registry in which every requirement names its gate and that gate's negative
control** (`wym-proj-6`):

| column    | meaning                                                                  |
| --------- | ------------------------------------------------------------------------ |
| `wym-*`   | the promise                                                              |
| `gate`    | the path to the target / test / script that fires on it                  |
| `control` | the test proving that gate can **fail**                                  |
| `state`   | **derived**, not typed in: `enforced` / `none (deliberately, because …)` |

The script reads `overview.md` and checks three things: (1) the requirement has an entry, (2) the
named target/file **exists and is wired into CI**, (3) the negative control exists. Point (2) is
exactly the same check as point 5 in `check-package.mjs`, where you verify that the schematic
factory points at a compiled file rather than at TS from before the build.

A deliberately missing gate is allowed — it has to be written down **together with the reason**.
Then `_(not implemented)_` stops being an annotation somebody remembered to add and becomes a
derived consequence of the registry's state: the document stops lying by construction rather than
by discipline.

A side effect, in fact the main benefit: **adding a requirement without a gate stops being possible
silently.** The axis begins to enforce itself.

### 9.4 The order — the reverse of what the first version suggested

`data-pct-part` is not the gate for the axis. It is **the first item the registry will show red** —
along with the 80% coverage threshold, tree-shaking of the primary entrypoint (`wym-ws-5`), the
irreversibility of zoneless (`wym-real-8`), the RTL intention and a few others.

So: **first the registry, then whatever the registry points at.** Because the registry will tell
you how many gaps you cannot see yet — today I estimate 6–10, but that is guessing, and the guessing
is the problem. Only a machine will count them.

This is the one place in the repository where the project behaves like an ordinary library: a
promise in the documentation, with no machine able to fire on it. Everything else here is better
than that standard — and that is exactly the reason to close this one exception first.
