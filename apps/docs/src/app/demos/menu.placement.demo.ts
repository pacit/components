import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import {
  PctMenu,
  PctMenuCloseReason,
  PctMenuItem,
  PctMenuTrigger,
} from '@pacit/components/menu';

/**
 * Placement, and why it closed
 *
 * `placement` asks for a side; the panel takes it when there is room and flips when there
 * is not. `(closed)` reports the reason — an item, the trigger, Escape, a click outside —
 * so a consumer can tell a choice from a dismissal.
 */
@Component({
  selector: 'demo-menu-placement',
  imports: [PctButton, PctMenu, PctMenuItem, PctMenuTrigger],
  styles: ':host { display: grid; gap: 12px; justify-items: start; }',
  template: `
    <button pctButton variant="outline" [pctMenuTrigger]="sort">Sort by</button>
    <pct-menu #sort placement="end" (closed)="reason.set($event)">
      <button pctMenuItem>Newest first</button>
      <button pctMenuItem>Oldest first</button>
      <button pctMenuItem>Most discussed</button>
    </pct-menu>
    <p>Last closed by: {{ reason() ?? 'not opened yet' }}</p>
  `,
})
export class MenuPlacementDemo {
  readonly reason = signal<PctMenuCloseReason | null>(null);
}
