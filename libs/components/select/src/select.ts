import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctDescribedBy,
  pctFieldMessages,
  PctCompareWith,
  PctFieldAppearance,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
  pctSameValue,
  PctSize,
} from '@pacit/components/core';
import {
  PctSelectOption,
  PctSelectPanelAlign,
  PctSelectPanelWidth,
} from './select.types';

/**
 * Lista wyboru jednokrotnego z własnym panelem (nie natywny `<select>`).
 *
 * Realizuje wzorzec ARIA „select-only combobox": trigger ma `role="combobox"`,
 * panel `role="listbox"`, a fokus **nie opuszcza triggera** — aktywna opcja jest
 * wskazywana przez `aria-activedescendant`.
 *
 * Pozycjonowanie panelu opiera się na CDK Overlay (`wym-projekt-zaleznosci`) — to jedyna
 * dopuszczona zależność runtime. Obsługa klawiatury jest własna, bo dla
 * customowego listboxa nie ma natywnego odpowiednika (`wym-api-platforma`).
 *
 * Wartość jest dowolnego typu `T` (domyślnie napis) — patrz `PctSelectOption`.
 * Brak wyboru reprezentuje `emptyValue`, domyślnie `null`.
 *
 * @example
 * <pct-select label="Kraj" [options]="kraje" [formField]="form.country" />
 *
 * @example
 * // Wartości nienapisowe: `T` bierze się z listy opcji.
 * <pct-select [options]="priorytety" [(value)]="priorytet" />
 * // protected priorytety: PctSelectOption<number>[] = [{ value: 1, label: 'Niski' }];
 *
 * @example
 * // Encje: równość liczona po kluczu, bo po HTTP przychodzi inna instancja.
 * <pct-select [options]="miasta" [compareWith]="poId" [(value)]="miasto" />
 */
