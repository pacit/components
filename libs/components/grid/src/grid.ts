import { Component } from '@angular/core';

/**
 * A grid of equals that finds its own column count. The consumer states the one thing only
 * they know — how narrow a card may get, `--pct-grid-min-width` — and the browser derives
 * every "breakpoint" from it: columns drop one by one as the space runs out, down to a
 * single column that never overflows. **Responsive without a media query in consumer
 * code**, which is the third layout primitive's whole pitch
 * ([0057](../../../../docs/decisions/0057-layout-is-three-entrypoints-not-a-framework.md)).
 *
 * No inputs, like the container: both lengths are tokens, and per-instance tuning is the
 * same token scoped on the element —
 * `<pct-grid style="--pct-grid-min-width: 12rem">` is the input.
 *
 * @example
 * <pct-grid>
 *   <article>…</article>
 *   <article>…</article>
 *   <article>…</article>
 * </pct-grid>
 */
@Component({
  selector: 'pct-grid',
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
  host: { class: 'pct-grid' },
})
export class PctGrid {}
