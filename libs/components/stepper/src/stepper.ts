import {
  afterNextRender,
  Component,
  computed,
  contentChildren,
  ElementRef,
  inject,
  InjectionToken,
  input,
  isDevMode,
  numberAttribute,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * A marker a step provides so the row can collect its children — the chips' channel: the
 * query reads the `ElementRef`, so the token carries no surface at all.
 */
const PCT_STEP = new InjectionToken<void>('PCT_STEP');

/**
 * What a step is at this moment of the journey — computed, never set.
 *
 * @since 0.1.0
 */
export type PctStepState = 'done' | 'current' | 'upcoming';

/**
 * A stepper: the map of a multi-step journey — "step 2 of 4" above a checkout.
 *
 * **There is no ARIA APG pattern for a stepper, and this component does not invent one.**
 * The host is a `list` and every step a `listitem` — the geometry the breadcrumb's probe
 * measured clean in three engines
 * ([0054](../../../../docs/decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md)) —
 * with `aria-current="step"` on the step the `step` input names
 * ([0055](../../../../docs/decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md)).
 * No landmark: a map of status is not navigation, and a `navigation` role would promise
 * links this component does not draw.
 *
 * **The application owns the journey; the component owns the picture.** `step` is one
 * 1-based number — the number the user reads, the pagination's argument — and the DOM
 * order of the projected steps does the rest: before it done, at it current, after it
 * upcoming. There is no model and no event, because a map does not move the traveller: a
 * step that answers a press is the application's own `<a>` or `<button>` projected into
 * the label, wearing the application's own guard logic.
 *
 * @example
 * <pct-stepper [step]="wizard.step()" ariaLabel="Checkout">
 *   <pct-step>Cart</pct-step>
 *   <pct-step>Delivery</pct-step>
 *   <pct-step>Payment</pct-step>
 *   <pct-step>Review</pct-step>
 * </pct-stepper>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-stepper',
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
  host: {
    class: 'pct-stepper',
    // Static for the chips' measured reason: an empty `list` raises nothing in any
    // engine's audit (lesson-138), so a row with no steps yet needs no machinery.
    role: 'list',
    '[attr.aria-label]': 'ariaLabel() || null',
  },
})
export class PctStepper {
  /**
   * Where the journey stands, 1-based — "step 2 of 4" is what the user reads, and the
   * same number is the current marker's visible ordinal (the pagination's argument for
   * its `page`). Below 1 every step is upcoming; past the count every step is done —
   * both are honest sentences about a journey not yet started or already finished, so
   * nothing is clamped and nothing written back.
   *
   * @since 0.1.0
   */
  readonly step = input.required<number, unknown>({
    transform: numberAttribute,
  });

  /**
   * The accessible name of the list. Optional, the chips' reasoning: a list is allowed
   * to be nameless, and a library default would have to guess what journey this is —
   * two maps on one page ("Checkout", "Onboarding") are told apart here.
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /**
   * The step hosts in document order — the numbering, read by every step.
   *
   * @since 0.1.0
   */
  readonly steps = contentChildren(PCT_STEP, { read: ElementRef });
}

/**
 * One step of the map: `role="listitem"`, the connector and the marker drawn before the
 * projected label, and the state computed from the row's one number — never set here.
 *
 * A done step carries a visually-hidden `texts().stepDone` after the label, because the
 * check that marks it is a drawing the accessibility tree never sees: a reader hears
 * "Payment, Completed" where the eye sees the check (0055).
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-step',
  imports: [PctIcon],
  templateUrl: './step.html',
  styleUrl: './step.scss',
  providers: [{ provide: PCT_STEP, useValue: undefined }],
  host: {
    class: 'pct-stepper__step',
    // The platform's own name for "one of these" — the chip's move, one decision back:
    // the native `<li>` is out of reach on a custom element (`req-a11y-built-in`).
    role: 'listitem',
    // Written by the component and not by the consumer — the OPPOSITE of the
    // breadcrumb's refusal, and the same rule underneath: the attribute belongs to
    // whoever holds the truth. Here the application has already spoken through `step`,
    // and this is the pagination's stamp one component over.
    '[attr.aria-current]': 'state() === "current" ? "step" : null',
    '[attr.data-pct-state]': 'state()',
  },
})
export class PctStep {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly stepper = inject(PctStepper, { optional: true });
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * This step's 1-based place in the row, read off the projected order — inserting or
   * removing a step renumbers every neighbour through the query, with nothing to wire.
   */
  protected readonly ordinal = computed(() => {
    if (!this.stepper) return 0;
    const hosts = this.stepper.steps();
    return (
      hosts.findIndex(
        (step: ElementRef<HTMLElement>) =>
          step.nativeElement === this.host.nativeElement,
      ) + 1
    );
  });

  /** Behind the pointer done, at it current, past it upcoming — the whole state machine. */
  protected readonly state = computed<PctStepState>(() => {
    const at = this.ordinal();
    if (!this.stepper || at < 1) return 'upcoming';
    const step = Math.trunc(this.stepper.step() || 0);
    if (at < step) return 'done';
    return at === step ? 'current' : 'upcoming';
  });

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnLooseStep());
  }

  /**
   * A step outside `pct-stepper`, or wrapped in something inside it, is a `listitem`
   * whose `list` is not directly above it — the loose arrangement the breadcrumb's probe
   * measured as a critical violation — and a wrapped step is also invisible to the
   * numbering, whose query holds only the row's own children. One check catches both,
   * asked of the platform (the chips' warning, at the third component).
   */
  private warnOnLooseStep(): void {
    const above = this.host.nativeElement.parentElement;
    if (this.stepper && above?.getAttribute('role') === 'list') return;
    // One literal on purpose — the breadcrumb's mutation-run lesson: a joined fragment
    // nothing asserts on is a surviving mutant, one string is one.
    console.warn(
      `[pct-step] A step whose parent element is not a list. \`role="listitem"\` needs \`role="list"\` directly above it, and the numbering lives in the row — make the step a direct child of <pct-stepper>.`,
    );
  }
}
