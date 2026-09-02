import { Component, inject, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctToaster } from '@pacit/components/toast';

/** No element to place — a message about what just happened is raised by the code that did it. */
@Component({
  selector: 'demo-toast',
  imports: [PctButton],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <button pctButton variant="outline" (click)="toaster.show('Draft saved.')">
      Save
    </button>
    <button pctButton variant="outline" (click)="undoable()">
      Move to bin
    </button>
    <p>Undone {{ undone() }} time(s).</p>
  `,
})
export class ToastDemo {
  protected readonly toaster = inject(PctToaster);
  readonly undone = signal(0);

  undoable(): void {
    this.toaster.show({
      text: 'Message moved to the bin.',
      action: { label: 'Undo', run: () => this.undone.update((n) => n + 1) },
    });
  }
}
