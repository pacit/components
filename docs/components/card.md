# `PctCard` — a header, a body and a footer

**Summary:** A box for one thing on a dashboard: a title, a subtitle, an icon and actions above, anything in the body, and a footer that stays at the bottom. The whole card can be one link.
**Entrypoint:** `@pacit/components/card`
**Selectors:** `pct-card`, `[pctCardTitle]`, `[pctCardSubtitle]`, `a[pctCardLink]`, `[pctCardControl]`
**Status:** released
**Category:** Layout & theming
**ARIA APG pattern:** none — the APG has no pattern for a card. The card writes no role; its
heading is the consumer's, at the level the page's outline needs, and a card that is one link
is the consumer's `<a>` in that heading. Named in the class JSDoc.

**A box, not a landmark.** `pct-card` paints an edge round the surface and lays out three
regions: the header (an icon, the title with its subtitle, the actions), the body, and the
footer (a note and its own actions), pushed to the end of the card so the cards of a row stand
at one height with their footers on one line. A region nothing was projected into takes no
room. The title and the subtitle are the consumer's elements, each dressed by a component of
its own, because projected content keeps the encapsulation of the template that declared it.

**One link, by the title.** `a[pctCardLink]` in the title stretches its box over the card, so
a press anywhere on the card is a press on that anchor, and a middle click, Ctrl with a click
and the context menu do what a link does. The actions of the header and the footer stand over
it and answer on their own; a control written in the body takes `pctCardControl`. Measured in
three engines against a script that forwards the click and against a body raised over the link
([0109](../decisions/0109-a-card-is-one-link-by-its-title-and-its-controls-stand-over-it.md)).

**Three states, none of them a veil.** `loading` draws the skeleton in place of the body and
marks the card `aria-busy`; `error` draws its message there with the danger icon; `muted`
repaints the card on the skin's disabled surface in its muted text and leaves every control working. The header and
the footer stay in each.

## Usage

```html
<pct-card>
  <h3 pctCardTitle><a pctCardLink routerLink="/devices/heat-pump">Heat pump</a></h3>
  <p pctCardSubtitle>Utility room</p>
  <p>21.4 °C</p>
  <span pctCardFooter>Updated a moment ago</span>
</pct-card>
```

## Contract

|             |                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**   | none — a card holds no value                                                                                                                                                   |
| **Inputs**  | `loading` (boolean), `error` (`string \| null`; `''` is none, and `loading` wins while both are set), `muted` (boolean) on `pct-card`                                          |
| **Outputs** | none — the link is the consumer's anchor, and the controls are the consumer's                                                                                                  |
| **Slots**   | `[pctCardIcon]`, `[pctCardTitle]`, `[pctCardSubtitle]` and `[pctCardActions]` in the header; the body by default; `[pctCardFooter]` and `[pctCardFooterActions]` in the footer |
| **Parts**   | `header`, `icon`, `heading`, `actions`, `body`, `message`, `message-icon`, `footer`, `note`, `footer-actions`                                                                  |
| **Harness** | `PctCardHarness`, `PctCardTitleHarness`, `PctCardSubtitleHarness`, `PctCardLinkHarness`, `PctCardControlHarness`                                                               |
| **Tokens**  | the `--pct-card-*` prefix plus nine entries in `contrast.policy.json`                                                                                                          |
| **Strings** | none — every word in a card is the consumer's, the error message included                                                                                                      |

**The heading is yours.** Write `pctCardTitle` on the heading the page's outline needs — `h2`
in a page of cards, `h3` under a section's `h2` — and the card takes its margins off and gives
it the card's type. A reader navigates a page of cards by those headings.

**Say why it is muted.** `muted` is a colour, the eye's alone: write the reason into the card —
"Unavailable — no answer since 06:10" in the subtitle — so a reader and a forced-colours user
get it too.

## Parts

| part             | what it is                                               |
| ---------------- | -------------------------------------------------------- |
| `header`         | the row of the icon, the heading and the actions         |
| `icon`           | the region of the consumer's icon, at the header's start |
| `heading`        | the column of the title and the subtitle                 |
| `actions`        | the region of the header's controls, at its end          |
| `body`           | the region of the body, or of the skeleton while loading |
| `message`        | the error message drawn in place of the body             |
| `message-icon`   | the danger icon beside the message                       |
| `footer`         | the row at the bottom of the card                        |
| `note`           | the region of the footer's text                          |
| `footer-actions` | the region of the footer's controls                      |

## Theming

```css
[data-theme='brand'] {
  --pct-card-border: #99f6e4;
  --pct-card-border-hover: #0f766e;
  --pct-card-radius: 16px;
}
```

