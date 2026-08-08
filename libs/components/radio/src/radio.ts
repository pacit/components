import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';
import { PctRadioGroup } from './radio-group';

/**
 * A single option inside `pct-radio-group`. **Not a form control of its own** — the group
 * holds the state (req-api-signal-forms). It stands on a native `<input type="radio">` with a
 * shared `name`, so arrow navigation and Tab behaviour come from the browser rather than from
 * a roving-tabindex implementation of ours.
 *
 * @example
 * <pct-radio value="pro">Pro plan</pct-radio>
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
})
export class PctRadio<T = string> {
  protected readonly group = inject<PctRadioGroup<T>>(PctRadioGroup);

  /** The value this option stands for. */
  readonly value = input.required<T>();

  /** Disables a single option; the group can disable them all. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

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

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }
}
