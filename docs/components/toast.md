# `PctToaster` — a message on top of the page

**Entrypoint:** `@pacit/components/toast`
**Selector:** none — the surface is a service. The one element, `<pct-toast-viewport>`, is
created by `PctToaster` and appended to `document.body`; nobody writes it
**Status:** released
**ARIA APG pattern:** [Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) for the urgent
message, and the `log` role for the place it lands in — named in the class JSDoc

The whole component is one decision applied three times over
([0044](../decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)): **the
region is a place that was already there**, opened empty by a render, so every message after
that is a change inside a region an assistive technology has registered — and never a region
arriving with its text, which is what nobody hears.

## Contract

|                 |                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none — a toaster holds no value. Its state is the list of messages standing, `Signal<readonly PctToastState[]>`                                                                                                                                                                                                                                          |
| **API**         | `show(spec: PctToastSpec \| string): PctToastRef`, `dismiss(id)`, `clear()`. `PctToastRef` is `{ id, dismiss() }` — enough to take back a message that has stopped being true                                                                                                                                                                            |
| **The spec**    | a discriminated pair, and the discrimination is the gate. `PctToastNotice` = `text` + `duration?: number \| null`, and it goes away by itself; `PctToastStanding` = `text` + `urgent?` + `action?`, and it has **no `duration` field at all**, so a standing message with a clock is a compile error rather than a rule in a service                     |
| **Config**      | `providePctToastConfig({ block, inline, duration, limit })` — where the stack stands on each axis, how long a notice with no duration of its own stays, and how many messages may stand at once. A token of its own and not four fields of `PctConfig`: an application that never raises a toast should not carry the answers to questions it never asks |
| **Slots**       | none. A message is a sentence, a label and a callback — content projected into a body-level element created by a service is a template with no view container to belong to                                                                                                                                                                               |
| **Parts**       | `item`, `message`, `action`, `close`                                                                                                                                                                                                                                                                                                                     |
| **Tokens**      | the `--pct-toast-*` prefix plus five entries in `contrast.policy.json`. Two of them exist for no other component: `--pct-toast-inset` (the distance from the window's edge, one number for both axes) and `--pct-toast-z-index`, whose job is a fallback — see the limitations                                                                           |
| **DI contract** | `PCT_TOAST_HOST` joins the service and its view, and it is why the two files do not import each other. `pctInheritedFrom` from `core` gives the body-level box the theme, typeface, size and direction it stops inheriting (`lesson-35`), read **per message** rather than once                                                                          |
| **Strings**     | the cross's accessible name through `PCT_TEXTS` (`toastDismiss`), read at render time ([0014](../decisions/0014-texts-as-signal.md)). A second key rather than the dialog's `dialogClose`: "close" is what a panel does and "dismiss" is what happens to a message                                                                                       |
| **SSR**         | nothing renders on the server. The viewport is created by a **browser** render, so `show()` on a server puts the message in the list, arms no clock and appends nothing to the HTML being sent                                                                                                                                                           |

**What is announced and how.** The region is `role="log"` and writes no `aria-live`,
`aria-atomic` or `aria-relevant` — measured in chromium's own accessibility tree, the role
publishes `polite`, `atomic=false`, `relevant="additions text"`, which is exactly a stack read
one message at a time. `role="status"`, the reflex, publishes `atomic=true` and would re-read
every message on the screen each time one arrived. An **urgent** message carries `role="alert"`
on its own element inside the log, and the engines publish that as `assertive` and `atomic` for
that message alone.

## Keyboard map

| key               | effect                                                               | test                                 |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `Tab`             | walks into the stack, and every clock stops while it is in there     | `apps/sandbox-e2e/src/toast.spec.ts` |
| `Enter` / `Space` | presses the action or the cross — the platform's, on two `<button>`s | `apps/sandbox-e2e/src/toast.spec.ts` |

There is no key of the library's own. A toast takes no focus when it arrives (the APG's
alert pattern), and the stack is reached the way any other part of the page is — which is also
its sharpest limitation, below.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/toast/src/toaster.ts`, `libs/components/toast/src/toast-viewport.ts`                                                                                                                                                                                                                                                    |
| Keyboard map tested             | `apps/sandbox-e2e/src/toast.spec.ts` — the walk in, the hold it puts on the clocks, and both buttons pressed                                                                                                                                                                                                                             |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/toast` view, and separately **a stack of three messages** with an `alert` nested in the `log`, which the walk over the routes cannot reach                                                                                                                                                   |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `toast-stack` and `toast-stack-rtl`, the whole viewport rather than a card: where the stack lands against the window's own edges is what this component draws                                                                                                                                    |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the edge in `CanvasText` (a card of `Canvas` on a page of `Canvas` has nothing else), and the action in `LinkText` against the sentence's `CanvasText`: the one distinction inside the card that the mode keeps on its own terms                                                          |
| `prefers-reduced-motion`        | `libs/components/toast/src/toast-viewport.scss` — the enter is `opacity` over `--pct-motion-transition-duration`, and the preference is answered by the token build (`req-a11y-motion`). There is no leave to reduce                                                                                                                     |
| Touch target ≥ 24×24 px         | `libs/tokens/src/component.toast.json` — the cross's box is `{pct.target.min}` and the action carries `min-block-size: var(--pct-target-min)`, which one line of small type is nowhere near                                                                                                                                              |
| Size axis                       | none — deliberately: a toast is not a control. `req-api-size` is about `--pct-control-height-*`, and the only width here is `--pct-toast-item-max-width`, which a consumer overrides                                                                                                                                                     |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                   |
| RTL                             | `apps/sandbox-e2e/src/toast.spec.ts` (the direction carried onto the box and the box pinned to the other edge) plus the `toast-stack-rtl` screenshot. The placement is `inset-inline-*`, so mirroring needs no rule of its own — but the `dir` has to REACH a child of `body`, and that is the half a stylesheet cannot prove            |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/toast` view renders and hydrates with no `NG05xx`; the viewport contributes no markup at all, being created by a browser render                                                                                                                                                         |
| Forms                           | none — deliberately: a toast is not a form control. It holds no value and implements no `FormValueControl`                                                                                                                                                                                                                               |
| The region precedes the message | `libs/components/toast/src/toast.spec.ts` — after the first render the document holds an **empty** `role="log"`, and it is a child of `body`                                                                                                                                                                                             |
| The region says nothing extra   | `libs/components/toast/src/toast.spec.ts` + `apps/sandbox-e2e/src/toast.spec.ts` — the ABSENCE of `aria-live`, `aria-atomic` and `aria-relevant` asserted in both, which is the only way to hold an attribute that must not be written ([`lesson-112`](../lessons.md#lesson-112))                                                        |
| A modal does not silence it     | `apps/sandbox-e2e/src/toast.spec.ts` — the viewport is not inert and sits in no inert subtree while a dialog is up, plus `libs/components/core/src/core.spec.ts` for which elements the background marks                                                                                                                                 |
| The top layer                   | `apps/sandbox-e2e/src/toast.spec.ts` — a message raised while the modal is up can be pressed through the veil, and an older one cannot: the order in the top layer is the order things were shown in ([`lesson-122`](../lessons.md#lesson-122))                                                                                          |
| The clock                       | `libs/components/toast/src/toast.spec.ts` (the duration, the default, the pause and the resumed remainder) and `apps/sandbox-e2e/src/toast.spec.ts` (the same under a real pointer and real focus)                                                                                                                                       |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                      |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — five pairs, of which the one worth having is the action against the card: it is drawn as text and measured as text, not as a control                                                                                                                                                            |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` + `libs/components/toast/src/toast.spec.ts` — an application's own dismiss label replaces the default                                                                                                                                                                                                            |
| Size budget                     | `libs/components/size.snapshot.md` — the `./toast` row, and the `./core` row beside it                                                                                                                                                                                                                                                   |
| Screen-reader log               | none — gap. The same one the dialog and the select have, and here it is the most wanted of the three: whether a `log` really is read one message at a time, and whether an `alert` nested in it interrupts, are questions axe does not answer — it examines structure, it does not listen. What the engines publish is at least measured |
| docs page                       | `/components/toast` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                   |

