import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctDialog } from '@pacit/components/dialog';

/** A modal: focus trapped, the page behind it inert, Escape hands back the reason. */
@Component({
  selector: 'demo-dialog',
  imports: [PctButton, PctDialog],
  template: `
    <button pctButton (click)="open.set(true)">Project settings</button>

    <pct-dialog heading="Project settings" [(open)]="open">
      <p>Everything outside this panel is inert while it stands.</p>
      <button pctButton variant="outline" (click)="open.set(false)">
        Done
      </button>
    </pct-dialog>
  `,
})
export class DialogDemo {
  readonly open = signal(false);
}
