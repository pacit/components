import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctField, PctNumber, PctText } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * Widok przekrojowy: ten sam zestaw stanów dla każdej kontrolki.
 *
 * Stany są tu **wymuszone inputami**, a nie wyprowadzone z formularza — chodzi
 * o zobaczenie wyglądu każdego stanu obok siebie, także takich, do których
 * trudno doprowadzić klikaniem (błąd na polu nietkniętym, wyłączony select
 * z wybraną wartością).
 */
@Component({
  selector: 'sbx-states-view',
  imports: [
    SbxDemo,
    PctField,
    PctText,
    PctNumber,
    PctSelect,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctButton,
  ],
  templateUrl: './states-view.html',
  styleUrl: './states-view.scss',
})
export class StatesView {
  protected readonly countries = COUNTRIES;

  /**
   * Komunikat wstrzykiwany wprost, bez schematu formularza. `kind` należy do
   * kontraktu błędu signal forms — tu wystarczy własna nazwa rodzaju.
   */
  protected readonly errors = [
    { kind: 'demo', message: 'Ta wartość jest niepoprawna' },
  ];

  protected readonly text = signal('Tekst');
  protected readonly amount = signal<number | null>(1499.9);
  protected readonly country = signal<string | null>('pl');
  protected readonly checked = signal(true);
  protected readonly plan = signal<string | null>('a');
}
