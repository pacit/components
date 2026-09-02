import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import { PctGrid } from '@pacit/components/grid';
import { PctStack } from '@pacit/components/stack';

/**
 * The scaffold's home page — an honest placeholder, not a preview of the landing: the
 * real hero, the evidence strip and the gallery land with 2.1.5–2.1.7, fed by the content
 * pipeline. What this page already proves is the law of [site.md](../../../../../../docs/site.md):
 * everything on it is the library — the column, the rhythm, the grid, the buttons, the
 * theme the shell pins.
 */
@Component({
  selector: 'docs-home',
  imports: [PctButton, PctContainer, PctGrid, PctStack],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {}
