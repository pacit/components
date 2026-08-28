import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import {
  PctDrawer,
  PctDrawerCloseReason,
  PctDrawerTrigger,
} from '@pacit/components/drawer';
import { PctSelect, PctSelectOption } from '@pacit/components/select';
import { SbxDemo } from '../../ui/demo';

/**
 * The drawer: a panel docked to an edge of the window, drawn where it stands in the document.
 * What is worth looking at here is everything it does NOT do — no overlay, no veil, no focus
 * trap, no page lock — and what falls out of that: the tab order is the page's, the theme
 * comes down the tree, and a shut drawer is still text the browser's find-in-page can reach.
 */
@Component({
  selector: 'sbx-drawer-view',
  imports: [SbxDemo, PctButton, PctDrawer, PctDrawerTrigger, PctSelect],
  templateUrl: './drawer-view.html',
  styleUrl: './drawer-view.scss',
})
export class DrawerView {
  protected readonly reasons = signal<readonly PctDrawerCloseReason[]>([]);
  protected readonly filters = signal(false);

  /** A panel of this library opened from inside the drawer — the z-index claim's own case. */
  protected readonly sizes: readonly PctSelectOption[] = [
    { value: 's', label: 'Small' },
    { value: 'm', label: 'Medium' },
    { value: 'l', label: 'Large' },
  ];

  protected record(reason: PctDrawerCloseReason): void {
    this.reasons.update((all) => [...all, reason]);
  }
}
