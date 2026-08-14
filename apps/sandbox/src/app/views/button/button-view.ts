import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { SbxDemo } from '../../ui/demo';

/**
 * The view of the `PctButton` component — the pattern for the remaining per-component
 * views: every example sits in an `sbx-demo` card and takes its size from that card's
 * axis (`d.activeSize()`) instead of having one hard-coded.
 */
@Component({
  selector: 'sbx-button-view',
  imports: [PctButton, SbxDemo],
  templateUrl: './button-view.html',
  styleUrl: './button-view.scss',
})
export class ButtonView {}
