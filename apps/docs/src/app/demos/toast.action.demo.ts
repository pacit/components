import { Component, inject, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctToaster } from '@pacit/components/toast';

/**
 * A message with an answer
 *
 * `show()` takes text, or text with an `action` — the toast then carries a button, and the
 * callback runs when the reader presses it. Undo is the pattern this exists for.
 */
@Component({
  selector: 'demo-toast-action',
  imports: [PctButton],
  styles: ':host { display: grid; gap: 12px; justify-items: start; }',
  template: `
    <button pctButton variant="outline" (click)="archive()">
      Archive 3 messages
    </button>
    <p>Archived: {{ archived() }}, restored: {{ restored() }}.</p>
  `,
})
export class ToastActionDemo {
  private readonly toaster = inject(PctToaster);
  readonly archived = signal(0);
  readonly restored = signal(0);

  protected archive(): void {
    this.archived.update((n) => n + 3);
    this.toaster.show({
      text: '3 messages archived.',
      action: { label: 'Undo', run: () => this.restored.update((n) => n + 3) },
    });
  }
}
