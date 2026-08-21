import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import {
  PctMenu,
  PctMenuCloseReason,
  PctMenuItem,
  PctMenuTrigger,
} from '@pacit/components/menu';
import { SbxDemo } from '../../ui/demo';

/**
 * The menu: a list of commands walked by the keyboard and chosen from. The card that matters
 * most is the second one — a submenu is the same component again, and the whole tree closes
 * together when something is chosen in it.
 */
@Component({
  selector: 'sbx-menu-view',
  imports: [SbxDemo, PctButton, PctMenu, PctMenuItem, PctMenuTrigger],
  templateUrl: './menu-view.html',
  styleUrl: './menu-view.scss',
})
export class MenuView {
  /** What the last press chose — the proof that an item's own `(click)` still runs. */
  protected readonly chosen = signal<string | null>(null);

  /** Why the menu last closed: the output, put on the screen. */
  protected readonly reason = signal<PctMenuCloseReason | null>(null);

  /** A counter beside the menu: proof that the page under one is not inert. */
  protected readonly count = signal(0);

  /** The long list, so that typeahead has something to type at. */
  protected readonly languages = [
    'Czech',
    'Danish',
    'English',
    'Estonian',
    'Finnish',
    'French',
    'German',
    'Polish',
  ];

  protected choose(what: string): void {
    this.chosen.set(what);
  }
}
