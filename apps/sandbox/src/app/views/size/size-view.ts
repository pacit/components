import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import {
  PctField,
  PctNumber,
  PctSuffix,
  PctText,
} from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
import { PctSize } from '@pacit/components';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * Widok przekrojowy: wielkość jako **jedna oś dla całej biblioteki**
 * (wym-api-18). Sedno jest w zestawieniu — pojedynczy komponent zawsze wygląda
 * poprawnie, rozjazd widać dopiero, gdy dwa stoją obok siebie tą samą krawędzią.
 */
@Component({
  selector: 'sbx-size-view',
  imports: [
    SbxDemo,
    PctField,
    PctText,
    PctNumber,
    PctSuffix,
    PctSelect,
    PctButton,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
  ],
  templateUrl: './size-view.html',
  styleUrl: './size-view.scss',
})
export class SizeView {
  protected readonly sizes: readonly PctSize[] = ['sm', 'md', 'lg'];
  protected readonly countries = COUNTRIES;

  protected readonly text = signal('Tekst');
  protected readonly amount = signal<number | null>(1499.9);
  protected readonly country = signal<string | null>('pl');
  protected readonly consent = signal(true);
  protected readonly plan = signal<string | null>('a');
}
