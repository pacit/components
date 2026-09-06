# `PctDrawer` — a panel docked to an edge of the window that the page works around

**Summary:** A panel docked to an edge of the window that the page makes room for instead of disappearing under.
**Entrypoint:** `@pacit/components/drawer`
**Selector:** `pct-drawer` (the panel) and `button[pctDrawerTrigger]` (the control that opens it)
**Status:** released
**Category:** Overlays
**ARIA APG pattern:** [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) — named
in the class JSDoc

It is the one place in this library where that pattern has to be **written** rather than taken.
The accordion showed a disclosure is the platform's, on one condition: `<summary>` has to be the
first child of the `<details>` it opens
([0046](../decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
A drawer's button is in the header bar and its panel is at the edge of the window, so the two are
apart and no element expresses them — what is left is `aria-expanded` on somebody else's button,
`aria-controls` pointing at the panel, and a panel that is hidden without being gone
([0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)).

**It is not an overlay, and that is the whole design.** The panel is drawn where the consumer
wrote it, so the tab order, the theme, the writing direction and the stacking context are the
page's own. It is the "place to park" that
[0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md) named and handed here.

## Usage

```html
<button pctButton [pctDrawerTrigger]="nav">Sections</button> <pct-drawer #nav heading="Sections">…</pct-drawer>
```

## Contract

|             |                                                                                                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | `open: ModelSignal<boolean>`. Both directions are ordinary: an application opens it, and the drawer shuts itself on Escape, on its own cross, on a second press of the trigger and on a `beforematch` it answers by opening                                                                           |
| **Inputs**  | `side: 'start' \| 'end' \| 'top' \| 'bottom'` (default `start`), `heading: string`, `ariaLabel`, `ariaLabelledby`, `closeButton: boolean` (default `true`), `closeOnEscape: boolean` (default `true`), `open` (model). The trigger takes one required input: the `pct-drawer` itself                  |
| **Outputs** | `closed: PctDrawerCloseReason` — `escape`, `close`, `trigger` or `api`. `open` carries a state; a withdrawal is not one                                                                                                                                                                               |
| **Slots**   | the content is ordinary projection (`<ng-content />`). The heading is a string, not a slot — the accordion's reasoning, one component over                                                                                                                                                            |
| **Parts**   | `header`, `heading`, `close`, `content`                                                                                                                                                                                                                                                               |
| **Harness** | `PctDrawerHarness`, `PctDrawerTriggerHarness`                                                                                                                                                                                                                                                         |
| **Tokens**  | the `--pct-drawer-*` prefix plus five entries in `contrast.policy.json`                                                                                                                                                                                                                               |
| **Strings** | `drawerClose` — the accessible name of the cross, and the only string this component prints                                                                                                                                                                                                           |
| **SSR**     | everything renders on the server, a shut drawer included: what hides one is `hidden="until-found"` and a `content-visibility` the browser applies, not a branch. So the page arrives with its navigation already in the markup — which is the point of a shut drawer still being text in the document |

**Why the trigger is a directive on the consumer's own `<button>`.** `aria-expanded` belongs to
the control — it is what a screen reader reads when the user arrives at the button — and a
component that wrote it into an element somewhere else in the template would be reaching into
markup it does not own. The selector demands a `<button>`, because a disclosure is a press and
the element that already means "a press" brings the role, the keyboard and the disabled state
with it ([`req-api-platform`](../requirements/api.md#req-api-platform)).

**Why `aria-controls` is written whether the drawer is open or not** — the opposite of the
popover's rule, and for the opposite reason. A popover's panel does not exist while it is shut,
so pointing at it would be a reference into the void; a drawer's panel is always in the
document, and an id that resolves is what lets a screen reader offer the panel from the button.

**Why the consumer's `id` wins.** `panelId` reads the tag's own `id` at construction and
generates one only when there is none. The attribute is on the tag the consumer typed, and a
host binding that overwrote it would silently break every other reference in their page.

**Where focus goes back to.** To the control that **pressed it open**, not to "the trigger": a
drawer may be opened from the header bar and from a link in the footer, and 0031 had to report
that ambiguity in dev mode because a popover has one trigger. Here there is nothing to report.
And it goes back **only if focus was inside** — the page behind is live, so a user who has
already clicked into it must not be pulled out.

## Parts

| part      | what it is                                       |
| --------- | ------------------------------------------------ |
| `header`  | the row holding the heading and the close button |
| `heading` | the title the drawer is named by                 |
| `close`   | the close button                                 |
| `content` | the projected body                               |

## Theming

```css
[data-theme='brand'] {
  --pct-drawer-panel-bg: #f0fdfa;
  --pct-drawer-panel-fg: #134e4a;
  --pct-drawer-heading-fg: #0f766e;
}
```

## Keyboard map

| key                    | effect                                                                   | test                                  |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `Tab`                  | walks in and out of the panel in document order — nothing is spliced     | `apps/sandbox-e2e/src/drawer.spec.ts` |
| `Enter` / `Space`      | on the trigger: opens or shuts it — the **platform's**, off a `<button>` | `apps/sandbox-e2e/src/drawer.spec.ts` |
| `Escape` inside        | shuts it, and gives the keyboard back to the control that opened it      | `apps/sandbox-e2e/src/drawer.spec.ts` |
| `Escape` anywhere else | nothing — the key stays the page's                                       | `apps/sandbox-e2e/src/drawer.spec.ts` |

**There is no focus trap and no arrow-key walk.** Both would make this a modal, which it is not:
a panel the user is expected to leave and come back to has to let them leave.

## Checks

| criterion                             | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc         | `libs/components/drawer/src/drawer.ts`, `libs/components/drawer/src/drawer-trigger.ts`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Keyboard map tested                   | `apps/sandbox-e2e/src/drawer.spec.ts` (every row above, in three engines), plus `libs/components/drawer/src/drawer.spec.ts` for the two Escape branches and the shut-drawer case that must not swallow the key                                                                                                                                                                                                                                                                                                      |
| The tab order is the page's           | `apps/sandbox-e2e/src/drawer.spec.ts` — Tab from the trigger reaches the cross, the links, and then the page beyond, with no handler run and nothing trapping                                                                                                                                                                                                                                                                                                                                                       |
| The page behind stays live            | `apps/sandbox-e2e/src/drawer.spec.ts` — zero `[inert]` in the document, the root's `overflow` unchanged from before the open, and a control outside the panel still taking a press. The dialog's opposite, measured rather than asserted                                                                                                                                                                                                                                                                            |
| The theme comes down the tree         | `apps/sandbox-e2e/src/drawer.spec.ts` — the drawer resolves `closest('[data-theme]')` to the demo card's own stage and paints that stage's surface. `lesson-35` read as an absence: nothing was moved, so nothing had to be patched back                                                                                                                                                                                                                                                                            |
| axe audit                             | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/drawer` view, LTR and RTL                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Visual screenshot                     | `apps/sandbox-e2e/src/visual.spec.ts` — `drawer-docked`, of the **viewport** and not of a card: what a drawer looks like is a relation between the panel and the window — the sandbox's navigation blanked by the stage, so a row in that list is not a pixel here (plan 4.23)                                                                                                                                                                                                                                      |
| `forced-colors: active`               | `apps/sandbox-e2e/src/forced-colors.spec.ts` — `Canvas` on the panel, `CanvasText` on the docked edge, the heading and the cross. There is no veil here, so the border is the whole of what says where the panel stops                                                                                                                                                                                                                                                                                              |
| `prefers-reduced-motion`              | `libs/components/drawer/src/drawer.scss` — the only transition is the inset over `--pct-motion-transition-duration`, and the preference is answered by the token build (`req-a11y-motion`). The leave waits out exactly what that token says, through `pctAfterTransition`                                                                                                                                                                                                                                          |
| Touch target ≥ 24×24 px               | `--pct-drawer-close-size` is `--pct-target-min`, so the cross's box is the floor outright — the dialog's rule, one component over                                                                                                                                                                                                                                                                                                                                                                                   |
| Size axis                             | none — deliberately: a drawer is not a control with a height. `req-api-size` is about `--pct-control-height-*`; the panel's measure is `--pct-drawer-panel-width` / `-height`, which a skin moves                                                                                                                                                                                                                                                                                                                   |
| Density axis                          | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                                                                                              |
| RTL                                   | `apps/sandbox-e2e/src/drawer.spec.ts` — a `start`-docked drawer flush with the left edge in LTR and with the right edge under `dir="rtl"`, off one value. The slide is a transition of the **inset** rather than of a transform, which is why it mirrors with no rule of its own                                                                                                                                                                                                                                    |
| SSR + hydration                       | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/drawer` view renders and hydrates with no `NG05xx`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Forms                                 | none — deliberately: a drawer is not a form control. It holds no value a form owns and implements no `FormValueControl`                                                                                                                                                                                                                                                                                                                                                                                             |
| A shut drawer is findable             | `apps/sandbox-e2e/src/drawer.spec.ts` — `hidden="until-found"`, `content-visibility: hidden`, `display: flex`, and the content answering `checkVisibility() === false`, in three engines. `beforematch` opening the model is unit-tested                                                                                                                                                                                                                                                                            |
| A panel opened from inside it         | `apps/sandbox-e2e/src/drawer.spec.ts` — a `pct-select` in the filter drawer, its listbox hit-tested at its own centre. That is the whole reason `--pct-drawer-z-index` is 900 and not a larger number: the CDK stamps its overlay container at 1000                                                                                                                                                                                                                                                                 |
| Docked to the window, or told why not | `apps/sandbox-e2e/src/drawer.spec.ts › an ancestor with a transform catches the panel` — the demo card given a transform takes the panel's edges and the report names `<sbx-demo>` and the property, in three engines; without it the panel spans the viewport and nothing is said. `libs/components/drawer/src/drawer.spec.ts › the containing block` — the sentence whole, the reasons read off the ancestor (`transform`, `contain`, `filter`, `will-change`, none), and `<body>` named only with a reason on it |
| Parts in the inventory                | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tokens + `contrast.policy.json`       | `libs/tokens/src/contrast.policy.json` — five entries. The panel's edge is measured against the **page**, not against a veil, because there is no veil: that makes it stricter than the dialog's namesake rather than looser                                                                                                                                                                                                                                                                                        |
| Strings through `PCT_TEXTS`           | `drawerClose`, read at render time in `drawer.html`; swapped in `libs/components/drawer/src/drawer.spec.ts` through `providePctTexts`                                                                                                                                                                                                                                                                                                                                                                               |
| Size budget                           | `libs/components/size.snapshot.md` — the `./drawer` row                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Screen-reader log                     | none — gap. The same one the dialog, the select, the toast, the tabs and the accordion have. The question it would answer here is specific: whether a named `region` really is offered in a reader's landmark list while its trigger says `expanded`                                                                                                                                                                                                                                                                |
| docs page                             | `/components/drawer` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                                                                                                                                                             |

## Decisions

[0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md) (the main one
— why it is not an overlay, what that buys and what it costs),
[0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md) (which named this shape
and handed it here: a panel the user leaves and comes back to is not a popover),
[0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md) (the same
mechanism at its second component — `hidden="until-found"` and the `beforematch` that answers
it),
[0046](../decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)
(the boundary this component stands on the other side of),
[0029](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md) (the modal shape, which
is the dialog's and deliberately not this one's),
[0011](../decisions/0011-icons.md) (the cross is a `pct-icon`, replaceable without replacing the
component)

## Known limitations

- **It is not modal, and there is no input that makes it one.** No veil, no focus trap, no
  `inert` on the page behind, no scroll lock. A side sheet that must be answered before anything
  else is `pct-dialog`. The two are not one component with a flag, because everything that
  differs between them is a promise rather than a skin
  ([0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)).
- **It covers the page rather than pushing it.** An open drawer stands over whatever is under
  its edge, and a control there is out of the pointer's reach until it shuts — the keyboard
  still gets everywhere, which is what "the page behind is live" really promises. A layout that
  must stay uncovered adds the panel's own measure as padding to its container; that is one line
  of the application's CSS and would be a second layout mode here.
- **`position: fixed` means the window — unless an ancestor says otherwise.** A `transform`, a
  `filter`, `contain: paint`, `content-visibility: auto` or a `will-change` naming one of them
  on any element above the drawer makes that element the containing block, and the panel docks
  to **it** instead — `container-type` does not, whatever the first draft of this bullet said:
  the list was measured in three engines ([`lesson-163`](../lessons.md#lesson-163)). This is
  the platform's rule and not this component's, and it is the price of being drawn where the
  consumer wrote it instead of in an overlay — so the drawer cannot undo it, and what it does
  is **say it**: an open drawer whose `offsetParent` is not the window is reported in dev mode,
  with the ancestor and the property named.
- **Nothing keeps two open drawers apart.** Two panels docked to the same edge stand on top of
  each other. A group that closes its siblings is the accordion's `exclusive` one component
  over, and no case has asked for it yet.
- **No keyboard shortcut jumps into it.** A drawer at the end of the document is at the end of
  the tab order, and this library installs no document-level key to skip there — the same
  question the toast's action raised, and it is written down as one item rather than answered
  twice ([`req-api-platform`](../requirements/api.md#req-api-platform) is about not inventing
  what the platform has, and here the platform has nothing).
- **A drawer whose content is expensive renders it anyway.** That is the price of a shut drawer
  being text in the document rather than a branch — the accordion's price, for the accordion's
  reason. A consumer wraps their own content in `@defer` if they would rather pay differently.
