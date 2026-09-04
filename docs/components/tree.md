# `PctTree` — a walk the platform does not have

**Summary:** A tree the reader walks with the keyboard: branches that open, leaves that get chosen.
**Entrypoint:** `@pacit/components/tree`
**Selectors:** `pct-tree`, `pct-tree-item`
**Status:** released
**Category:** Actions & navigation
**ARIA APG pattern:** [Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) —
([0056](../decisions/0056-a-tree-is-a-walk-the-platform-does-not-have.md)) one tab stop,
a roving focus, `treeitem`s in `group`s, `aria-expanded` on branches and `aria-selected`
on the chosen row. Named in the class JSDoc.

**The first component of the 1.1 tail that could not refuse the keys.** Eleven components
in a row left the keyboard to the platform, because the platform had it; a tree is where
that ends — no element walks a hierarchy — so the walk IS the component. Everything else
is refused ownership: the markup is the hierarchy (items nested in items, no `data`
input), each branch owns its `expanded` model, and the tree owns exactly one thing —
`selected`, the chosen item's `value`.

**Measured before it was written.** The probe put the skeleton in front of axe in three
engines: custom elements carrying `treeitem` with `role="group"` children and **no
hand-written `aria-level` / `aria-posinset` / `aria-setsize`** are clean everywhere — the
DOM structure is the level. An empty `role="tree"` raises nothing (`lesson-138`'s
carve-out extends to `tree`), so the role is static.

## Usage

```html
<pct-tree ariaLabel="Files" [(selected)]="chosen">
  <pct-tree-item value="src" [expanded]="true">
    src
    <pct-tree-item value="src/app.ts">app.ts</pct-tree-item>
  </pct-tree-item>
</pct-tree>
```

## Contract

