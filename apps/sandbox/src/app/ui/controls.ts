import { Component, input, model } from '@angular/core';
import { PctField } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect, PctSelectOption } from '@pacit/components/select';
import { PctSize } from '@pacit/components';
import { SBX_ALL_CONTROLS, SBX_SKINS, SbxControl, SbxScheme } from './settings';

/**
 * Pasek osi przekrojowych: schemat kolorów, skórka, wielkość. Ten sam komponent
 * obsługuje ustawienia globalne (w powłoce) i lokalne (w karcie) — różni je
 * wyłącznie to, do czego jest podpięty.
 *
 * Kontrolki to komponenty biblioteki: sandbox używa własnych narzędzi, więc
 * regresja w radiu czy selekcie psuje też sterowanie stroną i widać ją od razu.
 */
@Component({
  selector: 'sbx-controls',
  imports: [PctRadioGroup, PctRadio, PctField, PctSelect],
  templateUrl: './controls.html',
  styleUrl: './controls.scss',
})
export class SbxControls {
  readonly scheme = model<SbxScheme>('light');
  readonly skin = model<string>(SBX_SKINS[0].id);
  readonly size = model<PctSize>('md');

  /** Które osie pokazać; pusta lista = pasek się nie renderuje. */
  readonly show = input<readonly SbxControl[]>(SBX_ALL_CONTROLS);

  protected readonly skins: readonly PctSelectOption[] = SBX_SKINS.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  /** Wybór skórki ma sens dopiero przy drugiej skórce (wym-theme-5). */
  protected readonly hasSkins = SBX_SKINS.length > 1;

  protected has(control: SbxControl): boolean {
    return this.show().includes(control);
  }

  /**
   * Kontrolki wyboru są generyczne, więc typ osi idzie przez nie bez zmian —
   * wcześniej trzeba tu było zawężać napis z powrotem do unii (`value === 'dark'
   * ? 'dark' : 'light'`), co przechodziło kompilację także dla wartości spoza osi.
   *
   * Zostaje tylko domknięcie `null`: kontrolka dopuszcza „nic nie wybrano", a te
   * osie zawsze mają wybór. Dlatego wartość pusta wraca do pozycji domyślnej
   * zamiast rozlewać `null` po całym sandboxie.
   */
  protected setScheme(value: SbxScheme | null): void {
    this.scheme.set(value ?? 'light');
  }

  protected setSize(value: PctSize | null): void {
    this.size.set(value ?? 'md');
  }

  protected setSkin(value: string | null): void {
    this.skin.set(value ?? SBX_SKINS[0].id);
  }
}
