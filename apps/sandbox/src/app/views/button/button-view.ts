import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctTone } from '@pacit/components/core';
import { SbxDemo } from '../../ui/demo';

/**
 * The view of the `PctButton` component — the pattern for the remaining per-component
 * views: every example sits in an `sbx-demo` card and takes its size from that card's
 * axis (`d.activeSize()`) instead of having one hard-coded.
 */
@Component({
  selector: 'sbx-button-view',
  imports: [PctButton, RouterLink, SbxDemo],
  templateUrl: './button-view.html',
  styleUrl: './button-view.scss',
})
export class ButtonView {
  /**
   * The tone axis, written out rather than derived from the type: the view is what the
   * forced-colours and visual readings walk, so a name that quietly left `PctTone` has to
   * disappear from the page too — and a list built from the type could not show that.
   */
  readonly tones: readonly PctTone[] = ['danger', 'warning', 'success', 'info'];

  /** The faces that wear one. `hero` is the brand gradient and refuses (0058). */
  readonly tonedFaces = ['solid', 'outline', 'ghost', 'soft'] as const;
}
