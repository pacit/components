import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import {
  PctCard,
  PctCardControl,
  PctCardLink,
  PctCardSubtitle,
  PctCardTitle,
} from '@pacit/components/card';
import { PctSwitch } from '@pacit/components/switch';
import { SbxDemo } from '../../ui/demo';

/**
 * Card: a header, a body and a footer. What is worth watching: the cards of a row stand at one
 * height with their footers on one line; a card that is one link opens on a press anywhere,
 * while its switch and its buttons answer on their own; and the three states — loading, error
 * and muted — each replace the body or the colours, never the controls.
 */
@Component({
  selector: 'sbx-card-view',
  imports: [
    SbxDemo,
    RouterLink,
    PctCard,
    PctCardTitle,
    PctCardSubtitle,
    PctCardLink,
    PctCardControl,
    PctButton,
    PctSwitch,
  ],
  templateUrl: './card-view.html',
  styleUrl: './card-view.scss',
})
export class CardView {
  protected readonly enabled = signal(true);
  protected readonly renamed = signal(0);
  protected readonly loading = signal(true);
}
