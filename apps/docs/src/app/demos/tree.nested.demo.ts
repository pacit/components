import { Component, signal } from '@angular/core';
import { PctTree, PctTreeItem } from '@pacit/components/tree';

/**
 * A deep branch, opened
 *
 * Every `pct-tree-item` can hold more items; `expanded` opens a branch from the start, and
 * `selected` is a two-way value — set it, and the tree shows the way to that node.
 */
@Component({
  selector: 'demo-tree-nested',
  imports: [PctTree, PctTreeItem],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-tree ariaLabel="Repository" [(selected)]="chosen">
      <pct-tree-item value="apps" [expanded]="true">
        apps
        <pct-tree-item value="apps/docs" [expanded]="true">
          docs
          <pct-tree-item value="apps/docs/src">src</pct-tree-item>
        </pct-tree-item>
        <pct-tree-item value="apps/sandbox">sandbox</pct-tree-item>
      </pct-tree-item>
      <pct-tree-item value="libs">
        libs
        <pct-tree-item value="libs/components">components</pct-tree-item>
        <pct-tree-item value="libs/tokens">tokens</pct-tree-item>
      </pct-tree-item>
    </pct-tree>
    <p>Selected: {{ chosen() ?? 'nothing yet' }}</p>
  `,
})
export class TreeNestedDemo {
  readonly chosen = signal<string | null>('apps/docs/src');
}
