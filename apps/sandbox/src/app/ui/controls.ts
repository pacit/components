import { Component, input, model } from '@angular/core';
import { PctField } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect, PctSelectOption } from '@pacit/components/select';
import { PctSize } from '@pacit/components';
import {
  SBX_ALL_CONTROLS,
  SBX_SKINS,
  SbxControl,
  SbxDir,
  SbxScheme,
} from './settings';

/**
 * The bar of cross-cutting axes: colour scheme, skin, size. The same component
 * serves the global settings (in the shell) and the local ones (in a card) —
 * the only difference is what it is bound to.
 *
 * The switches are library components: the sandbox uses its own tools, so a
 * regression in the radio or the select breaks the page controls as well and
 * shows up at once.
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
  readonly dir = model<SbxDir>('ltr');

  /** Which axes to show; an empty list = the bar does not render. */
  readonly show = input<readonly SbxControl[]>(SBX_ALL_CONTROLS);

  protected readonly skins: readonly PctSelectOption[] = SBX_SKINS.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  /** Choosing a skin makes sense only once there is a second one (req-token-skin). */
  protected readonly hasSkins = SBX_SKINS.length > 1;

  protected has(control: SbxControl): boolean {
    return this.show().includes(control);
  }

  /**
   * The picker controls are generic, so an axis type passes through them unchanged —
   * this used to narrow a string back to the union (`value === 'dark' ? 'dark' :
   * 'light'`), which compiled just as well for values outside the axis.
   *
   * All that is left is closing `null`: a control admits "nothing selected", and
   * these axes always have a choice. So an empty value falls back to the default
   * position instead of spilling `null` across the whole sandbox.
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

  protected setDir(value: SbxDir | null): void {
    this.dir.set(value ?? 'ltr');
  }
}
