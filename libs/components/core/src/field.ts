import {
  computed,
  DestroyRef,
  inject,
  InjectionToken,
  Signal,
} from '@angular/core';

/** Minimal structural shape of a validation error — keeps `core` free of any forms API. */
export interface PctValidationError {
  readonly message?: string;
}

/**
 * How the label is bound to the control:
 * - `for` — the label points at a single element (`<label for>`): text field, select, date,
 * - `labelledby` — the label names a container (`aria-labelledby`): radio group, field set.
 */
export type PctLabelStrategy = 'for' | 'labelledby';

/**
 * Whether the chrome draws a field border around the control.
 * - `boxed` — text field, select, date: a border belongs there,
 * - `bare` — checkbox, radio group: a border around those looks foreign, so the chrome
 *   supplies the label, the hint and the error message only.
 */
export type PctFieldAppearance = 'boxed' | 'bare';

/**
 * Cursor over the field surface. The border is one clickable area, so the cursor has to
 * announce what a click will do over **all** of it, not just over the control itself:
 * - `text` — a click places the caret (text, number),
 * - `pointer` — a click opens or toggles (select, date),
 * - `default` — a control with no border (`bare`), or a neutral one.
 *
 * The control reports it, not the chrome stylesheet: otherwise `field.scss` would have to
 * know the classes of every control one by one, and each new one would start from that bug.
 */
export type PctFieldCursor = 'text' | 'pointer' | 'default';

/**
 * The contract by which a control presents itself to the `pct-field` chrome. The chrome is
 * presentational: it reads the control's state and hands back the ids of its descriptions
 * (`aria-describedby`).
 */
export interface PctFieldControl {
  /** Id of the element the label is to target / be named by. */
  readonly controlId: string;
  readonly labelStrategy: PctLabelStrategy;
  /** `boxed` unless the control says otherwise. */
  readonly fieldAppearance?: PctFieldAppearance;
  /** `default` unless the control says otherwise. */
  readonly fieldCursor?: PctFieldCursor;
  readonly invalid: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly errors: Signal<readonly PctValidationError[]>;
  /** The chrome passes the hint and error ids; the control exposes them on itself. */
  setDescribedBy(ids: string | null): void;
  /**
   * Focuses the control. The chrome calls this when the user clicks the field area outside
   * the control itself (border padding, the gap between decorations) — otherwise a "dead
   * zone" appears, where a click does nothing.
   */
  focus?(options?: FocusOptions): void;
  /**
   * Activates the control the way a click on it would. The chrome calls this after a click
   * on the border outside the control — otherwise `cursor: pointer` over a select's whole
   * border would promise the list opening while a click in the padding only moved focus.
   * Text controls do not implement it: for them `focus()` is the whole answer to a click.
   */
  activate?(): void;
  /**
   * For `labelStrategy: 'labelledby'` the chrome passes the id of its label — a container
   * control (a radio group, say) exposes it as `aria-labelledby`, because `<label for>` does
   * not name a group of elements.
   */
  setLabelledBy?(id: string | null): void;
}

/** The chrome API visible to inner controls. */
export interface PctFieldApi {
  /** A control registers itself with the chrome (called from its constructor). */
  attach(control: PctFieldControl): void;
  /**
   * A control unregisters itself when it is destroyed. Without the other half of the pair the
   * chrome would go on reading the state of a control that has left the DOM — a signal
   * outlives the component that owns it and answers with the last value it held — and it
   * would have no way of telling **one control replaced** (`@if` around it) from **two
   * controls at once**, which is a defect it is meant to report.
   *
   * A call from a control that is not the current one is ignored: that is a late goodbye from
   * one already replaced, not a request to empty the chrome.
   */
  detach(control: PctFieldControl): void;
  /**
   * The field border element — the surface a control with an overlay of its own (select,
   * and date in the future) aligns its panel to. Inside the chrome a control stands in a
   * column inset from the border by padding and decorations, so a panel anchored to the
   * control would be narrower than the field and offset. The edge the user sees is the
   * chrome's border, and it is what sets the panel width.
   */
  readonly surface: Signal<HTMLElement | null>;
}

/**
 * Token provided by `pct-field`. Controls inject it **optionally**: its presence means "I am
 * inside the chrome, I hand over the label and the messages". That way controls with a layout
 * of their own (checkbox, radiogroup) work both standalone and inside `pct-field`.
 */
export const PCT_FIELD = new InjectionToken<PctFieldApi>('PCT_FIELD');

/**
 * Registers a control with the chrome and books its unregistration for the moment it is
 * destroyed. Called from a control's constructor, that being an injection context — the
 * `DestroyRef` is what makes the pair symmetrical without every control repeating it
 * ([`lesson-21`](../../../../docs/lessons.md#lesson-21): the same three lines in five
 * controls are a fix that has to be made five times).
 *
 * `api` is nullable, because a control inside the chrome and the same control standing alone
 * are the same class: with no chrome there is nothing to register with, and nothing to
 * unregister from either.
 */
export function pctAttachToField(
  api: PctFieldApi | null,
  control: PctFieldControl,
): void {
  if (api === null) return;
  api.attach(control);
  inject(DestroyRef).onDestroy(() => api.detach(control));
}

/**
 * Shared message logic: the text of the first error, and gating visibility on `touched`.
 * Extracted because it was being copied into every control separately — a fix then had to be
 * repeated N times (req-api-wrapper).
 */
export function pctFieldMessages(src: {
  invalid: Signal<boolean>;
  touched: Signal<boolean>;
  errors: Signal<readonly PctValidationError[]>;
}) {
  const errorText = computed(() => src.errors()?.[0]?.message ?? '');
  /** An error is signalled only once touched — an empty form does not glow red. */
  const showInvalid = computed(() => src.invalid() && src.touched());
  const showError = computed(() => showInvalid() && errorText() !== '');
  return { errorText, showInvalid, showError };
}

/** Builds `aria-describedby` out of ids, skipping the inactive ones. */
export function pctDescribedBy(
  parts: readonly (readonly [id: string, active: boolean])[],
): string | null {
  const ids = parts.filter(([, active]) => active).map(([id]) => id);
  return ids.length > 0 ? ids.join(' ') : null;
}
