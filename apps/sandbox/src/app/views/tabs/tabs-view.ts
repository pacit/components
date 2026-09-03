import { Component, signal } from '@angular/core';
import { PctTab, PctTabs } from '@pacit/components/tabs';
import { SbxDemo } from '../../ui/demo';

/**
 * Tabs: one section showing at a time. The two things worth looking at here are what a panel
 * nobody chose still is — text the browser's find-in-page can reach — and what the strip does
 * when there are more labels than room.
 */
@Component({
  selector: 'sbx-tabs-view',
  imports: [SbxDemo, PctTabs, PctTab],
  templateUrl: './tabs-view.html',
  styleUrl: './tabs-view.scss',
})
export class TabsView {
  protected readonly section = signal('general');
  protected readonly manual = signal('overview');
  protected readonly side = signal('profile');
  protected readonly period = signal('week');

  /** Enough labels to overflow the strip on a narrow window. */
  protected readonly many = signal('m1');
}
