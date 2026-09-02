import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { PctGrid } from '@pacit/components/grid';
import { DOCS_CARDS } from '../../../generated/content';

/** The gallery: every documented component, one tile each, straight from the cards. */
@Component({
  selector: 'docs-components',
  imports: [RouterLink, PctContainer, PctGrid],
  templateUrl: './components.html',
  styleUrl: './components.scss',
})
export class ComponentsPage {
  protected readonly cards = DOCS_CARDS;
}
