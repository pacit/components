import { Component, signal } from '@angular/core';
import { PctTree, PctTreeItem } from '@pacit/components/tree';
import { SbxDemo } from '../../ui/demo';

/**
 * Tree: a walk the platform does not have. What is worth watching: ONE tab stop with a
 * roving focus inside (Tab leaves the whole hierarchy), the inline pair swapping under
 * RTL by the computed direction, a folded branch still findable (beforematch opens it),
 * and a selection model the keys and the pointer write the same way.
 */
@Component({
  selector: 'sbx-tree-view',
  imports: [SbxDemo, PctTree, PctTreeItem],
  templateUrl: './tree-view.html',
  styleUrl: './tree-view.scss',
})
export class TreeView {
  protected readonly chosen = signal<string | null>('src/app.ts');
  protected readonly srcOpen = signal(true);
}
