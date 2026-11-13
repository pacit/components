import { Component, inject, signal } from '@angular/core';
import { PctAnnouncer } from '@pacit/components/core';

type Shape = 'inserted' | 'standing' | 'channel' | 'alert';

/**
 * PROBE for plan finding 4.81, never merged: four lines that appear when Tab leaves a field (a key, not a blur: the walk clicks a heading
 * before it enters a block, and a blur would fire there),
 * as the field's warning does. `inserted` is the line today — a `status` entering with its
 * text; `standing` is a `status` standing empty before the text arrives; `channel` draws the
 * line with no role and says it on the polite channel of `PctAnnouncer` (0026); `alert` enters
 * with its text, as the error does — the control, since readers say it.
 */
@Component({
  selector: 'sbx-warning-probe',
  template: `
    @for (shape of shapes; track shape) {
      <div class="probe" [attr.data-testid]="'probe-' + shape">
        <input
          data-probe="before"
          [attr.aria-label]="'Before ' + shape"
          (keydown.tab)="leave(shape)"
        />
        @switch (shape) {
          @case ('inserted') {
            @if (shown()[shape]) {
              <span role="status">{{ sentence(shape) }}</span>
            }
          }
          @case ('standing') {
            <span role="status">{{
              shown()[shape] ? sentence(shape) : ''
            }}</span>
          }
          @case ('channel') {
            @if (shown()[shape]) {
              <span>{{ sentence(shape) }}</span>
            }
          }
          @case ('alert') {
            @if (shown()[shape]) {
              <span role="alert">{{ sentence(shape) }}</span>
            }
          }
        }
        <input [attr.aria-label]="'After ' + shape" />
      </div>
    }
  `,
})
export class SbxWarningProbe {
  private readonly announcer = inject(PctAnnouncer);
  protected readonly shapes: readonly Shape[] = [
    'inserted',
    'standing',
    'channel',
    'alert',
  ];
  protected readonly shown = signal<Record<Shape, boolean>>({
    inserted: false,
    standing: false,
    channel: false,
    alert: false,
  });

  protected sentence(shape: Shape): string {
    return `Warned ${shape}: transfers above 10 000 are reviewed by hand`;
  }

  protected leave(shape: Shape): void {
    if (this.shown()[shape]) return;
    this.shown.update((all) => ({ ...all, [shape]: true }));
    if (shape === 'channel') this.announcer.announce(this.sentence(shape));
  }
}
