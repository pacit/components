import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { PCT_CONFIG } from '@pacit/components/core';
import { PctButtonSize, PctButtonVariant } from './button.types';

/**
 * Button. An attribute selector on a native `<button>`, so semantics, keyboard handling and
 * focus work natively (req-a11y-built-in).
 *
 * @example
 * <button pctButton variant="outline" size="lg">Save</button>
 */
@Component({
  selector: 'button[pctButton]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    class: 'pct-button',
    '[attr.data-pct-variant]': 'variant()',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-loading]': 'loading() ? "" : null',
    '[disabled]': 'isDisabled()',
    // Only while the button actually works. `aria-busy="false"` is the default value, so
    // writing it out adds nothing and stands in the accessibility tree of every button on
    // the page.
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
})
export class PctButton {
  private readonly config = inject(PCT_CONFIG);

  /** Visual variant. */
  readonly variant = input<PctButtonVariant>('solid');

  /** Size; taken from the global configuration by default (req-api-config). */
  readonly size = input<PctButtonSize>(this.config.defaultSize);

  /** Disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Loading state — blocks the button and shows a spinner. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );
}
