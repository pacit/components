import { Injectable, signal } from '@angular/core';
import { PctSize } from '@pacit/components';

/** Schemat kolorów — odpowiada blokom `[data-theme="..."]` w wygenerowanym CSS. */
export type SbxScheme = 'light' | 'dark';

/**
 * Skórka: zestaw nadpisań semantycznych, niezależny od schematu light/dark
 * (req-token-skin). Na razie istnieje jedna — build tokenów nie emituje jeszcze
 * bloków `[data-skin="..."]`. Oś jest tu obecna od początku, żeby karta miała
 * gdzie ją wystawić, gdy skórki powstaną.
 */
export interface SbxSkin {
  readonly id: string;
  readonly label: string;
}

export const SBX_SKINS: readonly SbxSkin[] = [{ id: 'base', label: 'Bazowa' }];

/**
 * Kierunek pisma. Oś przekrojowa jak motyw i wielkość, a nie ustawienie strony:
 * `req-token-logical` obiecuje, że układ **odbija się** w `dir="rtl"`, a bramka
 * `check-styles` sprawdza wyłącznie arkusze. Arkusz może być bez zarzutu logiczny
 * i mimo to dawać zły układ — przez zaszytą strzałkę, przez kotwicę nakładki albo
 * przez znak `scrollLeft`. Tego nie widać w arkuszu; widać na obrazku.
 *
 * Świadomie wyłączone jest **pełne bidi** (pionowe tryby pisma), nie RTL —
 * patrz nie-cele w `docs/00-axis.md`.
 */
export type SbxDir = 'ltr' | 'rtl';

/** Który przełącznik pokazuje pasek karty. */
export type SbxControl = 'scheme' | 'skin' | 'size' | 'dir';

export const SBX_ALL_CONTROLS: readonly SbxControl[] = [
  'scheme',
  'skin',
  'size',
  'dir',
];

/**
 * Globalne ustawienia sandboxa — wspólny punkt odniesienia dla wszystkich kart.
 * Karta idzie za tym stanem, dopóki ktoś nie przestawi jej własnym paskiem
 * (`linkedSignal` w `SbxDemo`).
 */
@Injectable({ providedIn: 'root' })
export class SbxSettings {
  readonly scheme = signal<SbxScheme>('light');
  readonly skin = signal<string>(SBX_SKINS[0].id);
  readonly size = signal<PctSize>('md');
  readonly dir = signal<SbxDir>('ltr');
}
