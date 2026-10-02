import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { SbxDemo } from '../../ui/demo';
import { SBX_GLYPHS_ALONE, SBX_ICONS, SbxIconDressed } from './icon-sources';

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
  // The drawings first, the font after: the drawings answer for eight ids and `null` for the
  // rest, the font answers for everything — so the order is the one that lets both be
  // read. NEITHER carries a roles map here (the first cut gave the view the font WITH its
  // roles, and the "plain" avatar beside the dressed card wore the glyph too — the e2e
  // measured it, which is what the pair is for), so the avatar and the checkbox outside the
  // dressed card draw what they ship with.
  providers: [providePctIcons(SBX_ICONS, SBX_GLYPHS_ALONE)],
})
export class IconView {}
