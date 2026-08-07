# 0006 — The anchor and inheritance in an overlay

**Status:** accepted
**Implements:** [`req-api-overlay`](../requirements/api.md#req-api-overlay)
**Evidence:** [`lesson-18`](../lessons.md#lesson-18), [`lesson-35`](../lessons.md#lesson-35)

## Context

The select's panel lives in a CDK overlay, i.e. **as a child of `body`**, outside the host
tree. It is also supposed to look like an extension of the control. Those two things
contradict each other, and every property that „just worked" stops working quietly.

Symptoms measured in the browser:

- After [0003](0003-wrapper-and-control.md) the trigger stopped being its own frame while the
  overlay still anchored to it: with a **301 px** field the panel was **275 px** and offset by
  **13 px** to the right.
- The panel inherited its typeface from `body`, not from the app: **`Times New Roman`** in the
  panel against `system-ui` in the control.
- Font size came from the `--pct-select-font-size` token, so in an `lg` field the options
  stayed at 14 px while the trigger wrote at 16 px.
- The scoped-theme cascade does not reach the panel at all
  ([`lesson-18`](../lessons.md#lesson-18)).

A standalone select looked **impeccable** all the while — because there the trigger _is_ the
visible edge. The symptom appeared in exactly the configuration where the wrapper takes over
the appearance.

## Decision

**The overlay comes out of the control's visible edge, not out of the element that opens it.**

- The wrapper offers its row as the **reference surface** (`PctFieldApi.surface`); the control
  anchors the panel to it. With no wrapper the anchor is the trigger itself.
- **The anchor is part of the contract, not a guess made by the control.**

**The panel inherits nothing from the host — everything that is supposed to look like an
extension of the control is read from it when the panel opens and carried over explicitly:**
theme (`data-theme`), typeface and font size.

The panel width is **an axis of the API**, not a constant:

| `panelWidth` | behaviour                                                     |
| ------------ | ------------------------------------------------------------- |
| `"field"`    | the default — the panel matches the control                   |
| `"auto"`     | fitted to the longest option, never narrower than the control |
| a CSS length | set outright                                                  |

When the panel does not match the control's width, `panelAlign` decides which edge they abut
(`start` / `center` / `end`); a panel running off the viewport is pushed back in (`push`),
because clipped options cannot be read.

## Consequences

**A general rule, more important than the select itself:** _every inherited property is
silently severed in an overlay._ The theme was already being carried over explicitly, but that
was treated as a peculiarity of theming — and it is a rule. Whatever is supposed to look like
an extension of the control has to be **read from it**, because the DOM tree will not do it.

Technical consequences:

- `:host(...)` selectors do not reach the panel's content — option states have to be marked
  with attributes on the options themselves.
- Tokens work regardless, because they are defined on `:root` — an advantage of the CSS-first
  approach.
- The gate has to compare **specific values** (width, offset, typeface, size), not „roughly
  right".
- This list is **to be generalised into the `core` behaviour layer** at the first dialog. Today
  it is solved once, in one component.

## What this costs us

- **A read of the computed style on every open** — the cost is small, but it is work at runtime
  where the cascade would normally suffice.
- The list of properties to carry over is **open**: today theme, typeface and size. Every
  further inherited property somebody cares about will be one more entry — and discovering it
  will again take a measurement, because the absence of inheritance gives no signal.

## Alternatives considered

| alternative                                       | why rejected                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Anchoring to the trigger                          | measured: a 275 px panel on a 301 px field, offset by 13 px                                     |
| Font size from the `--pct-select-font-size` token | the token does not know the wrapper's context: in an `lg` field the options stayed at 14 px     |
| Rendering the panel inside the host tree          | ancestors' `overflow` and `z-index` clip the panel — that is why CDK Overlay exists             |
| `forced-color-adjust` / inheritance through CSS   | the cascade does not cross the overlay boundary; there is nothing to fix on the stylesheet side |
