import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PctAutosize, PctField, PctText } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * A `<textarea>` as tall as what is written in it. The control is the same `PctText` a text
 * field is; what `pctAutosize` adds is a height, and where that height comes from is the
 * engine's business first (0041) — `field-sizing: content` where the engine has it, a
 * measurement where it has not.
 *
 * The `[formControl]` demo is not decoration: `patchValue` writes the DOM through
 * `DefaultValueAccessor` and dispatches no event, which is one of the three things the
 * measured road has to be told and the CSS road hears for free.
 */
@Component({
  selector: 'sbx-textarea-view',
  imports: [SbxDemo, PctField, PctText, PctAutosize, ReactiveFormsModule],
  templateUrl: './textarea-view.html',
  styleUrl: './textarea-view.scss',
})
export class TextareaView {
  protected readonly bio = signal('');
  protected readonly note = signal(
    'A value that was already here at the first paint.\nFour lines of it, so that the height is\nvisibly not the floor the rows attribute\nasks for.',
  );
  protected readonly capped = signal('');
  protected readonly reactive = new FormControl('');

  protected fill(): void {
    this.reactive.patchValue(
      'Written with patchValue.\nNo input event was dispatched for this.\nThe box still fits it.',
    );
  }

  protected clear(): void {
    this.reactive.patchValue('');
  }
}
