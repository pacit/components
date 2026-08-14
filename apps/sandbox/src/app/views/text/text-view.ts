import { Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PctField, PctText } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * A text field on a native `<input>` (req-api-native-input) — it keeps `type`, the
 * autofill and the mobile keyboard mode.
 *
 * The view also shows compatibility with the old forms API: the control implements
 * `FormValueControl` alone, and `[formControl]` and `[(ngModel)]` still synchronise
 * the value both ways — with no `ControlValueAccessor` (lesson-9).
 */
@Component({
  selector: 'sbx-text-view',
  imports: [SbxDemo, PctField, PctText, ReactiveFormsModule, FormsModule],
  templateUrl: './text-view.html',
  styleUrl: './text-view.scss',
})
export class TextView {
  protected readonly reactive = new FormControl('Ada');
  protected readonly ngModelValue = signal('Lovelace');
}
