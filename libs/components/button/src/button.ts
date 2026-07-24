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
 * Przycisk. Selektor atrybutowy na natywnym `<button>` — dzięki temu semantyka,
 * obsługa klawiatury i fokus działają natywnie (wym-api-6).
 *
 * @example
 * <button pct-button variant="outline" size="lg">Zapisz</button>
 */
@Component({
  selector: 'button[pct-button]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    class: 'pct-button',
    '[attr.data-pct-variant]': 'variant()',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-loading]': 'loading() ? "" : null',
    '[disabled]': 'isDisabled()',
    '[attr.aria-busy]': 'loading()',
  },
})
export class PctButton {
  private readonly config = inject(PCT_CONFIG);

  /** Wariant wizualny. */
  readonly variant = input<PctButtonVariant>('solid');

  /** Rozmiar; domyślnie z globalnej konfiguracji (wym-api-8). */
  readonly size = input<PctButtonSize>(this.config.defaultSize);

  /** Wyłączony. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Stan ładowania — blokuje przycisk i pokazuje spinner. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );
}
