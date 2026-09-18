import {
  booleanAttribute,
  Component,
  computed,
  afterRenderEffect,
  contentChildren,
  ElementRef,
  inject,
  InjectionToken,
  input,
  isDevMode,
  model,
  output,
  signal,
  type Signal,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  pctDescribedBy,
  pctAttachToField,
  pctFieldMessages,
  PctCompareWith,
  PctFieldAppearance,
  PctFieldControl,
  PctLabelStrategy,
  pctSameValue,
} from '@pacit/components/core';

/**
 * What the group needs to know about an option, and nothing more: the value it stands for and
 * a name to call it by in a message. Declared HERE, beside the group, so that the option can
 * provide it while importing the group — the other direction (`contentChildren(PctRadio)`)
 * would close the import cycle.
 *
 * The value is `unknown` rather than a generic: one token serves every `T`, and the group is
 * the only place that knows which `T` its own options were written for.
 *
 * @since 0.1.0
 */
export interface PctRadioOption {
  readonly value: Signal<unknown>;
  /** The option's visible text (or its `ariaLabel`) — what tells two of them apart. */
  label(): string;
}

/**
 * The channel through which `pct-radio` announces itself to the group.
 *
 * @since 0.1.0
 */
export const PCT_RADIO_OPTION = new InjectionToken<PctRadioOption>(
  'PCT_RADIO_OPTION',
);

