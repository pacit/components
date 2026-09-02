import { Component, input } from '@angular/core';
import { PctSize } from '@pacit/components/core';

/**
 * Vertical rhythm: a flex column whose blocks stand one chosen step apart, instead of each
 * block bringing its own margin and the space between two of them being their sum. The
 * second layout primitive
 * ([0057](../../../../docs/decisions/0057-layout-is-three-entrypoints-not-a-framework.md)):
 * no ARIA, no parts, one input.
 *
 * `gap` rides the library's shared `sm | md | lg` axis — rhythm is a system decision, so
 * the step is picked from the scale, not typed as a length. It is deliberately **not**
 * `PCT_CONFIG.defaultSize`: that default names how big *controls* are, and a page's rhythm
 * is not a control height — a `compact` form is not a reason for sections to touch. The
 * attribute it reflects is `data-pct-gap`, not `data-pct-size`, for the same reason: the
 * size axis of `req-api-size` promises equal *heights*, and a stack has none to promise.
 *
 * @example
 * <pct-stack gap="lg">
 *   <section>…</section>
 *   <section>…</section>
 * </pct-stack>
 */
@Component({
  selector: 'pct-stack',
  templateUrl: './stack.html',
  styleUrl: './stack.scss',
  host: {
    class: 'pct-stack',
    '[attr.data-pct-gap]': 'gap()',
  },
})
export class PctStack {
  /** The step of the spacing scale between blocks. */
  readonly gap = input<PctSize>('md');
}
