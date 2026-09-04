import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTooltipPanel } from '@pacit/components/tooltip';

/**
 * The panel, standing over the control it is about — because the panel IS the tooltip, and
 * a card showing the trigger alone shows the one half of the pair every other page is
 * already full of.
 *
 * The panel is `PctTooltipPanel` itself, written into the template: an exported component
 * (`@pacit/components/tooltip`, selector `pct-tooltip`), the one the parts inventory names
 * as the owner of the `panel` part, taking its sentence as an input and painting it with
 * its own stylesheet. Nothing here imitates it — no `--pct-tooltip-*` is read by this file,
 * so a skin or a rewrite of the panel moves this card with it.
 *
 * What the scene does without is the OVERLAY, and with it the directive. `PctTooltip`
 * attaches this component on `pointerenter`, on `focusin` and on a long press, and a stage
 * that is `inert` under the card link's own hit area gets none of the three — so a trigger
 * carrying `pctTooltip` here would render exactly nothing in the prerendered HTML, which is
 * the defect this card exists to repair. Were it to fire after all, it would attach its
 * panel under `body` and position it against the VIEWPORT, not inside 144px of stage.
 *
 * The one thing the scene owns is the geometry: 8px is `OFFSET` in tooltip.ts, the gap the
 * position strategy is built with, and the default placement (`top`) centres the panel on
 * its control — a column is that arrangement at rest. It is also the only line here that
 * could go stale in silence, the constant being an argument to a strategy rather than a
 * token. Measured in chromium at the docs' Inter: panel 236 × 26px, trigger 36px tall, the
 * scene 236 × 70 of the stage's 307 × 144.
 *
 * The arrival is the component's own: `@starting-style` in tooltip.scss gives the panel a
 * state to come from, so it fades up on the page's first paint with no script running at
 * all — 150ms, and none for a reader who asked for less motion.
 */
@Component({
  selector: 'demo-tooltip-card',
  imports: [PctButton, PctTooltipPanel],
  // The panel's host is `display: contents`, so the gap falls between the panel and the
  // trigger rather than around a wrapper. 8px is the directive's `OFFSET`, in pixels for
  // the reason the directive keeps it in pixels: it is a number JavaScript hands the
  // position strategy, and no token carries it.
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: 8px;
    }
  `,
  // `panelId` is what a trigger's `aria-describedby` points at while the panel is up.
  // Nothing points at it here — no directive, and the stage is `aria-hidden` — so the scene
  // names it once rather than leaving the binding to write an empty `id` into the static
  // HTML. The text is the component page's own, so the card and the page say one thing.
  template: `
    <pct-tooltip
      text="Runs every check before publishing"
      panelId="tooltip-card-panel"
    />
    <button pctButton variant="outline">Verify</button>
  `,
})
export class TooltipCardScene {}
