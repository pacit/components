import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctSize, PctTone } from '@pacit/components/core';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { PctTooltip } from '@pacit/components/tooltip';
import { SbxDemo } from '../../ui/demo';
import { SBX_ICONS } from '../icon/icon-sources';

/**
 * The view of the `PctButton` component — the pattern for the remaining per-component
 * views: every example sits in an `sbx-demo` card and takes its size from that card's
 * axis (`d.activeSize()`) instead of having one hard-coded.
 */
@Component({
  selector: 'sbx-button-view',
  imports: [PctButton, PctIcon, PctTooltip, RouterLink, SbxDemo],
  templateUrl: './button-view.html',
  styleUrl: './button-view.scss',
  // The icon-only cards draw the sandbox's own drawings, provided here rather than for the
  // whole application: the other views measure what their components ship with.
  providers: [providePctIcons(SBX_ICONS)],
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

  /** The size axis for the icon-only line-up, each square beside a labelled twin. */
  readonly sizes: readonly PctSize[] = ['sm', 'md', 'lg'];
}
