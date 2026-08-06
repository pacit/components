import { Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PctField, PctText } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * Pole tekstowe na natywnym `<input>` (req-api-native-input) — zachowuje `type`,
 * autouzupełnianie i tryb klawiatury mobilnej.
 *
 * Widok pokazuje też zgodność ze starym API formularzy: kontrolka implementuje
 * wyłącznie `FormValueControl`, a mimo to `[formControl]` i `[(ngModel)]`
 * synchronizują wartość w obie strony — bez `ControlValueAccessor` (lesson-9).
 */
@Component({
  selector: 'sbx-text-view',
  imports: [SbxDemo, PctField, PctText, ReactiveFormsModule, FormsModule],
  templateUrl: './text-view.html',
  styleUrl: './text-view.scss',
})
export class TextView {
  protected readonly reactive = new FormControl('Marek');
  protected readonly ngModelValue = signal('Kowalski');
}
