import { Component, inject, input, linkedSignal } from '@angular/core';
import { PctSize } from '@pacit/components';
import { SbxControls } from './controls';
import { PctDocId } from './req-ids';
import {
  SBX_ALL_CONTROLS,
  SbxControl,
  SbxDir,
  SbxScheme,
  SbxSettings,
} from './settings';

/**
 * Karta demonstracyjna — wspólna obudowa każdego przykładu w sandboxie.
 *
 * Motyw i skórkę ustawia na **własnym poddrzewie** (`data-theme` / `data-skin`
 * na scenie), nigdy na `:root`. Dzięki temu każdy przykład jest przy okazji
 * testem scoped theme (wym-token-scoped) — bez pisania osobnego przykładu na to.
 *
 * Karta idzie za ustawieniami globalnymi, dopóki ktoś nie przestawi jej paskiem;
 * `linkedSignal` sprawia, że zmiana globalna znów ją przejmuje.
 *
 * Pasek jest **chromem**, więc stoi poza sceną — inaczej przełącznik motywu
 * zmieniałby sam siebie i nie dałoby się porównać dwóch kart obok siebie.
 *
 * @example
 * <sbx-demo #d heading="Warianty" [reqs]="['wym-api-sygnaly']">
 *   <button pctButton [size]="d.activeSize()">Solid</button>
 * </sbx-demo>
 */
@Component({
  selector: 'sbx-demo',
  imports: [SbxControls],
  templateUrl: './demo.html',
  styleUrl: './demo.scss',
})
export class SbxDemo {
  private readonly settings = inject(SbxSettings);

  /** Nagłówek karty. Nie `title` — to atrybut globalny HTML (dymek). */
  readonly heading = input.required<string>();

  /** Jedno zdanie: co ten przykład pokazuje. */
  readonly summary = input<string>('');

  /**
   * Wymagania, których dotyczy przykład (np. `wym-api-wielkosc`).
   *
   * Typ jest **unią generowaną z dokumentacji** (`tools/check-docs.mjs --write`),
   * a nie `string`: dopóki było to `string[]`, literówka dawała chip prowadzący
   * donikąd, czyli cichą wadę (`wym-os`). Ten sam ruch co `PctCssVar` przy
   * odczycie tokenów (`lekcja-43`).
   */
  readonly reqs = input<readonly PctDocId[]>([]);

  /** Które osie da się przestawić na tej karcie; `[]` chowa pasek. */
  readonly controls = input<readonly SbxControl[]>(SBX_ALL_CONTROLS);

  /** Wartość początkowa osi; `null` = bierz globalną. */
  readonly scheme = input<SbxScheme | null>(null);
  readonly skin = input<string | null>(null);
  readonly size = input<PctSize | null>(null);
  readonly dir = input<SbxDir | null>(null);

  /** Wartości obowiązujące na scenie — czyta je też treść karty. */
  readonly activeScheme = linkedSignal<SbxScheme>(
    () => this.scheme() ?? this.settings.scheme(),
  );
  readonly activeSkin = linkedSignal<string>(
    () => this.skin() ?? this.settings.skin(),
  );
  readonly activeSize = linkedSignal<PctSize>(
    () => this.size() ?? this.settings.size(),
  );
  readonly activeDir = linkedSignal<SbxDir>(
    () => this.dir() ?? this.settings.dir(),
  );
}
