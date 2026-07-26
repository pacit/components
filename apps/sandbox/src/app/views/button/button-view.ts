import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { SbxDemo } from '../../ui/demo';

/**
 * Widok komponentu `PctButton` — wzorzec dla pozostałych widoków per komponent:
 * każdy przykład siedzi w karcie `sbx-demo`, a wielkość bierze z jej osi
 * (`d.activeSize()`), zamiast mieć wpisaną na sztywno.
 */
@Component({
  selector: 'sbx-button-view',
  imports: [PctButton, SbxDemo],
  templateUrl: './button-view.html',
  styleUrl: './button-view.scss',
})
export class ButtonView {}