/**
 * A single-choice group. **The group is the form control** (`FormValueControl`), not the
 * individual options — from the form's point of view a radiogroup edits one value
 * (req-api-signal-forms).
 *
 * The options (`pct-radio`) use native `<input type="radio">` elements with a shared `name`
 * attribute, so the browser itself provides arrow navigation and correct Tab behaviour (only
 * the selected option is focusable).
 *
 * The value is of any type `T` (a string by default): the group does not read it from the DOM
 * — the native radio's `value` attribute is a description only, and the choice is reported by
 * `pct-radio`, handing over the value it was given as an input. An option can therefore be a
 * union member or an entity, not just a string.
 *
 * @example
 * <pct-radio-group label="Plan" [formField]="form.plan">
 *   <pct-radio value="free">Free</pct-radio>
 *   <pct-radio value="pro">Pro</pct-radio>
 * </pct-radio-group>
 *
 * @example
 * // `T` comes from the binding; the options have to supply a value of the same type.
 * <pct-radio-group [(value)]="size">
 *   <pct-radio [value]="'sm'">Small</pct-radio>
 * </pct-radio-group>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
  host: {
    class: 'pct-radio-group',
    role: 'radiogroup',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    // `aria-readonly` belongs to the GROUP, not to an option: the `radio` role does not
    // support it (`radiogroup` does), and an attribute disallowed for a role is a critical
    // violation, not a cosmetic one (`lesson-33`).
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.data-pct-orientation]': 'orientation()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctRadioGroup<T = string>
  implements FormValueControl<T | null>, PctFieldControl
{
  /**
   * The selected value — a required field of the `FormValueControl` contract. `null` means
   * "no option is selected": the state the group is born in and the one a reset returns to.
   *
   * @since 0.1.0
   */
  readonly value = model<T | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Disables every option at once — each native radio takes it, so the group leaves the tab order. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Holds the choice while the options stay focusable; `aria-readonly` goes on the group, because the `radio` role has none.
   *
   * @since 0.1.0
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * The form's verdict; shown only once `touched`, so an empty form does not open red.
   *
   * @since 0.1.0
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /**
   * Whether the user has left the field once; with `invalid` it gates the error face.
   *
   * @since 0.1.0
   */
  readonly touched = input(false, { transform: booleanAttribute });

  /**
   * Marks the label with the required sign; with `[formField]` it follows the schema's `required()`.
   *
   * @since 0.1.0
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's validation errors; the first one's `message` takes the hint's place once the field is touched.
   *
   * @since 0.1.0
   */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /**
   * The shared `name` attribute of the native radios; generated by default.
   *
   * @since 0.1.0
   */
  readonly name = input<string>('');

  /**
   * Emitted on blur — lets the form mark the field as touched.
   *
   * @since 0.1.0
   */
  readonly touch = output<void>();

  // --- component API ---

  /**
   * The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name.
   *
   * @since 0.1.0
   */
  readonly label = input<string>('');

  /**
   * A line of help under the control, outside a `pct-field`; the first error message takes its place while the field is invalid and touched.
   *
   * @since 0.1.0
   */
  readonly hint = input<string>('');

  /**
   * Which axis the options run along; written to `aria-orientation` and to the state attribute the stylesheet lays the group out by.
   *
   * @since 0.1.0
   */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /**
   * Value equality — as in `pct-select`; entities are compared by key.
   *
   * @since 0.1.0
   */
  readonly compareWith = input<PctCompareWith<T>>(pctSameValue);

  /**
   * The "no choice" value, set when the form is reset.
   *
   * @since 0.1.0
   */
  readonly emptyValue = input<T | null>(null);

  /** The options are content projected from outside, so the host DOM is what gets queried —
      a `viewChildren` query does not see the templates of child components, and
      `contentChildren(PctRadio)` would create a circular import. The native controls are read
      through the DOM; what the options MEAN is read through a token (`PCT_RADIO_OPTION`),
      which the class import would have made impossible and a token does not. */
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly options = contentChildren(PCT_RADIO_OPTION);

  private controls(): HTMLInputElement[] {
    return Array.from(
      this.hostRef.nativeElement.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]',
      ),
    );
  }

  // --- a11y ---

  private readonly uid = nextPctId('pct-radio-group');
  protected readonly labelId = `${this.uid}-label`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  /**
   * The name that groups the native radios — without it the browser makes no group.
   *
   * @since 0.1.0
   */
  readonly groupName = computed(() => this.name() || this.uid);

  // --- working with the chrome (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  /**
   * A group is named through `aria-labelledby`, not `<label for>`.
   *
   * @since 0.1.0
   */
  readonly controlId = this.uid;
  /**
   * `labelledby`: a group has no single element for a label to point at, so the chrome names it.
   *
   * @since 0.1.0
   */
  readonly labelStrategy: PctLabelStrategy = 'labelledby';
  /**
   * `bare`: a border around a set of radios looks foreign, so the chrome draws none.
   *
   * @since 0.1.0
   */
  readonly fieldAppearance: PctFieldAppearance = 'bare';

  private readonly fieldDescribedBy = signal<string | null>(null);
  private readonly fieldLabelledBy = signal<string | null>(null);

  /**
   * The chrome hands over the ids of its hint and error, and the group describes itself by them.
   *
   * @since 0.1.0
   */
  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  /**
   * The chrome hands over the id of its label, and the group is named by it instead of by its own.
   *
   * @since 0.1.0
   */
  setLabelledBy(id: string | null): void {
    this.fieldLabelledBy.set(id);
  }

  /** The group's name: the chrome's label, or its own. */
  protected readonly labelledBy = computed(() =>
    this.inField ? this.fieldLabelledBy() : this.label() ? this.labelId : null,
  );

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  /**
   * Whether the group reads as invalid right now, by the chrome's own rule: invalid and touched.
   *
   * @since 0.1.0
   */
  readonly showInvalid = this.messages.showInvalid;

  protected readonly showError = computed(
    () => !this.inField && this.messages.showError(),
  );

  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
        ]),
  );

  constructor() {
    pctAttachToField(this.fieldApi, this);

    // An effect and not a one-off: the options can be written by a `@for` over data, and the
    // list that duplicates a value is usually the second one — the one from the server. And
    // `afterRenderEffect` rather than `effect`, because a query sees an option created inside
    // an embedded view BEFORE its inputs are bound: reading a required input there throws
    // NG0950, and it throws for `@for` options only — that is, for exactly the case this
    // report exists for (`lesson-72`).
    if (isDevMode()) afterRenderEffect(() => this.warnOnDuplicateValues());
  }

  /**
   * Whether a given option is selected (used by `pct-radio`). The absence of a choice is
   * filtered out before the comparison — the application's comparator only ever receives the
   * values it was written for.
   *
   * @since 0.1.0
   */
  isSelected(optionValue: T): boolean {
    const current = this.value();
    if (current === null || current === undefined) return false;
    return this.compareWith()(current, optionValue);
  }

  /**
   * Two options that `compareWith` calls equal. The comparison is pairwise and therefore
   * O(n²), for the reason it is in `pct-select`: the comparator belongs to the application, so
   * a `Set` has a key only for the default identity and a scan that measured one case and not
   * the other would be worse than one that measures both. It runs under `isDevMode()` alone.
   *
   * The values arrive as `unknown` from the token and are handed to the comparator as `T`: the
   * options of a group are written for the group's own `T`, and this is the one place that
   * knows it.
   */
  private warnOnDuplicateValues(): void {
    const options = this.options();
    const same = this.compareWith();
    const pairs: string[] = [];

    for (let i = 1; i < options.length; i++) {
      for (let j = 0; j < i; j++) {
        if (!same(options[j].value() as T, options[i].value() as T)) continue;
        // Reported against the first option that claims the value — as in the select, so that
        // one list of positions reads the same way in both components.
        pairs.push(
          `${j} ("${options[j].label()}") and ${i} ("${options[i].label()}")`,
        );
        break;
      }
    }
    if (pairs.length === 0) return;

    console.warn(
      `[pct-radio-group] Options with the same value: ${pairs.join(', ')}. ` +
        `A value maps back to an option through \`compareWith\`, and EVERY option it ` +
        `matches paints itself selected — while the native radios share a \`name\`, so ` +
        `the browser keeps only the LAST of them checked. The user sees two chosen ` +
        `options where a screen reader announces one. Give the options distinct values, ` +
        `or a \`compareWith\` that tells them apart.`,
    );
  }

  /**
   * Selects an option; ignored in readonly mode.
   *
   * @since 0.1.0
   */
  select(optionValue: T): void {
    if (this.readonly()) return;
    this.value.set(optionValue);
  }

  /**
   * Says the group was left, which is what lets a message appear.
   *
   * @since 0.1.0
   */
  markTouched(): void {
    this.touch.emit();
  }

  /**
   * Called by signal forms — focuses the selected option, or the first one.
   *
   * @since 0.1.0
   */
  focus(options?: FocusOptions): void {
    const controls = this.controls();
    const target = controls.find((c) => c.checked) ?? controls[0];
    target?.focus(options);
  }

  /**
   * Called by signal forms when the form is reset.
   *
   * @since 0.1.0
   */
  reset(): void {
    this.value.set(this.emptyValue());
  }
}
