import { Injectable, signal } from '@angular/core';
import { PctSize } from '@pacit/components';

/** Schemat kolorów — odpowiada blokom `[data-theme="..."]` w wygenerowanym CSS. */
export type SbxScheme = 'light' | 'dark';

/**
 * Skórka: zestaw nadpisań semantycznych, niezależny od schematu light/dark
 * (wym-theme-5). Na razie istnieje jedna — build tokenów nie emituje jeszcze
 * bloków `[data-skin="..."]`. Oś jest tu obecna od początku, żeby karta miała
 * gdzie ją wystawić, gdy skórki powstaną.
 */
export interface SbxSkin {
  readonly id: string;
  readonly label: string;
}

export const SBX_SKINS: readonly SbxSkin[] = [{ id: 'base', label: 'Bazowa' }];

/** Który przełącznik pokazuje pasek karty. */
export type SbxControl = 'scheme' | 'skin' | 'size';

export const SBX_ALL_CONTROLS: readonly SbxControl[] = ['scheme', 'skin', 'size'];

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
}
