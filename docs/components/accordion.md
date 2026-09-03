# `PctAccordion` — a stack of sections a user opens and closes

**Entrypoint:** `@pacit/components/accordion`
**Selector:** `pct-accordion` (the group) and `pct-accordion-item` (a section)
**Status:** released
**Category:** Feedback & display
**ARIA APG pattern:** [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) — named
in the class JSDoc

It implements the pattern by **not implementing it**. A section is a `<details>` with a
`<summary>`, so the press, the `expanded` state a screen reader announces, `Enter` and `Space`,
the place in the page's tab order and the browser's own find-in-page all belong to the
platform. `exclusive` is one shared `name` attribute and no code at all — the browser closes
the others. What is left for this library is the three things the element has no answer to: the
heading the pattern asks for, a way to refuse the press, and a signal to bind
([0046](../decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).

## Usage

```html
<pct-accordion>
  <pct-accordion-item label="What ships in the package?"> Standalone components, design tokens and schematics. </pct-accordion-item>
</pct-accordion>
```

## Contract

|                 |                                                                                                                                                                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `open: ModelSignal<boolean>` on each section. It is written from the element's `toggle` event and never from a guess, so a press, a programmatic change and the browser closing a sibling all arrive the same way                                                                                                             |
| **Inputs**      | group: `exclusive: boolean`, `headingLevel: 2 \| 3 \| 4 \| 5 \| 6`. Section: `label: string` (required), `open` (model), `disabled: boolean`, `ariaLabel`, `ariaLabelledby`                                                                                                                                                   |
| **Outputs**     | none — `open` is a `model`, so the change is the two-way binding                                                                                                                                                                                                                                                              |
| **Slots**       | the section's content is ordinary projection (`<ng-content />` in `pct-accordion-item`). There is **no** slot for the heading — see the limitations                                                                                                                                                                           |
| **Parts**       | `item`, `heading`, `marker`, `panel`                                                                                                                                                                                                                                                                                          |
| **Tokens**      | the `--pct-accordion-*` prefix plus five entries in `contrast.policy.json`                                                                                                                                                                                                                                                    |
| **DI contract** | `PCT_ACCORDION`, declared in `accordion.ts` so that the section imports the group and never the other way round — the tabs' channel one component over. A section resolves its group through the **element injector**, and `optional`: an item outside any group is a plain disclosure and not a defect                       |
| **Strings**     | none. Every word on the screen is the consumer's `label` or their projected content; this component prints nothing of its own, so it reads no `PCT_TEXTS` key                                                                                                                                                                 |
| **SSR**         | everything renders on the server, closed sections included: what hides one is `::details-content`, a pseudo-element, not a branch. Measured off the server's own HTML — `open=""` on the section a consumer opened and one shared `name` on an exclusive group, so the page arrives already in the state it will hydrate into |

**Why `exclusive` defaults to `false`.** That is the platform's own default — a `<details>` with
no `name` opens and closes on its own — and a library whose unset input behaves differently from
the element underneath it has taught the consumer a second set of rules for the same tag.

**Why the `name` is generated.** It is not a name anybody reads: it exists so two `<details>`
know they are siblings. Two accordions on one page that both chose `"main"` would become one
group nobody meant to make, so the group makes its own.

## Parts

| part      | what it is                                   |
| --------- | -------------------------------------------- |
| `item`    | one section: its heading and its panel       |
| `heading` | the button that opens and closes the section |
| `marker`  | the open-or-closed sign beside the heading   |
| `panel`   | the content shown while the section is open  |

## Theming

```css
[data-theme='brand'] {
  --pct-accordion-heading-fg: #134e4a;
  --pct-accordion-heading-bg-hover: #f0fdfa;
  --pct-accordion-item-border: #99f6e4;
}
```

## Keyboard map

| key                       | effect                                                         | test                                     |
| ------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `Tab`                     | one stop per heading — every section is in the page's sequence | `apps/sandbox-e2e/src/accordion.spec.ts` |
| `Enter` / `Space`         | opens or closes the focused section — the **platform's**       | `apps/sandbox-e2e/src/accordion.spec.ts` |
| `Enter` on a disabled one | nothing, because the click it arrives as is cancelled          | `apps/sandbox-e2e/src/accordion.spec.ts` |

**There is no arrow-key walk, and that is the pattern's own answer.** The APG lists `Up`/`Down`
between headers as _optional_, and lists "all focusable elements in the accordion are in the
page Tab sequence" as required — which the platform already does. A document-level key map
would be this library taking `ArrowDown` away from the page
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

| criterion                        | evidence                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc    | `libs/components/accordion/src/accordion.ts`, `libs/components/accordion/src/accordion-item.ts`                                                                                                                                                                                                                                                    |
| Keyboard map tested              | `apps/sandbox-e2e/src/accordion.spec.ts` (every row above, in three engines). There is no unit case for the keys, because there is no code to test — the browser is the implementation                                                                                                                                                             |
| The exclusive group              | `apps/sandbox-e2e/src/accordion.spec.ts` — three sections, opened one after another, each closing the last, in three engines, plus one shared `name` nobody wrote. The control is recorded rather than prepared: `[attr.name]` taken off the `<details>` leaves **3 of 36 red, one per engine**, all of them this case, and every other case green |
| The disclosure state is not ours | `apps/sandbox-e2e/src/accordion.spec.ts` and `libs/components/accordion/src/accordion.spec.ts` — the asserted **absence** of `aria-expanded`, `role` and `aria-controls` on the heading                                                                                                                                                            |
| axe audit                        | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/accordion` view, LTR and RTL, with all five demos of the sandbox on the page at once (open, exclusive, disabled, an `h4` level and a lone section)                                                                                                                                                     |
| Visual screenshot                | `apps/sandbox-e2e/src/visual.spec.ts` — `accordion-stack`, with one section open and two closed, so the marker's quarter turn is a difference inside one image                                                                                                                                                                                     |
| `forced-colors: active`          | `apps/sandbox-e2e/src/forced-colors.spec.ts` — `CanvasText` on an ordinary heading, `GrayText` on a refused one, and the marker the same colour as the row it stands in, which it is only because the sheet hands its `color` back in this mode. The one state the mode cannot flatten is whether a section is open: the platform announces it     |
| `prefers-reduced-motion`         | `libs/components/accordion/src/accordion-item.scss` — the only transitions are `color` and the marker's `rotate` over `--pct-motion-transition-duration`, and the preference is answered by the token build (`req-a11y-motion`)                                                                                                                    |
| Touch target ≥ 24×24 px          | `apps/sandbox-e2e/src/accordion.spec.ts` — every heading row's box measured outright; the floor is `--pct-accordion-heading-target-min` on the row itself, so what a finger gets is what an eye sees                                                                                                                                               |
| Size axis                        | none — deliberately: a section heading is not a control with a height. `req-api-size` is about `--pct-control-height-*`, and a heading row takes its height from the type and the padding, which a skin moves through the tokens                                                                                                                   |
| Density axis                     | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                             |
| RTL                              | `apps/sandbox-e2e/src/accordion.spec.ts` — the marker measured on the far side of the row in both directions, with the direction inherited from the document rather than written on the group                                                                                                                                                      |
| SSR + hydration                  | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/accordion` view renders and hydrates with no `NG05xx`. Every section is in the server's HTML, hidden by a pseudo-element rather than by a branch                                                                                                                                                  |
| Forms                            | none — deliberately: an accordion is not a form control. It holds no value a form owns and implements no `FormValueControl`                                                                                                                                                                                                                        |
| A closed section is findable     | `apps/sandbox-e2e/src/accordion.spec.ts` — `::details-content` computes `content-visibility: hidden` closed and `visible` open, and the text inside answers `checkVisibility() === false`, in three engines                                                                                                                                        |
| The heading is a real heading    | `apps/sandbox-e2e/src/accordion.spec.ts` — the accessible tree read off the DOM (`heading … [level=3]`, `[level=4]`) plus the tag name; `libs/components/accordion/src/accordion.spec.ts` for all five levels and the fallback outside a group ([`lesson-127`](../lessons.md#lesson-127))                                                          |
| The press can be refused         | `libs/components/accordion/src/accordion.spec.ts` — `defaultPrevented` both ways; `apps/sandbox-e2e/src/accordion.spec.ts` for the pointer and `Enter` in three engines ([`lesson-128`](../lessons.md#lesson-128))                                                                                                                                 |
| Parts in the inventory           | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                |
| Tokens + `contrast.policy.json`  | `libs/tokens/src/contrast.policy.json` — five entries. The line between sections is `warn` and says why: a separator is not what identifies a control or its state, and here the state is not drawn at all                                                                                                                                         |
| Strings through `PCT_TEXTS`      | none — deliberately: the component prints no string of its own, so there is no key to route. `tools/check-texts.mjs` reads its templates all the same                                                                                                                                                                                              |
| Size budget                      | `libs/components/size.snapshot.md` — the `./accordion` row                                                                                                                                                                                                                                                                                         |
| Screen-reader log                | none — gap. The same one the dialog, the select, the toast and the tabs have. The question it would answer here is specific: what a reader says about a `DisclosureTriangle` that has a heading inside it                                                                                                                                          |
| docs page                        | `/components/accordion` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                         |

## Decisions

[0046](../decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)
(the main one — what the platform gives, the three things left over, and why nothing animates),
[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (which is why
there is no `aria-expanded` and no `Enter` handler: the element publishes both),
[0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md) (the same
promise about hidden content, kept here by the platform rather than by an attribute of ours),
[0011](../decisions/0011-icons.md) (the marker is a `pct-icon`, so a consumer can replace the
chevron without replacing the component),
[0013](../decisions/0013-no-headless-split.md) (no base class; what little behaviour there is
stays in the component)

## Known limitations

- **Nothing animates but the marker.** Growing a panel from nothing to `auto` needs
  `interpolate-size: allow-keywords`, and that is chromium's alone — measured `false` in
  firefox and webkit. A height animated in one engine of three is a different component in
  different browsers, so the open and close are instant everywhere, which is what the element
  does on its own.
- **A heading is a string, not a slot.** No icon, no count badge, no second line. A slot would
  be a second public directive and a second thing to type, and the first component to want one
  cannot tell a shared property from an accident of the only case — the tabs' reasoning, one
  component over.
- **Every section's content is rendered, always.** That is the price of a closed section being
  text in the document rather than a branch. A consumer whose section is expensive wraps their
  own content in an `@defer` or an `@if` — which this component cannot do for them without
  taking the text back out.
- **A disabled section that is open stays open.** Refusing the press is all `disabled` does,
  and there is nothing else it could do without closing a section the consumer chose to show.
- **`exclusive` cannot be undone by the consumer's own `name`.** The group generates one and
  binds it; a `name` written on the tag would be overwritten. Two sections in different groups
  are two `<pct-accordion>` elements, which is what they are anyway.
- **No `role="region"` on the panels.** The APG offers it and warns about landmark
  proliferation in the same paragraph. The platform already publishes each section as a
  `group`, so the offer is declined — a consumer who wants a landmark for one long section can
  put one inside their own content.
