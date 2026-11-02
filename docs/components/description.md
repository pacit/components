# `PctDescriptionList` — terms and their values, on the platform's `<dl>`

**Summary:** The details of one thing as rows of a term and its value — a property and its reading, a setting and the control that changes it — on the platform's description list.
**Entrypoint:** `@pacit/components/description`
**Selectors:** `dl[pctDescriptionList]`, `div[pctDescription]`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** a native `<dl>` — the platform's `term` and `definition` roles, which
the pair writes as `<dt>` and `<dd>` itself. Named in the class JSDoc.

**A pair writes its own elements.** Each row is a `div[pctDescription]`, the one wrapper a
`<dl>` may hold, and it writes the `<dt>` around `[pctDescriptionTerm]`, a `<dd>` around the
value and a `<dd>` around `[pctDescriptionControl]` — in the order the platform reads a pair in,
whatever order the consumer wrote the slots in. A row with no control leaves that `<dd>` empty,
and an empty one takes no room and says nothing
([0110](../decisions/0110-a-frame-is-three-parts-the-application-arranges.md)).

**The control is named by the term.** `termId`, exported as `pctDescription`, is the `<dt>`'s
`id`: bind it to the control's `ariaLabelledby` and a reader calls the switch by the property it
switches.

**No breakpoint.** A row holds the term at its width and the value beside it while it can, and
wraps the value under the term when the row is narrower than the term and the value's floor —
the row decides by its own width, in a side panel as on a whole page.

## Usage

```html
<dl pctDescriptionList>
  <div pctDescription>
    <span pctDescriptionTerm>Supply temperature</span>
    21.4 °C
  </div>
</dl>
```

## Contract

|             |                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — the values are the consumer's text; a unit is part of it, formatted by `pctNumber` or by hand                 |
| **Inputs**  | none                                                                                                                 |
| **Outputs** | none — a control is the consumer's                                                                                   |
| **Slots**   | `div[pctDescription]` in the list; in a pair `[pctDescriptionTerm]`, the value by default, `[pctDescriptionControl]` |
| **Parts**   | `term`, `value`, `control`                                                                                           |
| **Harness** | `PctDescriptionListHarness`, `PctDescriptionHarness`                                                                 |
| **Tokens**  | the `--pct-description-*` prefix plus three entries in `contrast.policy.json`                                        |
| **Strings** | none — every word is the consumer's                                                                                  |

```html
<div pctDescription #heating="pctDescription">
  <span pctDescriptionTerm>Heating</span>
  On
  <pct-switch pctDescriptionControl [ariaLabelledby]="heating.termId" [(checked)]="on" />
</div>
```

## Parts

| part      | what it is                                            |
| --------- | ----------------------------------------------------- |
| `term`    | the `<dt>` of the pair                                |
| `value`   | the `<dd>` of the value                               |
| `control` | the `<dd>` of the control, empty and hidden when none |

## Theming

```css
[data-theme='brand'] {
  --pct-description-term-fg: #115e59;
  --pct-description-term-width: 16rem;
}
```

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: the list handles no key; a control in a pair answers the keyboard on its
own, as its own card says.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/description/src/description.ts`                                                                                                                          |
| Keyboard map tested key by key                             | not applicable — no handler; the control in a pair is the consumer's                                                                                                      |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/frame` in `SBX_ROUTES`                                                                                                            |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `frame-app` and `frame-app-rtl`                                                                                                   |
| `forced-colors: active` — no state carried by colour alone | `libs/components/description/src/description.scss` — the line between rows `CanvasText`; the list has no state. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts` |
| `prefers-reduced-motion` — duration from a token           | not applicable — the list moves nothing                                                                                                                                   |
| Touch target ≥ 24×24 px outright                           | not applicable — the list's targets are the consumer's controls                                                                                                           |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a row is text, sized by its content and the spacing scale                                                                                               |
| Density axis                                               | `libs/tokens/src/component.description.json` — the padding and the gap stand on `space.3` and `space.5`, which the compact scope re-points                                |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot `frame-app-rtl`, where the term stands at the right                                                       |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/frame` in `SBX_ROUTES`                                                                                                       |
| Forms                                                      | not applicable — the list holds no value; a control in it carries its own form contract                                                                                   |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — the three parts above                                                                                                               |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — the value and the term (AA error), the line between rows (UI warn); `libs/tokens/tokens.snapshot.md`                             |
| Strings through `PCT_TEXTS`                                | not applicable — the component writes no word of its own                                                                                                                  |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./description` row                                                                                                              |
| Screen-reader log                                          | none — gap: the readers' walk of `/frame` is not recorded yet                                                                                                             |
| A docs page with live examples                             | `apps/sandbox/src/app/views/frame/` (the sandbox view). The published site: `/components/description`, its demos' source in the code tab                                  |
| Unit + mutation                                            | `libs/components/description/src/description.spec.ts`; `libs/components/mutation.snapshot.md` — `description.ts`, measured by a narrow run                                |

## Decisions this component implements

[0110](../decisions/0110-a-frame-is-three-parts-the-application-arranges.md) (the main one —
the pair that writes its own `<dt>` and `<dd>`, the control named by the term, the wrap without
a breakpoint),
[0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md) (no breakpoint in the
library).

## Known limitations

- **One value per term.** HTML allows several `<dd>` for one `<dt>`; the pair writes one value
  and one control. Two values are one value of the consumer's two lines.
- **The terms line up by a width, not a column.** `--pct-description-term-width` is the term's
  basis: a term longer than it wraps inside its own width rather than widening every row.
- **The control's name is the consumer's binding.** `termId` has to be passed to the control's
  `ariaLabelledby`; a control without a name is a control the axe audit finds, not this list.
- **A pair outside a `<dl>` warns in dev mode**, and draws a `<dt>` the platform reads as no
  term at all.
