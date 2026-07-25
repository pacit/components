import {
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
} from '@pacit/components/core';

/**
 * Granice bywają niepodane („bez ograniczenia"), a kontrakt `FormUiControl`
 * wymaga dla nich `undefined` — `numberAttribute` (dające `NaN`) nie wystarcza.
 */
function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pole liczbowe: komponent na natywnym `<input type="text">` z rolą
 * `spinbutton`, wartością typu `number | null` i formatowaniem wg locale.
 *
 * **Dlaczego nie `<input type="number">`** — mimo że mamy zasadę „nie pisz
 * tego, co daje platforma" (`wym-api-11`), natywne pole liczbowe nie nadaje
 * się do formularzy biznesowych: nie zna lokalnego separatora dziesiętnego
 * (w polskim przecinka), nie umie grupować tysięcy, a przy niepoprawnej
 * treści zwraca puste `value`, więc nie da się odróżnić „puste" od „śmieci"
 * ani pokazać użytkownikowi tego, co wpisał. Dodatkowo kółko myszy
 * przypadkowo zmienia wartość. Stąd tekstowe pole z własnym parsowaniem
 * i rolą `spinbutton` (`wym-api-17`).
 *
 * Domyślnie pole jest **całkowite** — ułamki włącza `maxFractionDigits`.
 * Wartość pustą reprezentuje `null`, nie `0` ani `NaN`.
 *
 * @example
 * // Granice biorą się z walidatorów min()/max() ze schematu formularza.
 * <pct-field label="Liczba stanowisk">
 *   <input pctNumber [formField]="f.seats" />
 * </pct-field>
 *
 * @example
 * <pct-field label="Cena">
 *   <span pctPrefix>PLN</span>
 *   <input pctNumber [minFractionDigits]="2" [maxFractionDigits]="2" [(value)]="price" />
 * </pct-field>
 */
