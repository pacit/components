import { Component, signal } from '@angular/core';
import { PctField } from '@pacit/components/field';
import { PctSelect } from '@pacit/components/select';
import { COUNTRIES, LANGUAGES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * Lista wyboru z własnym panelem (nie natywny `<select>`): wzorzec ARIA
 * „select-only combobox", panel w nakładce CDK Overlay.
 */
@Component({
  selector: 'sbx-select-view',
  imports: [SbxDemo, PctField, PctSelect],
  templateUrl: './select-view.html',
  styleUrl: './select-view.scss',
})
export class SelectView {
  protected readonly countries = COUNTRIES;
  protected readonly languages = LANGUAGES;

  protected readonly country = signal('');
  protected readonly scopedCountry = signal('');
  protected readonly bareCountry = signal('pl');

  protected readonly widthField = signal('pl');
  protected readonly widthAuto = signal('pl');
  protected readonly widthFixed = signal('pl');
}
