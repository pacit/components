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

  /** Picks the face. All five paint the same element; `hero` adds the drifting gradient and freezes it under reduced motion. */
  readonly variant = input<PctButtonVariant>('solid');

  /** Height 28 / 36 / 44 px — the axis every field shares, so rows line up. From `providePctConfig` by default (req-api-config). */
  readonly size = input<PctButtonSize>(this.config.defaultSize);

  /** Blocks the click and greys the face; the grey is written to survive forced colors. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Shows the spinner in the face's own colour and sets `aria-busy`. Does not block the click — pair it with `disabled` when it should. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );
}
