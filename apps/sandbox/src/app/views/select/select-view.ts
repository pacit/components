import { Component, signal } from '@angular/core';
import { PctField } from '@pacit/components/field';
import {
  PctSelect,
  PctSelectOption,
  PctSelectOptionTemplate,
} from '@pacit/components/select';
import { COUNTRIES, LANGUAGES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * A picker list with a panel of its own (not a native `<select>`): the ARIA
 * "select-only combobox" pattern, the panel in a CDK Overlay.
 */
@Component({
  selector: 'sbx-select-view',
  imports: [SbxDemo, PctField, PctSelect, PctSelectOptionTemplate],
  templateUrl: './select-view.html',
  styleUrl: './select-view.scss',
})
export class SelectView {
  protected readonly countries = COUNTRIES;
  protected readonly languages = LANGUAGES;
  /** The list a filter has emptied, before there is a filter to empty it. */
  protected readonly none: readonly PctSelectOption[] = [];

  protected readonly country = signal<string | null>('');
  protected readonly scopedCountry = signal<string | null>('');
  protected readonly bareCountry = signal<string | null>('pl');
  protected readonly emptyCountry = signal<string | null>(null);
  protected readonly templateCountry = signal<string | null>('de');

  protected readonly widthField = signal<string | null>('pl');
  protected readonly widthAuto = signal<string | null>('pl');
  protected readonly widthFixed = signal<string | null>('pl');
}
