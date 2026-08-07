# `PctButton` — button

**Entrypoint:** `@pacit/components/button`
**Selector:** `button[pctButton]` (an attribute selector — the button stays a native
`<button>`)
**Status:** released
**ARIA APG pattern:** a native `<button>` — no role of its own, no keyboard handling of its
own ([`req-api-platform`](../requirements/api.md#req-api-platform))

## Contract

|             |                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | not applicable — this is not a form control                                                                                              |
| **Inputs**  | `variant` (`'solid'` \| …), `size` (`sm`/`md`/`lg`, default from `providePctConfig`), `disabled`, `loading`                              |
| **Outputs** | none — `click` is native                                                                                                                 |
| **Slots**   | default (the label's content)                                                                                                            |
| **Parts**   | `label`, `spinner`                                                                                                                       |
| **Tokens**  | `--pct-button-*`, including `--pct-button-height-{sm,md,lg}`; entries in `contrast.policy.json` for `button/solid` and `button/disabled` |

## Keyboard map

None of its own — `Enter` and `Space` come from the native `<button>`. That is
[`req-api-platform`](../requirements/api.md#req-api-platform) at work, not an oversight.

## Checks

| criterion                                 | evidence                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern named in the class JSDoc | none — gap: the JSDoc does not say outright that the component deliberately has no role of its own                                                                            |
| Keyboard map tested                       | none — deliberately: the handling is native, we would be testing the browser                                                                                                  |
| axe audit on its own sandbox view         | `apps/sandbox-e2e/src/a11y.spec.ts` (the `/button` view)                                                                                                                      |
| Visual screenshot                         | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                         |
| `forced-colors: active`                   | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                  |
| `prefers-reduced-motion`                  | `apps/sandbox-e2e/src/preferences.spec.ts` — the spinner **slows down**, it does not stop ([0008](../decisions/0008-motion-axis.md))                                          |
| Touch target ≥ 24×24 px                   | `apps/sandbox-e2e/src/size.spec.ts` — the smallest size is 28 px, i.e. the threshold with room to spare                                                                       |
| Size axis                                 | `apps/sandbox-e2e/src/size.spec.ts` — measuring equality with the field row **and** the absolute value                                                                        |
| Density axis                              | none — gap: [`req-token-density`](../requirements/tokens.md#req-token-density) does not exist in the DTCG sources                                                             |
| RTL                                       | none — gap: [`req-token-logical`](../requirements/tokens.md#req-token-logical) has no gate. Note: the spinner has `border-right-color`, one of the two RTL-safe physical hits |
| SSR + hydration                           | `apps/sandbox-e2e/src/hydration.spec.ts` through `visit()`                                                                                                                    |
| Forms                                     | not applicable                                                                                                                                                                |
| Parts in the inventory                    | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                          |
| Tokens + `contrast.policy.json`           | `libs/tokens/src/contrast.policy.json`, `libs/tokens/build.mjs`                                                                                                               |
| Strings through `PCT_TEXTS`               | `tools/check-texts.mjs` — the component writes no strings of its own, and adding one fires the gate                                                                           |
| Entrypoint size budget                    | none — gap: there is no budget ([`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking))                                                            |
| Screen-reader test log                    | none — gap                                                                                                                                                                    |
| docs page                                 | none — gap: `apps/docs` does not exist                                                                                                                                        |

## Decisions

[0001](../decisions/0001-separate-files.md), [0004](../decisions/0004-explicit-height.md),
[0008](../decisions/0008-motion-axis.md)

## Known limitations

- **No icon variant** — an icon-only button would need square geometry and a touch-target
  guarantee of its own. Waiting for [`req-api-icons`](../requirements/api.md#req-api-icons).
- **`loading` does not block the click** — `disabled` does. Deliberately separated: „working"
  and „cannot be clicked" are two different states, and a loading button without `disabled` is
  a legitimate pattern (when a click queues something, say).