@Component({
  selector: 'pct-select',
  imports: [OverlayModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  host: {
    class: 'pct-select',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    // W obudowie ramkę i etykietę rysuje `pct-field` — kontrolka je oddaje.
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctSelect<T = string>
  implements FormValueControl<T | null>, PctFieldControl
{
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * Wybrana wartość — wymagane pole kontraktu `FormValueControl`. Typ jest
   * `T | null`, bo „nic nie wybrano" jest stanem osiągalnym dla każdego `T`:
   * lista startuje pusta i można z niej wyjść resetem formularza.
   *
   * `NoInfer` odbiera temu wiązaniu prawo **ustalania** `T` — typ bierze się
   * wyłącznie z listy opcji, a wartość jest wobec niego sprawdzana. Bez tego
   * `T` rozszerzał się do unii kandydatów (`string | number`) i lista liczb
   * z wartością napisową przechodziła kompilację, bo obie pasowały do unii.
   */
  readonly value = model<NoInfer<T> | null>(null);

  // --- FormUiControl (synchronizowane przez dyrektywę FormField) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  readonly touch = output<void>();

  // --- API komponentu ---

  readonly options = input<readonly PctSelectOption<T>[]>([]);
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly placeholder = input<string>(this.texts.selectPlaceholder);
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * Równość wartości. Domyślnie tożsamość, co dla napisów i liczb jest tym
   * samym co `===`. Encje wymagają porównania po kluczu — instancja z serwera
   * nie jest tą samą referencją co opcja na liście, więc bez tego wybrana
   * pozycja nie podświetlałaby się po wczytaniu formularza.
   */
  readonly compareWith = input<PctCompareWith<T>>(pctSameValue);

  /**
   * Wartość oznaczająca brak wyboru — ustawiana przy resecie formularza.
   * Domyślnie `null`, ale aplikacja z polem nienullowalnym (`plan: string`)
   * podaje własną (`emptyValue=""`), żeby reset nie wpisywał do modelu `null`
   * wbrew jego typowi.
   */
  readonly emptyValue = input<NoInfer<T> | null>(null);

  /**
   * Szerokość rozwijanego panelu — domyślnie równa kontrolce (`'field'`).
   * Panel wychodzi wtedy dokładnie z jej krawędzi, więc lista czyta się jak
   * przedłużenie pola. `'auto'` dopasowuje szerokość do najdłuższej opcji
   * (nie zwężając panelu poniżej kontrolki), a długość CSS ustawia ją wprost.
   */
  readonly panelWidth = input<PctSelectPanelWidth>('field');

  /** Wyrównanie panelu do kontrolki, gdy jest od niej szerszy lub węższy. */
  readonly panelAlign = input<PctSelectPanelAlign>('start');

  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  // --- a11y ---

  private readonly uid = nextPctId('pct-select');
  protected readonly triggerId = `${this.uid}-trigger`;
  protected readonly labelId = `${this.uid}-label`;
  protected readonly listboxId = `${this.uid}-listbox`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- współpraca z obudową (wym-api-obudowa) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });

  /** Czy kontrolka jest w obudowie — wtedy oddaje jej etykietę i komunikaty. */
  protected readonly inField = this.fieldApi !== null;

  /** `<button>` jest elementem etykietowalnym, więc `<label for>` działa. */
  readonly controlId = this.triggerId;
  readonly labelStrategy: PctLabelStrategy = 'for';
  readonly fieldAppearance: PctFieldAppearance = 'boxed';
  readonly fieldCursor: PctFieldCursor = 'pointer';

  /** Klik w ramkę poza triggerem otwiera listę — tak jak klik w sam trigger. */
  activate(): void {
    this.toggle();
  }

  /** Ustawiane przez obudowę, gdy jest obecna. */
  private readonly fieldDescribedBy = signal<string | null>(null);

  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);

  /**
   * Panel renderuje się w nakładce CDK, poza drzewem hosta, więc kaskada
   * scoped theme (`wym-token-scoped`) do niego nie dociera. Przenosimy więc motyw
   * z najbliższego przodka hosta na sam panel.
   */
  protected readonly panelTheme = signal<string | null>(null);

  /**
   * Z tego samego powodu panel nie dziedziczy pisma — poza drzewem hosta bierze
   * je z `body`, czyli domyślną szeryfową czcionkę przeglądarki zamiast
   * czcionki aplikacji. Krój należy do aplikacji (nie ma dla niego tokenu),
   * a wielkość do kontekstu kontrolki: w obudowie ustawia ją `pct-field[size]`,
   * samodzielnej — własny `size`. Dlatego jedno i drugie odczytujemy z triggera
   * przy otwarciu: panel pisze dokładnie tym, czym pisze widoczna kontrolka.
   */
  protected readonly panelFont = signal<{
    family: string;
    size: string;
  } | null>(null);

  /**
   * Szerokość panelu i punkt zaczepienia: w obudowie ramkę rysuje `pct-field`,
   * więc panel równa się z **nią**, a nie z triggerem stojącym w kolumnie
   * odsuniętej o padding i dekoracje. Samodzielna kontrolka jest własną ramką.
   */
  protected readonly anchor = computed(() => this.fieldApi?.surface() ?? null);

  /** Zmierzona przy otwarciu szerokość kotwicy — odniesienie dla panelu. */
  private readonly anchorWidth = signal(0);

  /**
   * Szerokość przekazywana nakładce. Pusty napis znaczy „nie ustawiaj" —
   * wtedy o szerokości decyduje treść, a `overlayMinWidth` pilnuje dolnej
   * granicy, żeby panel nie był węższy od kontrolki.
   */
  protected readonly overlayWidth = computed(() => {
    const width = this.panelWidth();
    if (width === 'auto') return '';
    return width === 'field' ? this.anchorWidth() : width;
  });

  protected readonly overlayMinWidth = computed(() =>
    this.panelWidth() === 'auto' ? this.anchorWidth() : '',
  );

  /**
   * Panel schodzi pod kontrolkę, a przy braku miejsca na dole wskakuje nad nią
   * (druga pozycja). W poziomie trzyma się zadeklarowanego wyrównania —
   * o mieszczenie się w oknie dba `push` strategii CDK.
   */
  protected readonly panelPositions = computed<ConnectedPosition[]>(() => {
    const x = this.panelAlign();
    return [
      { originX: x, originY: 'bottom', overlayX: x, overlayY: 'top' },
      { originX: x, originY: 'top', overlayX: x, overlayY: 'bottom' },
    ];
  });

  /** Indeks opcji aktywnej klawiaturą (nie to samo co wybrana). */
  protected readonly activeIndex = signal(-1);

  /**
   * Indeks wybranej opcji (`-1`, gdy żadna). Liczymy **indeks**, a nie samą
   * opcję, bo szablon i tak porównuje po pozycji — inaczej każdy wiersz listy
   * wołałby porównanie przy każdym przebiegu detekcji.
   *
   * `null`/`undefined` odsiewamy przed porównaniem: własny komparator dostaje
   * wtedy tylko wartości, które sam zadeklarował (`(a, b) => a.id === b.id`
   * na `null` by wybuchł).
   */
  protected readonly selectedIndex = computed(() => {
    const current = this.value();
    if (current === null || current === undefined) return -1;
    const same = this.compareWith();
    return this.options().findIndex((o) => same(o.value, current));
  });

  protected readonly selectedOption = computed(
    () => this.options()[this.selectedIndex()] ?? null,
  );

  protected readonly displayText = computed(
    () => this.selectedOption()?.label ?? '',
  );

  // Wspólna logika komunikatów z `core` — bez duplikowania w każdej kontrolce.
  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  readonly showInvalid = this.messages.showInvalid;

  /** W obudowie komunikat renderuje ona, nie kontrolka. */
  protected readonly showError = computed(
    () => !this.inField && this.messages.showError(),
  );

  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.hintId, this.hint() !== ''],
          [this.errorId, this.messages.showError()],
        ]),
  );

  /** Id aktywnej opcji dla `aria-activedescendant`. */
  protected readonly activeOptionId = computed(() => {
    const i = this.activeIndex();
    return this.open() && i >= 0 ? this.optionId(i) : null;
  });

  protected optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  constructor() {
    this.fieldApi?.attach(this);

    // Aktywna opcja musi być widoczna na liście przewijanej.
    effect(() => {
      const i = this.activeIndex();
      if (!this.open() || i < 0) return;
      // Indeksujemy listę zamiast budować selektor po id — nie wymaga
      // `CSS.escape` (brak w jsdom) i wprost odpowiada semantyce activeIndex.
      const el = this.panel()?.nativeElement.querySelectorAll<HTMLElement>(
        '[data-pct-part="option"]',
      )[i];
      el?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  // --- interakcja ---

  private get interactive(): boolean {
    return !this.disabled() && !this.readonly();
  }

  protected toggle(): void {
    if (!this.interactive) return;
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  protected openPanel(): void {
    if (!this.interactive) return;
    const trigger = this.trigger().nativeElement;
    this.panelTheme.set(
      this.hostRef.nativeElement
        .closest('[data-theme]')
        ?.getAttribute('data-theme') ?? null,
    );
    const style = getComputedStyle(trigger);
    this.panelFont.set({ family: style.fontFamily, size: style.fontSize });
    this.anchorWidth.set((this.anchor() ?? trigger).offsetWidth);
    this.open.set(true);
    // Aktywna staje się wybrana opcja, a bez wyboru pierwsza dostępna.
    const selected = this.selectedIndex();
    this.activeIndex.set(selected >= 0 ? selected : this.firstEnabled());
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  protected selectAt(index: number): void {
    const option = this.options()[index];
    if (!option || option.disabled || !this.interactive) return;
    this.value.set(option.value);
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive) return;
    const key = event.key;

    if (!this.open()) {
      // Otwarcie: strzałki, Enter, spacja lub Alt+strzałka w dół.
      if (
        key === 'ArrowDown' ||
        key === 'ArrowUp' ||
        key === 'Enter' ||
        key === ' '
      ) {
        event.preventDefault();
        this.openPanel();
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(this.firstEnabled());
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(this.lastEnabled());
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectAt(this.activeIndex());
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        // Tab zamyka listę i pozwala wyjść z kontrolki.
        this.close();
        break;
      default:
        if (key.length === 1) this.typeahead(key);
    }
  }

  // --- nawigacja ---

  private enabledIndexes(): number[] {
    return this.options()
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
  }

  private firstEnabled(): number {
    const list = this.enabledIndexes();
    return list.length > 0 ? list[0] : -1;
  }

  private lastEnabled(): number {
    const list = this.enabledIndexes();
    return list.length > 0 ? list[list.length - 1] : -1;
  }

  /** Przesuwa aktywną opcję, pomijając wyłączone; bez zawijania (jak natywny select). */
  private moveActive(delta: number): void {
    const list = this.enabledIndexes();
    if (list.length === 0) return;
    const current = list.indexOf(this.activeIndex());
    if (current === -1) {
      this.activeIndex.set(delta > 0 ? list[0] : list[list.length - 1]);
      return;
    }
    const next = Math.min(Math.max(current + delta, 0), list.length - 1);
    this.activeIndex.set(list[next]);
  }

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Zegar czyszczący bufor przeżyłby komponent: zamknięcie panelu klawiszem
   * zaraz po pisaniu zostawia zaplanowane wywołanie, które po zniszczeniu
   * kontrolki trzyma ją w pamięci, a w testach dorzuca robotę do następnego.
   */
  private readonly typeaheadCleanup = inject(DestroyRef).onDestroy(() =>
    clearTimeout(this.typeaheadTimer),
  );

  /** Wyszukiwanie po pierwszych literach — parytet z natywnym `<select>`. */
  private typeahead(char: string): void {
    this.typeaheadBuffer += char.toLowerCase();
    clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => (this.typeaheadBuffer = ''), 500);

    const match = this.options().findIndex(
      (o) =>
        !o.disabled && o.label.toLowerCase().startsWith(this.typeaheadBuffer),
    );
    if (match >= 0) this.activeIndex.set(match);
  }

  /** Wywoływane przez signal forms (np. `focusBoundControl()`). */
  focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /** Wywoływane przez signal forms przy resecie formularza. */
  reset(): void {
    this.value.set(this.emptyValue());
    this.close();
  }
}
