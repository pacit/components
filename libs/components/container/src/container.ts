import { Component } from '@angular/core';

/**
 * A reading column: content capped at `--pct-container-max-width`, centred, with a gutter
 * that follows the viewport. The first of the three layout primitives
 * ([0057](../../../../docs/decisions/0057-layout-is-three-entrypoints-not-a-framework.md)),
 * and like the other two it carries **no ARIA at all** — layout is presentational, and the
 * platform's `div` needs no help being one. It has no inputs either: both of its lengths
 * are tokens, and a token scoped on the element is the per-instance API.
 *
 * The quiet extra is `container-type: inline-size` on the host: everything projected into
 * the column can size itself against **this column** with a container query, instead of
 * guessing at the viewport a sidebar may have eaten half of.
 *
 * @example
 * <pct-container>
 *   <h1>…</h1>
 *   <p>…</p>
 * </pct-container>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-container',
  templateUrl: './container.html',
  styleUrl: './container.scss',
  host: { class: 'pct-container' },
})
export class PctContainer {}
