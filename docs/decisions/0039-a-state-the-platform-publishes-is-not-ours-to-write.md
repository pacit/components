# 0039 — A state the platform publishes is not ours to write

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-native-input`](../requirements/api.md#req-api-native-input)
**Evidence:** three engines, on a page each of them really parsed —
`role="switch"` on a `<button>` and on a `<div>` with no `aria-checked` is a **critical**
`aria-required-attr` in chromium, firefox and webkit alike, while the same role on
`<input type="checkbox">` draws nothing; Chromium's own accessibility tree reports that input
as `switch … checked=true` with the attribute never written, and reports `checked=true` again
when an `aria-checked="false"` is written **beside** a checked box
([`lesson-112`](../lessons.md#lesson-112)). `libs/components/switch/src/switch.spec.ts` and
`apps/sandbox-e2e/src/switch.spec.ts` hold the promise afterwards

## Context

The field phase opens with the switch, and the checkbox's card has been saying since v0 that it is a
separate component "despite the same `FormCheckboxControl` contract, because the semantics differ".
That sentence settles the packaging and none of the three questions the control actually asks:

1. **What element carries `role="switch"`?** The APG shows two examples, one on a native
   checkbox and one on a `<div>` the author wires up.
2. **Does the component write `aria-checked`?** `switch` declares it as a **required** state,
   and `PctCheckbox` one directory over writes it on every render (it did until plan item 4.9
   took the binding out on this decision's own measurement — inert there as well).
3. **Is there a third state?** The checkbox has `indeterminate`, and the two controls share a
   contract.

Only the first looks like a decision. The other two are the ones that cost something.

## The element: the native input, and the reason is an audit rather than a taste

A `<button role="switch">` is a perfectly ordinary way to build this, and it fails on a
measurement that has nothing to do with looks: **`aria-checked` is required for the role, and
a button has no checkedness for anyone to derive it from.** With the attribute unwritten, the
audit reports a critical `aria-required-attr` — in all three engines, from the element itself.
So the button road does not merely _allow_ the component to publish the state, it **obliges**
it to, on every render, for ever.

The native `<input type="checkbox">` is handed the same role and reports nothing, because the
element's own checkedness satisfies the state. Everything else it keeps is the checkbox's
argument repeated: `<label for>` activation, `Space`, form participation, `disabled`, and a
`checked` property signal forms can write. The library takes the road where the platform is
the implementation ([`req-api-platform`](../requirements/api.md#req-api-platform)) — and here
that is not a preference, it is the difference between a green audit and a red one.

## The state: written by us, read by nobody

With the element settled, question 2 answers itself in the wrong direction if you only read
the specification: `aria-checked` is required, so write it. What the measurement says is that
on a native checkbox the attribute is **inert**. Chromium's accessibility tree, asked
directly, reports the checked state of an `<input type="checkbox" checked aria-checked="false">`
as `checked=true`; the native property wins and the ARIA attribute is not consulted at all.
Playwright's spec-shaped computation agrees, in all three engines.

An attribute that cannot be right is an attribute that cannot be **wrong**, and that is the
whole finding: it can drift from the state it claims to mirror and nothing — not a unit test
reading the DOM, not an axe audit, not a reader — will say so. So `PctSwitch` writes no
`aria-checked`, and its unit and e2e cases assert the **absence**, because the absence is the
promise ([`lesson-112`](../lessons.md#lesson-112)).

This is a fact about `PctCheckbox` too, and the honest thing to say is that the checkbox has been
writing an inert attribute since v0 — its `ariaChecked` computed, the binding and the e2e assertion
that reads it all measure a string the library writes to itself. Repairing it moves a public part of
the rendered DOM and belongs to a step of its own, so it is written down as a finding of its own
rather than quietly folded into this one.

## The third state: the type is the gate, because nothing else is

ARIA gives `switch` `true` and `false`. `mixed` is not among them — and the audit **does not
check**: `aria-checked="mixed"` written over `role="switch"` drew not one violation in any
engine, with every rule enabled, best practices included. This is the same shape as the
finding the window left behind (`aria-setsize` has no rule either): a promise on the page that
no machine reads.

The answer is not a gate of ours, because there is nothing to gate. `PctSwitch` declares **no
`indeterminate` input**, so the state cannot be asked for: the consumer's compiler refuses the
binding, which is a stronger control than any run, and the difference between the two controls
stops being a rule somebody has to remember.

## What it costs

- **Two components that look like one.** `PctSwitch` and `PctCheckbox` share the contract, the
  chrome integration and most of the class, and they are not merged: the role and the third
  state are the difference, and both are decided per element rather than per input. That is
  0034's rule read once more — a tag is what the type cannot say otherwise — arriving at the
  same answer from the ARIA side instead of the generic one.
- **A drawing rather than an icon.** The thumb is a `<span>` the stylesheet moves, not a
  `pct-icon`: there is nothing to draw, so there is nothing to replace. It is why `./switch`
  costs 11905 B against the checkbox's 14493 and takes neither `./icon` nor
  `@angular/common`.
- **A state carried by geometry.** The thumb's travel is `inset-inline-start`, which is both
  the logical property and an animatable length — one declaration that mirrors under
  `dir="rtl"` and still transitions. The e2e case measures the position in both directions
  rather than reading the sheet, and the forced-colors case asserts that the two states are
  the **same colour** after the palette swap, because position is what tells them apart.
