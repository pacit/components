import { Component } from '@angular/core';
import { fontAwesome, PctIcon, providePctIcons } from '@pacit/components/icon';

// The regular style in a scope of its own: the same six ids, drawn in outline. A source is
// an ordinary provider, so a row can hold a style the row beside it does not.
@Component({
  selector: 'demo-icon-fontawesome-regular',
  imports: [PctIcon],
  providers: [providePctIcons(fontAwesome({ style: 'regular' }))],
  styles: ':host { display: contents; }',
  template: `
    <pct-icon icon="heart" tone="danger" />
    <pct-icon icon="bell" />
    <pct-icon icon="star" tone="warning" />
    <pct-icon icon="user" />
    <pct-icon icon="circle-check" tone="success" />
    <pct-icon icon="calendar" />
  `,
})
export class IconFontAwesomeRegular {}

/**
 * Font Awesome
 *
 * `fontAwesome()` is the free solid style: `<pct-icon icon="heart">` holds a span wearing
 * `fa-solid fa-heart`, drawn by the stylesheet you include. `style` picks another of the
 * font's — `regular` in the second row, `brands` for the logos — and a version-5 sheet takes
 * its three-letter prefix in `prefix`. The roles map spells the names of versions 6 and 7; a sheet
 * that spells one differently corrects it in `roles`, which is what `{ close: 'times' }` is
 * for on version 5.
 */
@Component({
  selector: 'demo-icon-fontawesome',
  imports: [PctIcon, IconFontAwesomeRegular],
  providers: [providePctIcons(fontAwesome())],
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-size: 24px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }
  `,
  template: `
    <div class="row">
      <pct-icon icon="heart" tone="danger" />
      <pct-icon icon="bell" />
      <pct-icon icon="star" tone="warning" />
      <pct-icon icon="user" />
      <pct-icon icon="circle-check" tone="success" />
      <pct-icon icon="calendar" />
    </div>
    <div class="row">
      <demo-icon-fontawesome-regular />
    </div>
  `,
})
export class IconFontAwesomeDemo {}
