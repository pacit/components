# `PctSkeleton` — the shape of content that has not arrived

**Entrypoint:** `@pacit/components/skeleton`
**Selector:** `pct-skeleton`
**Status:** released
**ARIA APG pattern:** none — a skeleton is not a widget and announces nothing. It is
`aria-hidden="true"` outright, the second component in the library to be after `pct-icon`;
what a screen reader has to hear is
[`aria-busy`](https://www.w3.org/TR/wai-aria-1.2/#aria-busy) on the **region** whose content is
late, which is the consumer's own element. Named in the class JSDoc.

The whole component is two answers
([0050](../decisions/0050-a-skeleton-is-a-picture-of-a-wait.md)): it holds the space the
content will take — a line is `1lh` and the bar inside it `1cap`, both computed by the browser
out of the consumer's own type — and it says nothing, because there is nothing yet to say.

## Contract

|             |                                                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — a placeholder holds no value. What it holds is space                                                                                                                                     |
| **Inputs**  | `lines` (`number`, default `1` — a count of LINE BOXES of the surrounding type), `shape` (`text \| block`, default `text`)                                                                      |
| **Outputs** | none — nothing happens to a skeleton. What ends the wait is the content, and the content is the application's                                                                                   |
| **Slots**   | **none, deliberately.** The host is `aria-hidden`, and a slot is where a consumer puts a button — a control the keyboard reaches and a reader cannot describe (axe's `aria-hidden-focus`)       |
| **Parts**   | `track` (one placeholder: a bar standing where a line of text will be, or the box standing where a picture will be), `fill` (the sheen travelling across it) — the progress bar's own two names |
| **Tokens**  | the `--pct-skeleton-*` prefix plus two entries in `contrast.policy.json`                                                                                                                        |
| **Strings** | **none.** The second component in a row to add nothing to `PCT_TEXTS` and therefore nothing to every other entrypoint's bytes — a component that says nothing has nothing to translate          |

**Why the two parts are the progress bar's.** A skeleton is an indeterminate progress bar
wearing the shape of the content: both say "something is coming and how long is not known",
both are a placeholder with a band travelling across it. One vocabulary for both means a skin
styles them with one selector instead of learning a second set of names for the same drawing.

**Why there is no `size` input.** The size is the type's. A line is one line box of whatever
text the skeleton stands in, so a placeholder in a heading is a heading's size and one in a
caption is a caption's, with nothing bound and nothing to keep in step. The progress bar kept a
thickness of its own because a bar is not text; this component is text
([`lesson-136`](../lessons.md#lesson-136)).

**Where the busy state goes.** On the region, never on the skeleton:

```html
<div [attr.aria-busy]="pending() ? 'true' : null">
  @if (pending()) { <pct-skeleton [lines]="3" /> } @else {
  <p>{{ article().body }}</p>
  }
</div>
```

With nothing above it marked busy the component reports it in dev mode — a sighted user sees
three grey bars and a screen-reader user is told nothing at all, which is the one defect this
component can cause and the one no gate here can see: the region belongs to the application.

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**, and for the strongest reason in the library so far: nothing here can be
landed on at all. The subtree is hidden from the accessibility tree, so anything focusable in
it would be axe's `aria-hidden-focus` — `apps/sandbox-e2e/src/skeleton.spec.ts` asks every
element in the component to focus itself and counts zero, in three engines, and
`tools/check-aria.mjs` point 8 refuses the general case at build time
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/skeleton/src/skeleton.ts`                                                                                                                                                                                                                                                                                                                                                   |
| Keyboard map tested key by key                             | `apps/sandbox-e2e/src/skeleton.spec.ts` — the empty map is the claim, so what is gated is that no element in the component takes focus in any of the three engines                                                                                                                                                                                                                           |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/skeleton` in `SBX_ROUTES`, so the WCAG 2.2 AA sweep takes it. `aria-hidden-focus` is the rule that would bite here, and the subtree holds nothing to land on                                                                                                                                                                                         |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `skeleton-shapes` and `skeleton-shapes-rtl`: three lines with the short last one, a picture's box and a disc                                                                                                                                                                                                                                         |
| `forced-colors: active` — no state carried by colour alone | `libs/components/skeleton/src/skeleton.scss` — the box keeps its extent through an `outline: 1px solid GrayText` over `background: Canvas`, and the sheen is `GrayText` (not `Highlight`: a page of waiting cards would be a wall of selections). The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`. The mechanism this refuses is a gradient shimmer, dropped outright in that mode |
| `prefers-reduced-motion` — duration from a token           | `apps/sandbox-e2e/src/preferences.spec.ts` — the sheen reads **1500 ms** (the loop token slows, it does not stop: a still placeholder stops saying anything is coming). No media query stands in the component's sheet                                                                                                                                                                       |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target. A skeleton takes no pointer and no focus, so the floor `req-a11y-touch` sets has nothing to apply to                                                                                                                                                                                                                                              |
| Size axis aligned to `--pct-control-height-*`              | deliberately not, and one step further than the progress bar: there is no axis of ours at all. A line is `1lh` and the bar inside it `1cap`, both the browser's arithmetic over the consumer's type — `apps/sandbox-e2e/src/skeleton.spec.ts` reads the same component at two font sizes and gets two heights with nothing bound                                                             |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                       |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `libs/components/skeleton/src/skeleton.scss` — the short last line is placed by `inline-size` in a grid row and the sheen travels by `inset-inline-start`. The screenshot: `skeleton-shapes-rtl`; the geometry: `apps/sandbox-e2e/src/rtl.spec.ts`, where the short bar keeps to the reading direction's start edge                                                                          |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/skeleton` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                       |
| Forms                                                      | not applicable — a placeholder holds no value a form owns and implements no `FormValueControl`                                                                                                                                                                                                                                                                                               |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` — the **Parts** row above                                                                                                                                                                                                                                                                                                       |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — two entries, both `warn` with the reason written beside them (a placeholder has to be visible and must not read as content, and the sheen is motion rather than information); `libs/tokens/tokens.snapshot.md`                                                                                                                                      |
| Strings through `PCT_TEXTS`                                | not applicable — the component draws no text at all. There is no default sentence to translate, and none to override                                                                                                                                                                                                                                                                         |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./skeleton` **2997 B on `@angular/core` alone**: it carries no `./core`, which every component entrypoint but the icon seam does. No `size` input is no `PCT_CONFIG` to inject, no text is no `PCT_TEXTS`, no icon is no drawing to import — so what it ships is the component and nothing under it                                                    |
| A screen-reader test log                                   | none — gap: the same one the dialog, select, toast, tabs, accordion, drawer, pagination and progress bar have. The question here: what a reader says about a busy region with a hidden subtree inside it, which is the whole of this component's contract                                                                                                                                    |
| A docs page with live examples                             | `apps/sandbox/src/app/views/skeleton/` (the sandbox view). The published site: `/components/skeleton` — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                           |
| Unit + mutation                                            | `libs/components/skeleton/src/skeleton.spec.ts` — 20 cases; `libs/components/mutation.snapshot.md` — `skeleton.ts` at **92.31**, zero clock-kills, and both survivors equivalent: `isDevMode()` forced true, and `parsed >= 1` weakened to `parsed > 1`, which no case can tell apart because the fallback IS the boundary — one line means one line whichever branch answers                |

## Decisions this component implements

[0050](../decisions/0050-a-skeleton-is-a-picture-of-a-wait.md) (the main one — why it announces
nothing, why the wait belongs to the region, why the size is the type's, why the sheen is an
element),
[0037](../decisions/0037-loading-is-a-fact-about-the-list.md) (`aria-busy` as the platform's
name for content that has not arrived),
[0049](../decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md) (the
travelling band this sheen repeats, and the two part names it borrows),
[0013](../decisions/0013-no-headless-split.md) (parts and tokens as the whole styling contract
— which is why a disc is a radius and not a third shape).

## Known limitations

- **`lines` does not reach a `block`.** It counts lines of text and a box has none, so
  `shape="block" [lines]="3"` draws one box. The alternative — a box three line boxes tall —
  needs the count inside the stylesheet, and a component may not invent a `--pct-…` property
  that is not a token of the skin.
- **No `loading` input and no content slot.** The swap between the placeholder and the content
  is an `@if` the consumer already has, written where they can see it; a slot would put
  projected content inside an `aria-hidden` host, which is the one violation this component
  could cause.
- **Nothing is announced, and the region has to be marked by hand.** A dev-mode warning is all
  this repository can do about it — the busy region is the consumer's element, and no static
  gate here can see their application.
- **No tone and no timeout.** A skeleton that turned red after ten seconds would be guessing a
  threshold that belongs to the application, and the sentence that goes with it is not a
  placeholder's.
- **The sheen is one animation for all the lines at once**, started when each bar is drawn. A
  staggered wave is a per-bar delay a skin can add; the component does not choose one.
