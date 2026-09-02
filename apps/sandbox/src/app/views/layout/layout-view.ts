import { Component } from '@angular/core';
import { PctContainer } from '@pacit/components/container';
import { PctGrid } from '@pacit/components/grid';
import { PctStack } from '@pacit/components/stack';
import { SbxDemo } from '../../ui/demo';

/**
 * The three layout primitives on one stage (0057). What is worth watching: none of the
 * three carries a single ARIA attribute or a media query — the container caps and centres
 * from two tokens, the stack spaces from the shared scale, and the grid derives every
 * "breakpoint" from one minimum width the e2e suite narrows and widens with a ruler.
 */
@Component({
  selector: 'sbx-layout-view',
  imports: [SbxDemo, PctContainer, PctGrid, PctStack],
  templateUrl: './layout-view.html',
  styleUrl: './layout-view.scss',
})
export class LayoutView {}
