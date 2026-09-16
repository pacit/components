# `PctButton` — button

**Summary:** A button in five faces and three sizes, drawn on the platform's own `<button>` — or on its `<a>`, when the control navigates.
**Entrypoint:** `@pacit/components/button`
**Selectors:** `button[pctButton]`, `a[pctButton]` (an attribute selector on whichever element
the control really is — the button stays a native `<button>`, the link a native `<a>`)
**Status:** released
**Category:** Actions & navigation
**ARIA APG pattern:** a native `<button>` — or a native `<a>` when the control navigates; no
role of its own on either, and no keyboard handling of its own
([`req-api-platform`](../requirements/api.md#req-api-platform))

Five faces on two native elements. Each keeps its own semantics, its own keyboard handling and
its own place in a form or in a crawler's index — the directive only paints, and every face is
measured on both themes before it ships. A link wearing the face is still a link
([0071](../decisions/0071-a-link-in-button-s-clothes-is-a-link.md)): the role, the middle
click and the address bar's preview are all still there, and only the underline goes.

## Usage

```html
<button pctButton>Save</button> <a pctButton href="/start">Get started</a>
```

## Contract

|             |                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | not applicable — this is not a form control                                                                                                                                                                                                                                                                                                                                |
| **Inputs**  | `variant` (`'solid' \| 'outline' \| 'ghost' \| 'soft' \| 'hero'` — five faces, one directive, [0058](../decisions/0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md)), `size` (`sm`/`md`/`lg`, default from `providePctConfig`), `disabled` (the platform's own attribute on a button; `aria-disabled` and a refused navigation on a link), `loading` |
| **Outputs** | none — `click` is native                                                                                                                                                                                                                                                                                                                                                   |
| **Slots**   | default (the label's content)                                                                                                                                                                                                                                                                                                                                              |
| **Parts**   | `label`, `spinner`                                                                                                                                                                                                                                                                                                                                                         |
| **Harness** | `PctButtonHarness`                                                                                                                                                                                                                                                                                                                                                         |
| **Tokens**  | `--pct-button-*`, including `--pct-button-height-{sm,md,lg}`; the soft and hero faces paint from the semantic tier outright (`--pct-primary-100/-200`, `--pct-hero/-via/-to` with `on-` pairs); `contrast.policy.json` holds `button/solid`, `button/disabled`, `button/soft` ×2 and **`button/hero` ×3 — a gradient is three contrast checks, not one**                   |

## Parts

| part      | what it is                                     |
| --------- | ---------------------------------------------- |
| `label`   | the span around the projected content          |
| `spinner` | the loading ring, present only while `loading` |

## Theming

```css
[data-theme='brand'] {
  --pct-button-bg: #0f766e;
  --pct-button-bg-hover: #115e59;
  --pct-button-fg: #ffffff;
  --pct-button-radius: 999px;
}
```

## Keyboard map

None of its own. `Enter` and `Space` come from the native `<button>`; a link answers `Enter`
alone, because that is what a link does. That is
[`req-api-platform`](../requirements/api.md#req-api-platform) at work, not an oversight — and
it is also why the two elements differ here rather than being made to agree.

## Checks

| criterion                                 | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ARIA APG pattern named in the class JSDoc | none — gap: the JSDoc does not say outright that the component deliberately has no role of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Keyboard map tested                       | `apps/sandbox-e2e/src/button.spec.ts` — for the link alone, and only what is not the browser's: a real `Tab` reaches a disabled link, the ring it lights is the button's, and `Enter` on it navigates nowhere                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| axe audit on its own sandbox view         | `apps/sandbox-e2e/src/a11y.spec.ts` (the `/button` view, the `Links` card among them)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Visual screenshot                         | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `forced-colors: active`                   | `apps/sandbox-e2e/src/forced-colors.spec.ts` and `tools/check-styles.mjs` (point 7) — the grey of the disabled state repeats the base rule's selector, or `@media` would not outrank it; loading keeps the variant's colour here too ([`lesson-70`](../lessons.md#lesson-70)); the hero **drops its gradient** (an image survives the forcing, so it is dropped by hand) and the boundary-less faces get a `ButtonText` edge back — both read computed in three engines. A link is forced to `LinkText` on `Canvas` instead, so its edge is `LinkText` and its disabled state stays `GrayText` ([0071](../decisions/0071-a-link-in-button-s-clothes-is-a-link.md)) |
| SC 2.2.2 — the hero variant's sweep ends  | `libs/components/button/src/button.scss` — one pass of half the motion axis (four seconds) and the gradient stands still. It was 8s and endless; what changed is that it now ENDS, inside the five seconds the criterion allows motion to run with no control beside it, and the cost is that it reads twice as brisk while it runs. The pass is measured on `[pctHero]`, whose `fill` face is the same sweep (`apps/sandbox-e2e/src/hero.spec.ts`); the button has no `paused` input of its own — the settle is what answers the criterion, and the extra stop lives on the component whose whole job is the face                                                 |
| `prefers-reduced-motion`                  | `apps/sandbox-e2e/src/preferences.spec.ts` — the spinner **slows down** (still says "working"), the hero drift **freezes outright** (`--pct-motion-drift-duration` → `0s`: decoration informs of nothing) — the two ends of the same axis ([0008](../decisions/0008-motion-axis.md))                                                                                                                                                                                                                                                                                                                                                                               |
| Touch target ≥ 24×24 px                   | `apps/sandbox-e2e/src/size.spec.ts` — the smallest size is 28 px, i.e. the threshold with room to spare                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Size axis                                 | `apps/sandbox-e2e/src/size.spec.ts` — measuring equality with the field row **and** the absolute value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Density axis                              | none — gap: [`req-token-density`](../requirements/tokens.md#req-token-density) does not exist in the DTCG sources                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RTL                                       | `tools/check-styles.mjs` (point 5, [`req-token-logical`](../requirements/tokens.md#req-token-logical)) over the stylesheet — three physical declarations, each a justified `pct-exception`: two `border-right-color` for the spinner's gap (a ring has no writing direction) and one `background-position` for the hero's drift — plus the `button-variants-rtl` baseline in `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                 |
| SSR + hydration                           | `apps/sandbox-e2e/src/hydration.spec.ts` through `visit()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Forms                                     | not applicable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Parts in the inventory                    | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Tokens + `contrast.policy.json`           | `libs/tokens/src/contrast.policy.json`, `libs/tokens/build.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Strings through `PCT_TEXTS`               | `tools/check-texts.mjs` — the component writes no strings of its own, and adding one fires the gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Entrypoint size budget                    | none — gap: there is no budget ([`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Screen-reader log                         | Read 2026-09-16 from `docs/acr/at/` — three readers, whole sandbox. Every variant announces as the same thing and nothing more: `Outline · button.` (Orca), `Outline, button` (NVDA), `Outline button` (VoiceOver), across solid, outline, ghost, soft and hero. That is the reading this card wanted — **the variant is a look and a reader must not be able to hear it** — and no reader did                                                                                                                                                                                                                                                                     |
| docs page                                 | `/components/button` on the published site — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Decisions

[0001](../decisions/0001-separate-files.md), [0004](../decisions/0004-explicit-height.md),
[0008](../decisions/0008-motion-axis.md),
[0058](../decisions/0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md),
[0071](../decisions/0071-a-link-in-button-s-clothes-is-a-link.md)

## Known limitations

- **No icon variant** — an icon-only button would need square geometry and a touch-target
  guarantee of its own. Waiting for [`req-api-icons`](../requirements/api.md#req-api-icons).
- **`loading` does not block the click** — `disabled` does. Deliberately separated: "working"
  and "cannot be clicked" are two different states, and a loading button without `disabled` is
  a legitimate pattern (when a click queues something, say). On a link the pair behaves the
  same way: `loading` alone announces `aria-busy` and lets the navigation through.
- **A disabled link is a promise, not a platform state** — HTML has no disabled link, so
  `disabled` on `a[pctButton]` is `aria-disabled`, the greyed face and a refused press, and
  the element deliberately keeps its place in the tab order
  ([0071](../decisions/0071-a-link-in-button-s-clothes-is-a-link.md)). A consumer who needs it
  gone from the walk removes the `href`, which is the platform's own way of saying so.
- **`<a pctButton>` with no `href` is reported, not repaired** — it paints like a button and
  has no role, no tab stop and no keyboard. A dev-mode sentence names it once after the first
  render; nothing in the type system or in CSS can see it.
