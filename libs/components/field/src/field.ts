import {
  booleanAttribute,
  Component,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  pctDescribedBy,
  pctFieldMessages,
  PctFieldApi,
  PctFieldControl,
} from '@pacit/components/core';
import { PctLabelAux, PctMessageAux } from './aux';
import { PctFieldSize } from './field.types';

/**
 * Obudowa pola formularza: etykieta, podpowiedź, komunikat błędu, znacznik
 * wymagalności oraz sloty `[pctPrefix]` / `[pctSuffix]` wewnątrz pola.
 *
 * Pod polem jest **jedna linia**: podpowiedź albo błąd (błąd ma pierwszeństwo).
 * Dwa dodatkowe sloty wyrównane do prawej niosą treść poboczną: `[pctLabelAux]`
 * w wierszu etykiety (np. ikona „i") i `[pctMessageAux]` w wierszu komunikatu
 * (np. licznik znaków).
 *
 * Obudowa jest **prezentacyjna** — kontraktu formularza nie implementuje ona,
 * lecz kontrolka w środku (`wym-api-13`). Dzięki temu typowanie wartości
 * zostaje przy rodzaju pola (`string`, `number`, `Date`, `string[]`).
 *
 * Kontrolka rejestruje się przez token `PCT_FIELD`; obudowa czyta jej stan
 * i oddaje jej identyfikatory opisów do `aria-describedby`.
 *
 * @example
 * <pct-field label="E-mail" hint="Adres służbowy">
 *   <input pctText type="email" [formField]="f.email" />
 * </pct-field>
 */
@Component({
  selector: 'pct-field',
  templateUrl: './field.html',
  styleUrl: './field.scss',
  providers: [{ provide: PCT_FIELD, useExisting: PctField }],
  host: {
    class: 'pct-field',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-appearance]': 'appearance()',
    '[attr.data-pct-cursor]': 'cursor()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctField implements PctFieldApi {
  private readonly config = inject(PCT_CONFIG);

  readonly label = input<string>('');
  readonly hint = input<string>('');

  /**
   * Wielkość pola; domyślnie z globalnej konfiguracji (wym-api-8). Dotyczy
   * **wiersza pola** — wysokość jest tu ta sama co przycisku tej samej
   * wielkości, bo obie biorą ją z tokenu `--pct-control-height-*` (wym-api-18).
   */
  readonly size = input<PctFieldSize>(this.config.defaultSize);

  /** Wymagalność można podać wprost, gdy kontrolka jej nie zgłasza. */
  readonly required = input(false, { transform: booleanAttribute });

  private readonly control = signal<PctFieldControl | null>(null);

  // Obecność slotów pobocznych decyduje o tym, czy w ogóle rysować ich wiersz —
  // pusty wiersz etykiety/komunikatu dokładałby tylko odstęp. Zapytania celują
  // w dyrektywy, więc consument musi je zaimportować (jak `pctPrefix`).
  protected readonly labelAux = contentChild(PctLabelAux);
  protected readonly messageAux = contentChild(PctMessageAux);

  private readonly uid = nextPctId('pct-field');
  protected readonly labelId = `${this.uid}-label`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // Stan pochodzi z zarejestrowanej kontrolki; bez niej obudowa jest neutralna.
  private readonly invalid = computed(() => this.control()?.invalid() ?? false);
  private readonly touched = computed(() => this.control()?.touched() ?? false);
  protected readonly disabled = computed(
    () => this.control()?.disabled() ?? false,
  );
  private readonly errors = computed(() => this.control()?.errors() ?? []);

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  protected readonly showInvalid = this.messages.showInvalid;
  protected readonly showError = this.messages.showError;

  /** Wymagalność: własne wejście albo zgłoszona przez kontrolkę. */
  protected readonly isRequired = computed(
    () => this.required() || (this.control()?.required() ?? false),
  );

  /** Etykieta wskazuje kontrolkę (`for`) albo ją nazywa (`aria-labelledby`). */
  protected readonly labelFor = computed(() => {
    const c = this.control();
    return c && c.labelStrategy === 'for' ? c.controlId : null;
  });

  /** Ramkę rysujemy tylko dla kontrolek, którym ona przystaje (`wym-api-16`). */
  protected readonly appearance = computed(
    () => this.control()?.fieldAppearance ?? 'boxed',
  );

  /** Kursor nad ramką zgłasza kontrolka; wyłączenie przykrywa go w CSS. */
  protected readonly cursor = computed(
    () => this.control()?.fieldCursor ?? 'default',
  );

  attach(control: PctFieldControl): void {
    this.control.set(control);
  }

  /**
   * Czy zdarzenie trafiło w element, do którego obudowa nie sięga — wtedy nie
   * miesza się do kliknięcia.
   */
  private handledByTarget(event: MouseEvent): boolean {
    const target = event.target as HTMLElement | null;
    return target?.closest(PctField.ownSurface) != null;
  }

  /**
   * Sama kontrolka i elementy interaktywne obsłużą kliknięcie same. Dekoracja
   * `fill` niczego nie obsługuje, ale jest własną powierzchnią: skoro pokazuje
   * własny kursor, klik w nią nie może po cichu robić czegoś innego.
   */
  private static readonly ownSurface =
    'button, a, input, textarea, select, [tabindex], [data-pct-fit="fill"]';

  /**
   * Klik w obszar pola, który nie jest kontrolką (padding ramki, odstęp między
   * dekoracjami), przekazujemy kontrolce. Bez tego powstaje „martwa strefa":
   * kursor jest wewnątrz ramki, ale kliknięcie nie ustawia fokusu.
   */
  protected onRowPointerDown(event: MouseEvent): void {
    if (this.handledByTarget(event)) return;
    // Zapobiega utracie fokusu przy kliknięciu w tło rzędu.
    event.preventDefault();
    this.control()?.focus?.();
  }

  /**
   * Uruchomienie kontrolki idzie po `click`, nie po `mousedown`: nakładka CDK
   * otwarta na `mousedown` zamknęłaby się od razu, biorąc dopełniający `click`
   * za kliknięcie poza panelem.
   */
  protected onRowClick(event: MouseEvent): void {
    if (this.handledByTarget(event)) return;
    this.control()?.activate?.();
  }

  constructor() {
    // Identyfikatory opisów należą do obudowy, ale wystawić je musi kontrolka
    // (to na niej ma być `aria-describedby`). To zapis do kontrolki, nie wartość
    // pochodna — więc effect, nie computed.
    // Pod polem świeci tylko jeden komunikat, więc `aria-describedby` wskazuje
    // dokładnie ten, który jest w DOM: błąd, a gdy go nie ma — podpowiedź.
    // Wskazanie na ukryty element byłoby wiszącą referencją dla czytnika.
    effect(() => {
      this.control()?.setDescribedBy(
        pctDescribedBy([
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
        ]),
      );
    });

    // Grupy (labelStrategy: 'labelledby') nazywa się przez aria-labelledby,
    // bo `<label for>` nie nazywa zbioru elementów.
    effect(() => {
      const c = this.control();
      if (!c || c.labelStrategy !== 'labelledby') return;
      c.setLabelledBy?.(this.label() ? this.labelId : null);
    });
  }
}
