import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctProgress } from '@pacit/components/progress';

/** With a value it reports the number; without one it honestly says "still working". */
@Component({
  selector: 'demo-progress',
  imports: [PctButton, PctProgress],
  // A width, not only a ceiling: a bar 100% of a container that is as wide as its content
  // is a bar as wide as the button beside it (`lesson-160`).
  styles: ':host { display: grid; gap: 12px; inline-size: min(24rem, 100%); }',
  template: `
    <pct-progress [value]="done()" ariaLabel="Uploading" />
    <pct-progress ariaLabel="Connecting" />
    <div>
      <button pctButton variant="ghost" size="sm" (click)="move(-10)">
        −10
      </button>
      <button pctButton variant="ghost" size="sm" (click)="move(10)">
        +10
      </button>
    </div>
  `,
})
export class ProgressDemo {
  readonly done = signal(62);

  move(by: number): void {
    this.done.update((at) => Math.min(100, Math.max(0, at + by)));
  }
}