## Keyboard map

| key                 | effect                                                  | test                                                                                                               |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Tab` / `Shift+Tab` | moves to the card's link, then to its controls in order | `apps/sandbox-e2e/src/card.spec.ts` — "the keyboard meets the link, then the controls, and Enter follows the link" |
| `Enter`             | on the link, follows it                                 | the same case; the following is the platform's                                                                     |

There are no handlers to map: the link is an anchor and the controls are the consumer's, and
each answers the keyboard on its own.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/card/src/card.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Keyboard map tested key by key                             | the table above — every row measured in `apps/sandbox-e2e/src/card.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/card` in `SBX_ROUTES`, the card that is one link and the three states included                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `card-grid` and `card-grid-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `forced-colors: active` — no state carried by colour alone | `libs/components/card/src/card.scss` and `card-link.scss` — the edge `CanvasText`, a muted card `GrayText`, the error a box of its own, the link's ring `Highlight`. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `prefers-reduced-motion` — duration from a token           | not applicable — the card moves nothing; the skeleton it draws while loading follows its own card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Touch target ≥ 24×24 px outright                           | not applicable — the card's targets are the consumer's controls and the link, whose box is the whole card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a card is not a control, and it is sized by its content and the spacing scale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Density axis                                               | `libs/tokens/src/component.card.json` — the padding and the gaps stand on `space.3`, `space.4` and `space.5`, which the compact scope re-points                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot `card-grid-rtl`, where the actions move to the left                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/card` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Forms                                                      | not applicable — a card holds no value a form owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — the ten parts above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — nine entries: the text, the subtitle, the footer, the muted text and the error message over their surfaces (AA error), the error icon (UI error), the edges (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                                                                                                |
| Strings through `PCT_TEXTS`                                | not applicable — the component writes no word of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./card` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Screen-reader log                                          | Read 2026-11-02 from `docs/acr/at/` — three readers, whole sandbox. **One link, named by the title, and then the controls**: Orca `Heat pump link · heading 3.`, then `Enabled · switch pressed.` and `Rename · button.`; NVDA `Heat pump, heading`, with no role word for the link, then `Enabled, switch, on` and `Rename, button`. VoiceOver reached the card's switch alone in both walks of the day (the first, which lost `/text`, was not kept), `Enabled on switch` (`8c89e2f9`), and lost the page after it; the walk of 2026-11-05 heard VoiceOver's own hint for a switch there instead, so it has not read the link |
| A docs page with live examples                             | `apps/sandbox/src/app/views/card/` (the sandbox view). The published site: `/components/card`, its demos' source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Unit + mutation                                            | `libs/components/card/src/card.spec.ts`; `libs/components/mutation.snapshot.md` — `card.ts`, measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Decisions this component implements

[0109](../decisions/0109-a-card-is-one-link-by-its-title-and-its-controls-stand-over-it.md) (the
main one — the link by the title stretched over the card, the controls standing over it, and
what the measurement chose it over),
[0095](../decisions/0095-every-component-is-mit-and-the-order-is-what-a-consumer-needs.md)
(why the card is built now),
[0096](../decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md) (a component
on the consumer's own element, for the paint).

## Known limitations

- **The text of a card that is one link cannot be selected.** A drag over it selects nothing
  and a double click follows the link, in all three engines (0109). `pctCardControl` on a
  passage takes it out of the link.
- **A control in the body needs `pctCardControl`.** Without it the control sits under the
  link's box and a press on it is the link's. A control is anything the consumer writes, so
  nothing can warn about one that was missed.
- **`pctCardControl` writes two inline declarations.** `position: relative` and `z-index: 1`
  stand on the element whether or not the card holds a link, so they override a position of
  the consumer's own, and two raised controls stack in their order in the document.
- **The card is its link's containing block.** It is `position: relative` while it holds a
  link, so an absolutely positioned child of the card is placed against the card.
- **No elevation and no media slot.** The card is a part of the page with an edge, not a sheet
  lifted over it; a picture is the consumer's element in the body.
- **NVDA does not say the link is a link.** In the walk of 2026-11-02 NVDA with Firefox read the
  focused title as `Heat pump, heading`, where Orca says `link`. The element is an `<a href>`
  in an `<h3>`, and Enter follows it; whether the stretched box changes what NVDA reads is for
  the next walk to measure against a plain link in a heading.
- **An error is not announced.** The message is drawn, not spoken: a page of cards loading
  at once would raise a `role="alert"` per card that failed. A failure the user is waiting
  for is the application's to say, with a toast or the announcer.
- **Muted is a colour.** It says nothing to a reader; the card's words must say why.
