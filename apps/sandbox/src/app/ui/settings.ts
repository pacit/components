import { Injectable, signal } from '@angular/core';
import { PctSize } from '@pacit/components';

/** Colour scheme — matches the `[data-theme="..."]` blocks in the generated CSS. */
export type SbxScheme = 'light' | 'dark';

/**
 * Skin: a set of semantic overrides, independent of the light/dark scheme
 * (req-token-skin). There is one for now — the token build does not emit
 * `[data-skin="..."]` blocks yet. The axis stands here from the start so that a
 * card has somewhere to expose it once skins exist.
 */
export interface SbxSkin {
  readonly id: string;
  readonly label: string;
}

export const SBX_SKINS: readonly SbxSkin[] = [{ id: 'base', label: 'Base' }];

/**
 * Writing direction. A cross-cutting axis like the theme and the size, not a page
 * setting: `req-token-logical` promises that the layout **mirrors** under
 * `dir="rtl"`, and the `check-styles` gate reads stylesheets only. A stylesheet can
 * be impeccably logical and still lay out wrongly — through a hard-coded arrow,
 * through an overlay anchor or through the sign of `scrollLeft`. None of that is
 * visible in the stylesheet; it is visible in the picture.
 *
 * What is deliberately out of scope is **full bidi** (vertical writing modes), not
 * RTL — see the non-goals in `docs/00-axis.md`.
 */
export type SbxDir = 'ltr' | 'rtl';

/** Which switches the card bar shows. */
export type SbxControl = 'scheme' | 'skin' | 'size' | 'dir';

export const SBX_ALL_CONTROLS: readonly SbxControl[] = [
  'scheme',
  'skin',
  'size',
  'dir',
];

/**
 * The global sandbox settings — one point of reference for every card. A card
 * follows this state until somebody moves it with the card's own bar
 * (`linkedSignal` in `SbxDemo`).
 */
@Injectable({ providedIn: 'root' })
export class SbxSettings {
  readonly scheme = signal<SbxScheme>('light');
  readonly skin = signal<string>(SBX_SKINS[0].id);
  readonly size = signal<PctSize>('md');
  readonly dir = signal<SbxDir>('ltr');
}