@Component({
  selector: 'input[pctNumber]',
  // Komponent (nie dyrektywa) na natywnym elemencie — jak `input[pctText]`.
  template: '',
  styleUrl: './text.scss',
  host: {
    class: 'pct-text pct-number',
    type: 'text',
    role: 'spinbutton',
    autocomplete: 'off',
    '[id]': 'controlId',
    '[attr.inputmode]': 'inputMode()',
    '[disabled]': 'disabled()',
    '[readOnly]': 'readonly()',
    '[attr.name]': 'name() || null',
    '[attr.required]': 'required() || null',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '(input)': 'onInput()',
    '(blur)': 'onBlur()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class PctNumber
  implements FormValueControl<number | null>, PctFieldControl
{
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly field = inject(PCT_FIELD, { optional: true });

  /** Wartość — `null` oznacza pole puste. */
  readonly value = model<number | null>(null);

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

  /**
   * Granice wartości. Należą do kontraktu `FormUiControl`, więc przy użyciu
   * `[formField]` **wypełnia je sama dyrektywa** na podstawie walidatorów
   * `min()` / `max()` ze schematu — nie trzeba ich powtarzać w szablonie.
   * Wartość jest do nich domykana przy zatwierdzeniu.
   */
  readonly min = input(undefined, { transform: optionalNumber });
  readonly max = input(undefined, { transform: optionalNumber });

  /** Skok strzałek góra/dół; PageUp/PageDown skacze dziesięciokrotnie. */
  readonly step = input(1, { transform: numberAttribute });

  /** Minimalna liczba miejsc dziesiętnych w zapisie (np. `2` dla kwot: „12,50"). */
  readonly minFractionDigits = input(0, { transform: numberAttribute });

  /** Maksymalna liczba miejsc dziesiętnych; `0` (domyślnie) = liczba całkowita. */
  readonly maxFractionDigits = input(0, { transform: numberAttribute });

  /** Grupowanie tysięcy wg locale („1 234 567"). */
  readonly useGrouping = input(true, { transform: booleanAttribute });

  /** Nadpisuje `LOCALE_ID` aplikacji dla tego pola. */
  readonly locale = input<string>('');

  private readonly appLocale = inject(LOCALE_ID);
  private readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  // --- kontrakt PctFieldControl ---

  readonly controlId = nextPctId('pct-number');
  readonly labelStrategy: PctLabelStrategy = 'for';
  readonly fieldCursor: PctFieldCursor = 'text';

  protected readonly describedBy = signal<string | null>(null);

  protected readonly showInvalid = computed(
    () => this.invalid() && this.touched(),
  );

  /** Bez ułamków klawiatura mobilna może być czysto cyfrowa. */
  protected readonly inputMode = computed(() =>
    this.maxFractionDigits() > 0 ? 'decimal' : 'numeric',
  );

  // --- formatowanie i parsowanie ---

  private readonly fractionDigits = computed(() => {
    const min = Math.max(0, this.minFractionDigits());
    return { min, max: Math.max(min, this.maxFractionDigits()) };
  });

  private readonly formatter = computed(() => {
    const { min, max } = this.fractionDigits();
    return new Intl.NumberFormat(this.activeLocale(), {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: this.useGrouping(),
    });
  });

  /** Separatory bieżącego locale — odczytane z `Intl`, nie zgadywane. */
  private readonly separators = computed(() => {
    const parts = new Intl.NumberFormat(this.activeLocale(), {
      useGrouping: true,
      maximumFractionDigits: 2,
    }).formatToParts(1234567.5);
    return {
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
      group: parts.find((p) => p.type === 'group')?.value ?? '',
    };
  });

  /** Tekst czytany przez czytnik ekranu — sformatowany, nie surowa liczba. */
  protected readonly valueText = computed(() => {
    const v = this.value();
    return v === null ? null : this.formatter().format(v);
  });

  /**
   * Dopóki użytkownik pisze, nie przepisujemy zawartości pola — inaczej
   * kursor skakałby na koniec przy każdym znaku. Zapis do DOM następuje
   * dopiero po zatwierdzeniu (blur, strzałki, zmiana wartości z zewnątrz).
   */
  private readonly typing = signal(false);

  /**
   * `FormField` również dostarcza `NgControl` (interop dla starych
   * `ControlValueAccessor`ów), więc sama jego obecność nie oznacza jeszcze
   * klasycznych formularzy (`wym-real-26`).
   */
  private readonly classicForms = inject(NgControl, {
    optional: true,
    self: true,
  });
  private readonly signalForms = inject(FormField, {
    optional: true,
    self: true,
  });

  constructor() {
    this.field?.attach(this);

    effect(() => {
      const v = this.value();
      if (this.typing()) return;
      const el = this.el.nativeElement;
      const text = v === null ? '' : this.formatter().format(v);
      if (el.value !== text) el.value = text;
    });

    if (isDevMode()) this.warnOnUnsupportedUsage();
  }

  setDescribedBy(ids: string | null): void {
    this.describedBy.set(ids);
  }

  /**
   * Parsuje tekst wg locale. Akceptuje szerzej niż formatuje: separator
   * grupujący usuwamy tylko tam, gdzie faktycznie rozdziela tysiące, a jako
   * separator dziesiętny przyjmujemy zarówno lokalny, jak i kropkę oraz
   * przecinek — klawiatura numeryczna daje kropkę niezależnie od regionu.
   */
  private parse(text: string): number | null {
    const raw = text.trim();
    if (raw === '') return null;

    const { decimal, group } = this.separators();
    // Locale grupują spacją nierozdzielającą (pl-PL: U+00A0) — `\s` jej nie łapie.
    let s = raw.replace(/[\s\u00a0\u202f]/g, '');

    if (group.trim() !== '') {
      const g = escapeRegExp(group);
      s = s.replace(new RegExp(`${g}(?=\\d{3}(\\D|$))`, 'g'), '');
    }
    s = s.split(decimal).join('.').replace(/,/g, '.');
    // Minus typograficzny pojawia się w wartościach sformatowanych przez Intl.
    s = s.replace(/[\u2212\u2013]/g, '-');

    if (!/^-?\d*\.?\d*$/.test(s) || !/\d/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  /** Zaokrągla do dozwolonej liczby miejsc i domyka do `min`/`max`. */
  private normalize(n: number): number {
    const { max } = this.fractionDigits();
    let v = Number(n.toFixed(Math.min(max, 20)));
    const lo = this.min();
    const hi = this.max();
    if (lo !== undefined && v < lo) v = lo;
    if (hi !== undefined && v > hi) v = hi;
    return v;
  }

  /** Zatwierdza wartość i pozwala efektowi przepisać sformatowany tekst. */
  private commit(n: number | null): void {
    this.typing.set(false);
    this.value.set(n === null ? null : this.normalize(n));
  }

  protected onInput(): void {
    this.typing.set(true);
    const text = this.el.nativeElement.value;
    if (text.trim() === '') {
      this.value.set(null);
      return;
    }
    const parsed = this.parse(text);
    // Stan przejściowy („-", „12,") nie kasuje wartości — tekst zostaje,
    // a rozstrzygnięcie następuje przy zatwierdzeniu.
    if (parsed !== null) this.value.set(parsed);
  }

  protected onBlur(): void {
    // Zatwierdzenie czyta tekst, nie sygnał: odrzuca śmieci, zaokrągla i domyka.
    this.commit(this.parse(this.el.nativeElement.value));
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.readonly()) return;

    switch (event.key) {
      case 'ArrowUp':
        return this.stepBy(this.step(), event);
      case 'ArrowDown':
        return this.stepBy(-this.step(), event);
      case 'PageUp':
        return this.stepBy(this.step() * 10, event);
      case 'PageDown':
        return this.stepBy(this.step() * -10, event);
      case 'Home': {
        const lo = this.min();
        if (lo === undefined) return;
        event.preventDefault();
        return this.commit(lo);
      }
      case 'End': {
        const hi = this.max();
        if (hi === undefined) return;
        event.preventDefault();
        return this.commit(hi);
      }
      default:
        return;
    }
  }

  private stepBy(delta: number, event: KeyboardEvent): void {
    event.preventDefault();
    // Punkt wyjścia bierzemy z tekstu, nie z sygnału — użytkownik mógł już
    // coś wpisać, a jeszcze nie zatwierdzić.
    const current =
      this.parse(this.el.nativeElement.value) ?? this.min() ?? this.max() ?? 0;
    this.commit(current + delta);
  }

  /** Wywoływane przez signal forms (np. `focusBoundControl()`). */
  focus(options?: FocusOptions): void {
    this.el.nativeElement.focus(options);
  }

  reset(): void {
    this.commit(null);
  }

  /**
   * Dwa sposoby użycia wyglądają poprawnie, a cicho psują formatowanie:
   * klasyczne formularze (ich `DefaultValueAccessor` przejmuje zapis do DOM
   * i pisze surowe napisy — `wym-real-20`) oraz `type="number"`, przy którym
   * przeglądarka sama filtruje treść i gubi lokalny separator.
   */
  private warnOnUnsupportedUsage(): void {
    if (this.classicForms && !this.signalForms) {
      console.warn(
        '[pctNumber] Klasyczne formularze ([formControl], [(ngModel)]) przejmują ' +
          'zapis wartości i psują formatowanie. Użyj signal forms ([formField]) ' +
          'albo [(value)].',
      );
    }
    if (this.el.nativeElement.type !== 'text') {
      console.warn(
        `[pctNumber] Oczekiwano type="text" (pole samo parsuje liczby wg locale), ` +
          `a jest type="${this.el.nativeElement.type}".`,
      );
    }
  }
}
