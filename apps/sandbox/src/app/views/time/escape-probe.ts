import { Component, ElementRef, signal, viewChildren } from '@angular/core';

type Shape = 'e1' | 'e2' | 'grid';

/**
 * PROBE for plan finding 4.82, never merged: three panels a reader is put in, each closed by
 * Escape, which hands focus back to its button. `e1` focuses the listbox and names the row by
 * `aria-activedescendant` (the columns today); `e2` focuses the option itself by a roving
 * `tabindex` (0086's other reading); `grid` focuses a cell, as the date's grid does — the
 * control, since that panel closes on one Escape under NVDA.
 */
@Component({
  selector: 'sbx-escape-probe',
  template: `
    @for (shape of shapes; track shape) {
      <div class="probe" [attr.data-testid]="'probe-' + shape">
        <button type="button" #opener (click)="open(shape)">
          Open {{ shape }}
        </button>
        @if (opened()[shape]) {
          <div
            role="dialog"
            [attr.aria-label]="'Panel ' + shape"
            (keydown.escape)="close(shape)"
          >
            @switch (shape) {
              @case ('e1') {
                <div
                  role="listbox"
                  aria-label="Hours e1"
                  tabindex="0"
                  aria-activedescendant="probe-e1-13"
                >
                  @for (hour of hours; track hour) {
                    <div
                      role="option"
                      [id]="'probe-e1-' + hour"
                      [attr.aria-selected]="hour === 13"
                    >
                      {{ hour }}
                    </div>
                  }
                </div>
              }
              @case ('e2') {
                <div role="listbox" aria-label="Hours e2">
                  @for (hour of hours; track hour) {
                    <div
                      role="option"
                      [attr.tabindex]="hour === 13 ? 0 : -1"
                      [attr.aria-selected]="hour === 13"
                    >
                      {{ hour }}
                    </div>
                  }
                </div>
              }
              @case ('grid') {
                <div role="grid" aria-label="Days grid">
                  <div role="row">
                    @for (hour of hours; track hour) {
                      <div
                        role="gridcell"
                        [attr.tabindex]="hour === 13 ? 0 : -1"
                        [attr.aria-selected]="hour === 13"
                      >
                        {{ hour }}
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class SbxEscapeProbe {
  protected readonly shapes: readonly Shape[] = ['e1', 'e2', 'grid'];
  protected readonly hours = [11, 12, 13, 14, 15];
  protected readonly opened = signal<Record<Shape, boolean>>({
    e1: true,
    e2: true,
    grid: true,
  });
  private readonly openers =
    viewChildren<ElementRef<HTMLButtonElement>>('opener');

  protected open(shape: Shape): void {
    this.opened.update((all) => ({ ...all, [shape]: true }));
  }

  protected close(shape: Shape): void {
    this.opened.update((all) => ({ ...all, [shape]: false }));
    this.openers()[this.shapes.indexOf(shape)].nativeElement.focus();
  }
}