|             |                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | `selected` — a model of the chosen item's `value` (`string \| null`), written by Enter, Space, a click, or the application's own hand                                     |
| **Inputs**  | `ariaLabel` on `pct-tree` (optional — a nameless tree is legal, and a default would guess the hierarchy); per item: `value` (required), `expanded` (model, branches only) |
| **Outputs** | the two models' change emitters — nothing else happens to a map of files                                                                                                  |
| **Slots**   | the items (nested in the tree and in each other — the two-slot projection pulls nested items into the branch's `role="group"`, everything else is the label)              |
| **Parts**   | `label` (the row), `arrow` (the disclosure chevron — reserved on every row, drawn on branches)                                                                            |
| **Tokens**  | the `--pct-tree-*` prefix plus four entries in `contrast.policy.json`; the name dictionary grew the property `indent`                                                     |
| **Strings** | **none** — the fifth component adding nothing to `PCT_TEXTS`: every word is the consumer's, and the fold state is `aria-expanded`, which a reader says itself             |

**The walk.** Up/Down over visible rows, Home/End to the ends, inline-forward opens a
branch and steps into it, inline-back closes and climbs — the pair swapping under RTL by
the **computed direction at the keypress**, not a flag. Enter and Space choose. A click
chooses too, and on a branch it also folds (the file explorer's one gesture); the press
stops at the item, because a treeitem stands inside its ancestors and one click must not
select the lineage.

**Collapsed is hidden, not gone.** A folded group is `hidden="until-found"` with the
tabs' `@supports` fallback carried whole (0045): find-in-page still searches it and
`beforematch` opens the branch. An `@if` would have been wrong twice — a destroyed
subtree forgets its own `expanded`, and text not in the document cannot be found.

## Parts

| part    | what it is                              |
| ------- | --------------------------------------- |
| `label` | a node's text, the row that is selected |
| `arrow` | the toggle that expands a branch        |

## Theming

```css
[data-theme='brand'] {
  --pct-tree-label-bg-selected: #0f766e;
  --pct-tree-label-fg-selected: #ffffff;
  --pct-tree-arrow-fg: #0f766e;
}
```

## Keyboard map

| key                     | effect                                            | test                                                                                  |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`     | enters at the roving item / leaves the whole tree | `apps/sandbox-e2e/src/tree.spec.ts` — "one tab stop"                                  |
| `ArrowDown` / `ArrowUp` | next / previous visible row                       | `tree.spec.ts` — "the arrows walk visible rows" (and unit, `tree.spec.ts` in the lib) |
| `ArrowRight` (LTR)      | opens a closed branch; steps into an open one     | the same case; the RTL swap: `apps/sandbox-e2e/src/rtl.spec.ts`                       |
| `ArrowLeft` (LTR)       | closes an open branch; otherwise climbs           | the same two cases                                                                    |
| `Home` / `End`          | first / last visible row                          | `tree.spec.ts` — both readings                                                        |
| `Enter` / `Space`       | chooses the row under focus                       | `tree.spec.ts` — "Enter chooses"; Space in the unit suite                             |

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/tree/src/tree.ts`                                                                                                                                                                            |
| Keyboard map tested key by key                             | the table above — every row has a three-engine reading, the RTL swap its own                                                                                                                                  |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/tree` in `SBX_ROUTES`                                                                                                                                                 |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `tree-project` and `tree-project-rtl`                                                                                                                                 |
| `forced-colors: active` — no state carried by colour alone | `libs/components/tree/src/tree-item.scss` — the chosen row in `Highlight`/`HighlightText` (the aria state made visible), the arrow in `CanvasText`. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts` |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                             |
| Touch target ≥ 24×24 px outright                           | `libs/components/tree/src/tree-item.scss` — `min-block-size: var(--pct-tree-label-target-min)` on every row (`lesson-139`'s floor, applied at design time this once)                                          |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: rows are typography plus a target floor, not controls on the shared axis                                                                                                                    |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                        |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `apps/sandbox-e2e/src/rtl.spec.ts` — the indent mirrors (a logical padding) and the WALK swaps its inline pair under real keys. The screenshot: `tree-project-rtl`                                            |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/tree` in `SBX_ROUTES`                                                                                                                                            |
| Forms                                                      | not applicable — `selected` is a UI model, not a form value; a form that wants it binds it itself                                                                                                             |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `label`, `arrow`                                                                                                                                                        |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — the chosen pair (AA), the chosen fill against the page (UI error), the hover lift and the arrow (UI warn); `libs/tokens/tokens.snapshot.md`                          |
| Strings through `PCT_TEXTS`                                | not applicable — the component draws no text of its own                                                                                                                                                       |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./tree` on `./core` and `./icon`                                                                                                                                        |
| A screen-reader test log                                   | none — gap: the same one every component here has. The question for the log: that the tree announces item counts and levels from structure alone, and that a folded branch's children are not spoken          |
| A docs page with live examples                             | `apps/sandbox/src/app/views/tree/` (the sandbox view). The published site: `/components/tree` — prerendered, the demo's own source is the code tab (2.1.7)                                                    |
| Unit + mutation                                            | `libs/components/tree/src/tree.spec.ts` — 21 cases; `libs/components/mutation.snapshot.md` — `tree.ts` measured in the day's shared full run                                                                  |

## Decisions this component implements

[0056](../decisions/0056-a-tree-is-a-walk-the-platform-does-not-have.md) (the main one —
why the walk is the component, who owns which state, the measured structure),
[0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md) (the
until-found arrangement, carried whole),
[0048](../decisions/0048-a-pagination-owns-its-page-number.md) (the ownership line
`selected` walks),
[0013](../decisions/0013-no-headless-split.md) (tokens as the whole styling contract).

## Known limitations

- **The walk is the library's third private movement machinery** (the select's list, the
  menu's walk, now this). `lesson-21` said "before the second"; the extraction into
  `core` now has three consumers waiting, recorded against the plan's behaviour-layer
  item.
- **No typeahead.** It arrives WITH that extraction, not as a fourth private copy.
- **Single-select only.** `aria-multiselectable` is an announcement model of its own; a
  decision of its own the day a real application asks.
- **No async loading.** `aria-busy` on a loading branch is 0037 at a hierarchy — its own
  future record.
- **No drag, no virtualization.** Application machinery; the second is 1.2's problem.
