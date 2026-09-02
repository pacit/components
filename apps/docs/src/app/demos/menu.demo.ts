import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctMenu, PctMenuItem, PctMenuTrigger } from '@pacit/components/menu';

/** A menu of commands: arrows walk it, typing jumps, choosing closes the whole tree. */
@Component({
  selector: 'demo-menu',
  imports: [PctButton, PctMenu, PctMenuItem, PctMenuTrigger],
  template: `
    <button pctButton variant="outline" [pctMenuTrigger]="actions">
      Actions
    </button>

    <pct-menu #actions>
      <button pctMenuItem (click)="last.set('Rename')">Rename</button>
      <button pctMenuItem (click)="last.set('Duplicate')">Duplicate</button>
      <button pctMenuItem disabled>Archive</button>
    </pct-menu>

    <p>Last command: {{ last() || 'none yet' }}</p>
  `,
})
export class MenuDemo {
  readonly last = signal('');
}
