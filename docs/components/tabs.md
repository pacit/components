# `PctTabs` — one section of a page showing at a time

**Entrypoint:** `@pacit/components/tabs`
**Selector:** `pct-tabs` (the strip) and `pct-tab` (a panel)
**Status:** released
**ARIA APG pattern:** [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — named in the
class JSDoc

Two things separate it from every other component here. **The panels are the consumer's markup
in the place they wrote it** — a `<pct-tab>` _is_ the panel, and the strip above is drawn from
the labels the panels hand up, so nothing is projected twice and the DOM order the pattern asks
for is the order anybody would write. And **a panel nobody chose is still text in the
document**: it is `hidden="until-found"`, so the browser's own find-in-page searches it and can
reveal it, and the reveal is answered rather than undone
([0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).

## Contract

|                 |                                                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `value: ModelSignal<string>` on the strip — the `value` of the `<pct-tab>` showing. A value naming no panel is not an error: the first panel that can be reached shows instead, and the consumer's signal is **left alone** rather than repaired during a render                                    |
| **Inputs**      | strip: `value` (model), `orientation: 'horizontal' \| 'vertical'`, `activation: 'automatic' \| 'manual'`, `ariaLabel`, `ariaLabelledby`. Panel: `value: string`, `label: string` (required), `disabled: boolean`                                                                                    |
| **Outputs**     | none — `value` is a `model`, so the change is the two-way binding                                                                                                                                                                                                                                   |
| **Slots**       | the panel's content is ordinary projection (`<ng-content />` in `pct-tab`). There is **no** slot for the tab's own drawing — see the limitations                                                                                                                                                    |
| **Parts**       | `list`, `tab`, `panel`                                                                                                                                                                                                                                                                              |
| **Tokens**      | the `--pct-tabs-*` prefix plus six entries in `contrast.policy.json`                                                                                                                                                                                                                                |
| **DI contract** | `PCT_TABS` and `PCT_TAB`, both declared in `tabs.ts` so that the panel imports the strip and never the other way round — the menu's channel one component over. A panel resolves its strip through the **element injector**, so a `<pct-tab>` inside a nested `<pct-tabs>` belongs to the inner one |
| **Strings**     | none. Every word on the screen is the consumer's `label` or their projected content; this component prints nothing of its own, so it reads no `PCT_TEXTS` key                                                                                                                                       |
| **SSR**         | everything renders on the server, panels included: the hiding is an attribute, not a branch, so the HTML holds every section and hydration has nothing to reconcile                                                                                                                                 |

**Why `label` is required and `value` is not.** The strip decides which panel shows by
comparing every panel's value against its own, and that comparison is read from a panel's host
binding — so panel one asks panel two for its value. Under an `@for` that question arrives
before panel two's inputs exist, and a required input read there throws `NG0950`
([`lesson-124`](../lessons.md#lesson-124)). `label` is read from the strip's own template, one
phase later, where the ordering does not reach — so the compiler may as well have the rule. A
panel with no `value` is reported after the first render instead.

## Keyboard map

| key                        | effect                                                                             | test                                |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `ArrowRight` / `ArrowLeft` | horizontal strip: the next / previous reachable tab, **swapped under `dir="rtl"`** | `apps/sandbox-e2e/src/tabs.spec.ts` |
| `ArrowDown` / `ArrowUp`    | vertical strip: the same, along the other axis                                     | `apps/sandbox-e2e/src/tabs.spec.ts` |
| `Home` / `End`             | the first / last tab that can be reached                                           | `apps/sandbox-e2e/src/tabs.spec.ts` |
| `Enter` / `Space`          | chooses the focused tab — the **platform's**, on a real `<button>`                 | `apps/sandbox-e2e/src/tabs.spec.ts` |
| `Tab`                      | one stop for the whole strip, and the panel is the next one                        | `apps/sandbox-e2e/src/tabs.spec.ts` |

The arrows come round at both ends, which is the APG's own example. There is no typeahead: the
shared walk in `core` switches it off when the source names no `label`, and a strip of a handful
of visible words is not a list somebody types at. In `activation="automatic"` a movement also
chooses; in `"manual"` it only moves, and `Enter` or `Space` — which this component does not
handle, because a `<button>` already turns them into a click — does the choosing.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/tabs/src/tabs.ts`, `libs/components/tabs/src/tab.ts`                                                                                                                                                                                                           |
| Keyboard map tested             | `apps/sandbox-e2e/src/tabs.spec.ts` (every row above, in three engines) and `libs/components/tabs/src/tabs.spec.ts` (the walk's edges, the disabled skip, the keys it leaves alone)                                                                                             |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/tabs` view, LTR and RTL, with all four strips of the sandbox on the page at once (horizontal, manual, vertical, overflowing)                                                                                                        |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `tabs-strip` and `tabs-vertical`                                                                                                                                                                                                        |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the chosen tab's edge in `Highlight` against `Canvas` on the ones not chosen: the mark survives because it is drawn on **every** tab and only its colour differs, so no palette can flatten a line into a line that is not there |
| `prefers-reduced-motion`        | `libs/components/tabs/src/tabs.scss` — the only transition is `color` over `--pct-motion-transition-duration`, and the preference is answered by the token build (`req-a11y-motion`)                                                                                            |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/tabs.spec.ts` — every tab's box measured outright; the floor is `--pct-tabs-tab-target-min` on the tab itself, so what a finger gets is what an eye sees                                                                                                  |
| Size axis                       | none — deliberately: a tab is not a control with a height. `req-api-size` is about `--pct-control-height-*`, and a strip takes its height from the type and the padding, which a skin moves through the tokens                                                                  |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                          |
| RTL                             | `apps/sandbox-e2e/src/tabs.spec.ts` (the arrows swapped, with the direction inherited from the document rather than written on the strip) plus the `tabs-vertical-rtl` screenshot, which is where the rail and the mark change sides with no rule of their own                  |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/tabs` view renders and hydrates with no `NG05xx`. Every panel is in the server's HTML, hidden by an attribute rather than by a branch                                                                                          |
| Forms                           | none — deliberately: a tab strip is not a form control. It holds no value a form owns and implements no `FormValueControl`                                                                                                                                                      |
| The hidden panel is findable    | `apps/sandbox-e2e/src/tabs.spec.ts` — `hidden="until-found"` computes `content-visibility: hidden` with `display: block`, and the text inside answers `checkVisibility() === false`; `libs/components/tabs/src/tabs.spec.ts` for the three states of the attribute              |
| The reveal is answered          | `libs/components/tabs/src/tabs.spec.ts` — `beforematch` on a panel chooses its tab, and does not when the tab is disabled                                                                                                                                                       |
| The strip is one Tab stop       | `apps/sandbox-e2e/src/tabs.spec.ts` — the roving `0`, the next `Tab` landing on the panel, and the scroll container's `tabIndex === -1` in all three engines ([`lesson-126`](../lessons.md#lesson-126))                                                                         |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                             |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — six entries. The rail is `warn` and says why: a separator is not what identifies a control or its state, and the two things that do — the label pair and the chosen tab's mark — are errors                                            |
| Strings through `PCT_TEXTS`     | none — deliberately: the component prints no string of its own, so there is no key to route. `tools/check-texts.mjs` reads its templates all the same                                                                                                                           |
| Size budget                     | `libs/components/size.snapshot.md` — the `./tabs` row                                                                                                                                                                                                                           |
| Screen-reader log               | none — gap. The same one the dialog, the select and the toast have. The question it would answer here is specific: what a reader says when find-in-page reveals a panel and the tab under it changes                                                                            |
| docs page                       | `/components/tabs` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                           |

## Decisions

[0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md) (the main one —
the three hidden states, the `beforematch` answer, the `@supports` fallback and why the panels
stay where they are written),
[0026](../decisions/0026-one-channel-per-politeness.md) (why nothing here announces through
`PctAnnouncer`: a tab strip is the most homed control in the library),
[0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md) (focus really moves, so
this is a roving tabindex and not `aria-activedescendant`),
[0013](../decisions/0013-no-headless-split.md) (the shared walk comes from `core` as a function,
never a base class),
[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (which is why
`Enter` and `Space` have no handler: the `<button>` publishes the press)

## Known limitations

- **Every panel's content is rendered, always.** That is the price of the panels being text in
  the document rather than a branch, and it is the whole of what
  [0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md) buys. A
  consumer whose panel is expensive wraps their own content in an `@defer` or an `@if` — which
  this component cannot do for them without taking the text back out.
- **A tab is a string, not a slot.** No icon, no count badge, no two lines. A slot would be a
  second public directive and a second thing to type, and the first component to want one
  cannot tell a shared property from an accident of the only case — the same reasoning the
  toast's tone has.
- **The strip scrolls and nothing scrolls it for you.** More labels than room means a scroll
  container, and what carries the keyboard is the platform bringing a focused element into
  view. There are no scroll buttons, and a pointer user on a device with no horizontal wheel
  gesture has only the scrollbar. It also has a measured side effect: `overflow: auto` makes
  the strip focusable in blink and gecko, though never a stop in the tab order
  ([`lesson-126`](../lessons.md#lesson-126)).
- **A disabled panel is not findable.** Deliberate, and the reason is in 0045: find-in-page
  promises a way in and a disabled tab has none. It does mean a consumer who disables a tab
  takes its text out of the page's search, which is a thing to know rather than a thing to fix.
- **The panel is always a Tab stop.** The APG asks for it only when the content holds nothing
  focusable, and whether it does is the consumer's business and not knowable here — so the
  answer that is right in both cases is taken, and it costs one extra stop after the strip.
- **No lazy `value` write-back.** A strip whose `value` names nothing shows the first reachable
  panel and does **not** write that value into the consumer's signal. The alternative is a
  component that repairs the consumer's state during a render, which finishes in one pass for
  one consumer and never for two ([`lesson-94`](../lessons.md#lesson-94)).
