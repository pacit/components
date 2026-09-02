import { Component, signal } from '@angular/core';
import { PctTree, PctTreeItem } from '@pacit/components/tree';

/** One tabstop, arrows do the walking — a file picker in eight declarative lines. */
@Component({
  selector: 'demo-tree',
  imports: [PctTree, PctTreeItem],
  template: `
    <pct-tree ariaLabel="Project files" [(selected)]="chosen">
      <pct-tree-item value="README.md">README.md</pct-tree-item>
      <pct-tree-item value="src" [expanded]="true">
        src
        <pct-tree-item value="src/app.ts">app.ts</pct-tree-item>
        <pct-tree-item value="src/theme.ts">theme.ts</pct-tree-item>
      </pct-tree-item>
    </pct-tree>
    <p>Selected: {{ chosen() ?? 'nothing yet' }}</p>
  `,
})
export class TreeDemo {
  readonly chosen = signal<string | null>('src/app.ts');
}
