import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';
import { PCT_RADIO_OPTION, PctRadioGroup } from './radio-group';

/**
 * A single option inside `pct-radio-group`. **Not a form control of its own** — the group
 * holds the state (req-api-signal-forms). It stands on a native `<input type="radio">` with a
 * shared `name`, so arrow navigation and Tab behaviour come from the browser rather than from
 * a roving-tabindex implementation of ours.
 *
 * @example
 * <pct-radio value="pro">Pro plan</pct-radio>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-radio',
  templateUrl: './radio.html',
  styleUrl: './radio.scss',
  host: {
    class: 'pct-radio',
    '[attr.data-pct-checked]': 'checked() ? "" : null',
    '[attr.data-pct-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-pct-invalid]': 'group.showInvalid() ? "" : null',
  },
  // The group reads its options through this token rather than through the class: it is the
  // group that `pct-radio` imports, so the query the other way round would close the cycle.
  // `forwardRef`, because the class is not defined yet where its own decorator is evaluated.
  providers: [
    {
      provide: PCT_RADIO_OPTION,
      useExisting: forwardRef(() => PctRadio),
    },
  ],
})
export class PctRadio<T = string> {
  protected readonly group = inject<PctRadioGroup<T>>(PctRadioGroup);

  /**
   * The value this option stands for.
   *
   * @since 0.1.0
   */
  readonly value = input.required<T>();

  /**
   * Disables a single option; the group can disable them all.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The accessible name of an option whose projected content is not text — an icon, a colour
   * swatch. An INPUT rather than an `aria-label` written on the tag, because the tag cannot
   * carry one: `role="radio"` sits on the `<input>` inside, the host has no role at all, and
   * an ARIA name on a roleless element is ignored
   * ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   *
   * It wins over the projected label — the accessible-name algorithm, not a choice of ours.
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands elsewhere on the page. It wins over both.
   *
   * @since 0.1.0
   */
  readonly ariaLabelledby = input<string>('');

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * What to call this option in a message from the group (`PCT_RADIO_OPTION`). The projected
   * content is the option's label, so it is read from the host rather than declared twice —
   * and `ariaLabel` wins, for the same reason it wins in the accessible name: where the
   * content is an icon or a swatch, the text is empty and the name is the only thing there is.
   *
   * @since 0.1.0
   */
  label(): string {
    return (
      this.ariaLabel() || (this.hostRef.nativeElement.textContent ?? '').trim()
    );
  }

  private readonly uid = nextPctId('pct-radio');
  protected readonly controlId = `${this.uid}-control`;

  protected readonly checked = computed(() =>
    this.group.isSelected(this.value()),
  );

  /**
   * The native `value` attribute describes the option but **takes no part in the choice**:
   * selecting sets `checked`, and `onChange()` reports the change by handing the group the
   * value from the input. Since a value can now be an object, the attribute is only exposed
   * for primitives — `String({})` would give `[object Object]`, a string that identifies
   * nothing and misleadingly looks like a value.
   */
  protected readonly valueAttr = computed(() => {
    const value = this.value();
    return typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
      ? String(value)
      : null;
  });
  protected readonly isDisabled = computed(
    () => this.disabled() || this.group.disabled(),
  );
  protected readonly name = computed(() => this.group.groupName());

  /** Readonly does not exist natively for a radio — the state change is blocked here. */
  protected onClick(event: Event): void {
    if (this.group.readonly()) {
      event.preventDefault();
    }
  }

  protected onChange(): void {
    this.group.select(this.value());
  }

  protected onBlur(): void {
    this.group.markTouched();
  }

  /**
   * Puts the focus on the radio's own input.
   *
   * @since 0.1.0
   */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }
}
