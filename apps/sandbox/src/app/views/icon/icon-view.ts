import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { SbxDemo } from '../../ui/demo';
import { SBX_GLYPHS, SBX_ICONS, SbxIconDressed } from './icon-sources';

/**
 * Icon: a drawing in a box the text sizes and colours. What the view measures is the BOX
 * — its three size steps and the `1em` it keeps beside text, the four tones and the colour
 * each paints, the name that makes it an image and the silence without one — and the
 * SOURCES: a drawing from data rendered element by element, a font keyed on a class, and
 * one line that dresses the library's own components in a set and stops where its
 * providers stop (0083).
 */
@Component({
  selector: 'sbx-icon-view',
  imports: [SbxDemo, PctIcon, PctAvatar, PctCheckbox, SbxIconDressed],
  templateUrl: './icon-view.html',
  styleUrl: './icon-view.scss',
  // The drawings first, the font after: the drawings answer for eight ids and `null` for
  // the rest, the font answers for everything — so the order is the one that lets both be
  // read. The font carries roles and the drawings do not, which is why the avatar and the
  // checkbox OUTSIDE the dressed card still draw what they ship with.
  providers: [providePctIcons(SBX_ICONS, SBX_GLYPHS)],
})
export class IconView {}