## Decisions

[0044](../decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md) (the main
one — the region, the role, the top layer and the clock),
[0026](../decisions/0026-one-channel-per-politeness.md) (a message with a home announces from
it — and the note in it that predicted the toast would be a caller of the hidden channel, which
this component is not),
[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (why the
region writes no `aria-live`, `aria-atomic` or `aria-relevant`),
[0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md) (the modal background, which
learned the live roles for this),
[0007](../decisions/0007-config-and-texts.md),
[0028](../decisions/0028-an-icon-set-is-a-component.md) (the cross is `close` inside a
`pct-icon`)

## Known limitations

- **No tone.** No green for success and no red for failure. A tone drawn in colour alone is a
  state carried by colour alone, and the channel that repairs it is an icon per tone — a public
  name and a promise about a drawing, which is a decision of its own rather than a field on a
  spec. Urgency is carried by what the message is announced as and by the clock it does not
  have.
- **No leave transition.** A message fades in and goes at once. The honest version of a leave
  is a layout animation — every card under the one going moves up at the same time — and that
  is not a fade.
- **The stack is at the end of the page's tab order, and there is no key that jumps to it.**
  For a message with an action this is the real cost: a keyboard user reaches `Undo` after
  every control on the page. It is why an action makes a message standing — the clock at least
  does not run out during the walk — and why a shortcut is a decision waiting for somebody with
  a measurement, not a line to add quietly.
- **The oldest message goes when the limit is reached**, and nothing says the user read it.
  Four is the default and it is configuration, because only the application knows how tall its
  window is.
- **A modal opened after a message stands over it.** The top layer orders by recency and that
  is the platform's rule, not ours; the case it is chosen for is the opposite one — a message
  raised **while** the modal is up stands over the modal, which is when a report matters most.
- **One place for the whole application.** `block` and `inline` are configuration, not
  per-message, so an application cannot put errors in one corner and confirmations in another.
  Two stacks would be two live regions competing to be read, which is the thing
  [0026](../decisions/0026-one-channel-per-politeness.md) is about.
