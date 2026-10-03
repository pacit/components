import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';
import { PctTooltip } from '@pacit/components/tooltip';
import { Copy, Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide';

/**
 * Icon only
 *
 * `iconOnly` makes the face a square as tall as its size, with the glyph on the icon's own
 * step for it — every face, tone and state is the same button's. There is nothing on it to
 * read, so the name is written on the button: a tooltip with `pctTooltipAs="name"` shows it
 * and speaks it, `aria-label` only speaks it. Press refresh to watch the spinner take the
 * glyph's place.
 */
@Component({
  selector: 'demo-button-icon-only',
  imports: [PctButton, PctIcon, PctTooltip],
  providers: [
    providePctIcons(
      svgIcons({
        pencil: Pencil,
        copy: Copy,
        download: Download,
        trash: Trash2,
        plus: Plus,
        refresh: RefreshCw,
      }),
    ),
  ],
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .gap {
      inline-size: 16px;
    }
  `,
  template: `
    <button
      pctButton
      iconOnly
      variant="ghost"
      pctTooltip="Edit"
      pctTooltipAs="name"
    >
      <pct-icon icon="pencil" />
    </button>
    <button
      pctButton
      iconOnly
      variant="ghost"
      pctTooltip="Duplicate"
      pctTooltipAs="name"
    >
      <pct-icon icon="copy" />
    </button>
    <button
      pctButton
      iconOnly
      variant="ghost"
      pctTooltip="Download"
      pctTooltipAs="name"
    >
      <pct-icon icon="download" />
    </button>
    <button
      pctButton
      iconOnly
      variant="ghost"
      tone="danger"
      pctTooltip="Delete"
      pctTooltipAs="name"
    >
      <pct-icon icon="trash" />
    </button>
    <span class="gap"></span>
    <button
      pctButton
      iconOnly
      variant="outline"
      aria-label="Refresh"
      [loading]="refreshing()"
      [disabled]="refreshing()"
      (click)="refresh()"
    >
      <pct-icon icon="refresh" />
    </button>
    <button pctButton iconOnly size="lg" aria-label="New document">
      <pct-icon icon="plus" />
    </button>
  `,
})
export class ButtonIconOnlyDemo {
  protected readonly refreshing = signal(false);

  protected refresh(): void {
    this.refreshing.set(true);
    setTimeout(() => this.refreshing.set(false), 1500);
  }
}
