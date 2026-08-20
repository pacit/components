import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctAutofocus, PctDialog } from '@pacit/components/dialog';
import { PctDialogCloseReason } from '@pacit/components/dialog';
import { PctField } from '@pacit/components/field';
import { PctSelect } from '@pacit/components/select';
import { PctText } from '@pacit/components/field';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * The modal dialog: a panel that takes focus, a background that stops answering and a page
 * that stops scrolling. The last card is the one worth having — a select inside a dialog is
 * the case that decided the whole shape of this component.
 */
@Component({
  selector: 'sbx-dialog-view',
  imports: [
    SbxDemo,
    PctAutofocus,
    PctButton,
    PctDialog,
    PctField,
    PctSelect,
    PctText,
  ],
  templateUrl: './dialog-view.html',
  styleUrl: './dialog-view.scss',
})
export class DialogView {
  protected readonly countries = COUNTRIES;

  protected readonly basic = signal(false);
  protected readonly confirm = signal(false);
  protected readonly insistent = signal(false);
  protected readonly withSelect = signal(false);
  protected readonly tall = signal(false);

  /** The last reason, drawn on the page so the e2e can read it instead of a console. */
  protected readonly lastReason = signal<PctDialogCloseReason | ''>('');

  protected readonly country = signal<string | null>('pl');
  protected readonly note = signal('');

  protected record(reason: PctDialogCloseReason): void {
    this.lastReason.set(reason);
  }

  protected readonly paragraphs = Array.from(
    { length: 12 },
    (_, i) =>
      `Paragraph ${i + 1} — a body long enough for the panel to scroll.`,
  );
}
