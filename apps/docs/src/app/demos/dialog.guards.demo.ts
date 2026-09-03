import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctDialog, PctDialogCloseReason } from '@pacit/components/dialog';

/**
 * A dialog that insists
 *
 * `closeOnBackdrop` and `closeOnEscape` are on by default, because a modal that traps is a
 * modal people hate. Turn them off for the one case that earns it — an unsaved form — and
 * `(closed)` still tells you how the reader got out.
 */
@Component({
  selector: 'demo-dialog-guards',
  imports: [PctButton, PctDialog],
  styles: ':host { display: grid; gap: 12px; justify-items: start; }',
  template: `
    <button pctButton (click)="open.set(true)">Discard changes?</button>
    <pct-dialog
      heading="Discard changes?"
      [(open)]="open"
      [closeOnBackdrop]="false"
      [closeOnEscape]="false"
      [closeButton]="false"
      (closed)="reason.set($event)"
    >
      <p>Three edits go with it. There is no undo after this.</p>
      <div style="display: flex; gap: 8px; justify-content: flex-end">
        <button pctButton variant="outline" (click)="open.set(false)">
          Keep editing
        </button>
        <button pctButton (click)="open.set(false)">Discard</button>
      </div>
    </pct-dialog>
    <p>Closed by: {{ reason() ?? 'not opened yet' }}</p>
  `,
})
export class DialogGuardsDemo {
  readonly open = signal(false);
  readonly reason = signal<PctDialogCloseReason | null>(null);
}
