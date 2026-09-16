# `PctChips` / `PctChip` — a row of chosen values the user can take back

**Summary:** A row of chosen values the reader can take back, one cross at a time.
**Entrypoint:** `@pacit/components/chips`
**Selector:** `pct-chips` / `pct-chip`
**Status:** released
**Category:** Choices
**ARIA APG pattern:** none — there is no APG pattern for chips, and this component does not
invent one ([0051](../decisions/0051-chips-are-a-list-the-user-shortens.md)). What there is:
[`list` / `listitem`](https://www.w3.org/TR/wai-aria-1.2/#list) for the count a screen reader
owes its user first, and a real `<button>` for every removal. Named in the class JSDoc.

The whole component is one addition to the platform: **where focus goes when the button under
it disappears.** Removing the focused control drops `activeElement` on `<body>` in all three
engines — measured before anything was written — so the row repairs it: the next chip's
cross, the previous ones as a fallback, and Enter, Enter, Enter empties the row with no Tab
between them.

## Usage

```html
<pct-chips ariaLabel="Filters">
  <pct-chip removable (removed)="drop('Angular')">Angular</pct-chip>
</pct-chips>
```

## Contract

|             |                                                                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — the collection is the application's. A chip row is a projection of somebody else's array, and `removed` is an announcement the consumer answers by shortening it (or does not, and the chip is correct to stand still)                        |
| **Inputs**  | `pct-chips`: `ariaLabel` (`string`, default `''` — a list may be nameless, and a library default would guess at the content), `size` (`PctSize`, from `PCT_CONFIG`); `pct-chip`: `removable` (`boolean`, default `false`)                            |
| **Outputs** | `pct-chip`: `removed` (`void` — the value is in the consumer's own `@for` scope)                                                                                                                                                                     |
| **Slots**   | `pct-chips`: the chips; `pct-chip`: the label — projected, never generated                                                                                                                                                                           |
| **Parts**   | `label` (the projected value), `remove` (the button that takes it back). The row has no parts of its own: the host **is** the list, and the gap is its whole drawing                                                                                 |
| **Harness** | `PctChipsHarness`, `PctChipHarness`                                                                                                                                                                                                                  |
| **Tokens**  | the `--pct-chips-*` prefix plus four entries in `contrast.policy.json`                                                                                                                                                                               |
| **Strings** | `chipRemove` — the cross's accessible name, a key of its own rather than the toast's `toastDismiss` or the dialog's `dialogClose`: "remove" is what happens to a chosen value, and a language that spells the three apart has nowhere else to say so |

**Why removal is not an act.** The pager owns the one number the platform has nothing for
([0048](../decisions/0048-a-pagination-owns-its-page-number.md)); a chip owns one notch less —
nothing but the announcement, because even its text is projected. A `removed` the consumer
ignores removes nothing, which is what a confirmation dialog or an undo window looks like from
here.

**Why there is no selectable chip.** A filter the user toggles is a checkbox in different
clothes, and the state the platform publishes is not ours to write
([0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)). The
library's own selection controls are one entrypoint over.

**Why there is no disabled remove button.** A control drawn where it cannot be used is a
promise struck through. A chip that must stay keeps `removable` off and shows no button at
all; the focus repair steps over it.

## Parts

| part     | what it is                          |
| -------- | ----------------------------------- |
| `label`  | a chip's text                       |
| `remove` | the button that takes the chip back |

## Theming

```css
[data-theme='brand'] {
  --pct-chips-item-bg: #ccfbf1;
  --pct-chips-item-fg: #134e4a;
  --pct-chips-item-border: #99f6e4;
}
```

## Keyboard map

| key                 | effect                                           | test                                                                                                                         |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | moves between the remove buttons, document order | `apps/sandbox-e2e/src/chips.spec.ts` — the pinned chip costs nothing to step over, because there is nothing in it to stop at |
| `Enter` / `Space`   | presses the remove button                        | `apps/sandbox-e2e/src/chips.spec.ts` — and focus lands on the next cross, in three engines                                   |

Both rows are the platform's: the component ships **zero key handlers** — no `Delete`, no
arrows, no roving `tabindex` ([`req-api-platform`](../requirements/api.md#req-api-platform)).
The serial-removal behaviour Material builds a grid pattern for is delivered here by the
repair alone.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/chips/src/chips.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Keyboard map tested key by key                             | `apps/sandbox-e2e/src/chips.spec.ts` — Tab order and Enter, plus the map's one addition: where focus stands after each press                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/chips` in `SBX_ROUTES`, so the WCAG 2.2 AA sweep takes it. An empty `role="list"` was probed against the audit in three engines before the role was made static — zero violations, which is why there is no machinery for the empty row                                                                                                                                                                                                                                                                                                                   |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `chips-sizes` and `chips-sizes-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `forced-colors: active` — no state carried by colour alone | `libs/components/chips/src/chip.scss` — the pill's inside is one step of the ramp and disappears with the mode; the boundary rides on the border (`CanvasText`), the cross takes `ButtonText`, hover answers in `Highlight`/`HighlightText`. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                            |
| `prefers-reduced-motion` — duration from a token           | not applicable — the component has no motion at all: no transition, no loop, so the preference has nothing to slow                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Touch target ≥ 24×24 px outright                           | `apps/sandbox-e2e/src/chips.spec.ts` — the cross clears 24×24 at every size of the row: `--pct-chips-remove-target-min` is `{pct.target.min}` outright, so at `sm` the 24 px button stands inside a 28 px pill and the pill, not the button, is what looks small                                                                                                                                                                                                                                                                                                                                  |
| Size axis aligned to `--pct-control-height-*`              | `libs/tokens/src/component.chips.json` — `item-height` IS the control axis, so a row of chips lines up with a field of the same size by definition; `apps/sandbox-e2e/src/chips.spec.ts` reads 28/36/44 off the pills                                                                                                                                                                                                                                                                                                                                                                             |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `libs/components/chips/src/chip.scss` — flex order and a logical gap place both the row and the cross, with not one physical property. The geometry: `apps/sandbox-e2e/src/rtl.spec.ts` (first chip on the right, every cross on its label's left); the screenshot: `chips-sizes-rtl`                                                                                                                                                                                                                                                                                                             |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/chips` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Forms                                                      | not applicable — the row holds no value a form owns: the collection lives in the application, and the input-chips variant (values typed into a combobox) is the select family's road on the day it is walked                                                                                                                                                                                                                                                                                                                                                                                      |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` — the **Parts** row above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — four entries: the label (AA error), the cross at rest and under hover (UI error — a functional drawing owes the non-text floor), the pill's edge (UI warn, with the reason written beside it); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                                          |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `chipRemove`; the swap is a unit case (`providePctTexts` renames the cross)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./chips` **10600 B** on `./core` and `./icon`. The one new string costs `./core` +20 B, fanned out to every entrypoint that carries it — and `./skeleton` stands unmoved at 2997 B, being the one component entrypoint that carries no `./core`                                                                                                                                                                                                                                                                                                             |
| Screen-reader log                                          | Read 2026-09-16 from `docs/acr/at/` — three readers, whole sandbox, and **it contradicts the reasoning written in `chip.html`**. That comment says the cross carries `texts().chipRemove` as its only name, "WHAT it removes being said by the label beside it in the same listitem". No reader said it. Orca gives `Remove · button.` at every one of five chips, NVDA `Remove, button`, VoiceOver `Remove button list Active filters 5 items` — the LIST is named, the chip is not. The named list and the item count do arrive in all three. Open as a product question, not an instrument one |
| A docs page with live examples                             | `apps/sandbox/src/app/views/chips/` (the sandbox view). The published site: `/components/chips` — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Unit + mutation                                            | `libs/components/chips/src/chips.spec.ts` — 25 cases; `libs/components/mutation.snapshot.md` — `chips.ts` at **90.74**, 49 killed with zero clock-kills, and all five survivors named: `isDevMode()` forced true (the fourth component in a row), reversing the whole order instead of the predecessors (unreachable difference — the prefix of the walk is dead wherever it decides), `above?.` on a parent no document can null, and the two token labels, which are debug strings                                                                                                              |

## Decisions this component implements

[0051](../decisions/0051-chips-are-a-list-the-user-shortens.md) (the main one — which of the
four things called "chip" this is, why the roles are the platform's list, why removal is an
announcement, and the three-way verdict the focus repair reads),
[0048](../decisions/0048-a-pagination-owns-its-page-number.md) (the ownership split this
component takes one notch further),
[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (why there is
no selectable chip),
[0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md) (the role
declared on the element that is actually there — `pct-tab`'s move),
[0013](../decisions/0013-no-headless-split.md) (parts and tokens as the whole styling
contract).

## Known limitations

- **No focus placement when the row empties.** The last removal has no surviving cross to
  land on, and the component cannot know what the page wants focused then — the heading above
  the list, the input beside it. The consumer who removed the last value is the one who knows
  what stands next to the row.
- **The repair stands for one render.** A removal the consumer performs seconds later, behind
  a confirmation, moves no focus: the user has navigated away, and yanking focus back would
  be the repair causing the defect it exists to prevent.
- **A wrapped chip is outside the repair's map.** The row holds only its own children — a
  chip inside an extra element is a `listitem` whose `list` is not directly above it, which
  is broken ARIA before it is a repair problem. A dev-mode warning names it at first render.
- **No `Delete`, no arrows, no roving `tabindex`.** There is no APG pattern for chips, and
  the library does not invent keyboard grammars; Tab and Enter reach everything, and the
  repair makes serial removal cheap.
- **No input-chips.** Values typed into a combobox and kept as tokens are the select family's
  road; this component renders values chosen elsewhere.
