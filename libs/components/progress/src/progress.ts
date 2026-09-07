import {
  Component,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  numberAttribute,
} from '@angular/core';
import { PCT_CONFIG, PctSize, PctTone } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * A progress bar: how far along a task is, or that it is under way at all.
 *
 * **There is no ARIA APG pattern for a progress bar** — what there is is the `progressbar`
 * role, and this component does not write it. The bar IS a `<progress>`, so the role, the
 * value, the bounds and — the part nobody gets right by hand — the **indeterminate** state
 * are the platform's
 * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform),
 * [0049](../../../../docs/decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md)).
 * Indeterminacy is the absence of a value, and an element with no `value` attribute reaches
 * the accessibility tree with **no value at all**; an author writing `aria-valuenow` by hand
 * has to choose a number and every number is a claim about progress nobody has measured.
 *
 * **The paint is ours, and that is a measurement rather than a preference.** Styling a
 * `<progress>` needs `appearance: none`, which takes the engine's indeterminate animation
 * away and gives nothing back: the same two declarations leave the bar empty in Chromium and
 * WebKit and **full** in Firefox, where `::-moz-progress-bar` keeps its width. So the track
 * is the element itself, painted flat, and the fill is a sibling drawn over it — the
 * checkbox's shape, one component over: the platform's element for what a reader hears, ours
 * for what an eye sees ([`lesson-133`](../../../../docs/lessons.md#lesson-133)).
 *
 * **It has no name of its own.** A progress bar's name is what is progressing, which only the
 * consumer knows, so this component invents none and warns in dev mode when neither
 * `ariaLabel` nor `ariaLabelledby` is given — a bar named "Progress" would pass an audit and
 * say nothing.
 *
 * @example
 * <pct-progress [value]="uploaded()" [max]="total()" ariaLabel="Uploading" />
 * <pct-progress ariaLabelledby="report-caption" />
 */
@Component({
  selector: 'pct-progress',
  imports: [PctIcon],
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
  host: {
    class: 'pct-progress',
    '[attr.data-pct-size]': 'size()',
    // The state a skin reads, and the one the stylesheet's band rule turns on. It is written
    // where the paint is — the ARIA half of the same fact is the `<progress>`'s own, and this
    // component writes no ARIA anywhere (0039).
    '[attr.data-pct-indeterminate]': 'value() === null ? "" : null',
    '[attr.data-pct-tone]': 'tone()',
  },
})
export class PctProgress {
  private readonly config = inject(PCT_CONFIG);

  /**
   * How far along, in the same unit as `max`. `null` — the default — is **indeterminate**:
   * the task is under way and how far is not known.
   *
   * A value that is not a finite number is `null` as well, and deliberately so: text that
   * does not parse is not a measurement, and the honest report of a number nobody has is the
   * one the platform already has a state for. Out of range it is clamped into `[0, max]`,
   * and the clamped number is what the element carries — a reader is told 100%, not 150%.
   */
  readonly value = input<number | null, unknown>(null, {
    transform: progressValue,
  });

  /**
   * The value that means "done" — `100` by default, so a bare `[value]="40"` is forty per
   * cent.
   *
   * The platform's own default is `1`, and this is the one place the component leaves it.
   * The reason is which mistake each default produces: with `max="1"` a consumer who writes
   * `[value]="40"` gets a **full** bar, because the platform clamps — a wrong answer that
   * looks like a finished task. With `max="100"` the same slip the other way (`[value]="0.4"`
   * for four tenths) draws an almost empty bar, which is visibly wrong and fixed in seconds.
   *
   * A `max` that is not a positive finite number is not a scale, so the default stands in for
   * it.
   */
  readonly max = input(DEFAULT_MAX, { transform: numberAttribute });

  /**
   * The accessible name — what is progressing. There is no default: see the class note.
   *
   * It lands on the `<progress>` inside the template, which is where the role is; written on
   * the `<pct-progress>` tag it would sit on an element with no role at all
   * ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   */
  readonly ariaLabel = input<string>('');

  /**
   * The `id` of the element that already names this bar — a caption or a heading standing
   * beside it. The usual case: the sentence a sighted user reads is the name a screen-reader
   * user should hear, and repeating it in `ariaLabel` is two strings to keep in step.
   */
  readonly ariaLabelledby = input<string>('');

  /** Size; taken from the global configuration by default (`req-api-config`). */
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * What the work IS, drawn as a mark beside the bar and as the colour of the fill — not how
   * far it got, which is `value`. A failed upload is `tone: 'danger'` at whatever percentage
   * it stopped at; a finished one is `'success'` at 100. An indeterminate bar may carry a tone
   * too: "retrying, and the last attempt failed" is a real state, and nothing here pretends to
   * know what the work will do next.
   *
   * `null` — the default — draws no mark at all and leaves the geometry exactly as it was
   * before tones existed. The mark is the half that survives a forced palette and a reader who
   * does not separate red from green, which is why a tone here is never only a colour
   * ({@link PctTone}, plan 4.14).
   */
  readonly tone = input<PctTone | null>(null);

  /** The scale, with anything that is not a positive finite number replaced by the default. */
  protected readonly upper = computed(() => {
    const max = this.max();
    return Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX;
  });

  /**
   * The value the element carries: the consumer's own number clamped into `[0, max]`, or
   * `null` while indeterminate. Clamped rather than passed through, because the platform
   * clamps for its own drawing anyway — and then the fill and the accessibility tree would
   * be reporting two different things about the same bar.
   */
  protected readonly reported = computed(() => {
    const value = this.value();
    if (value === null) return null;
    return Math.min(this.upper(), Math.max(0, value));
  });

  /**
   * The fill's width, or `null` while indeterminate — and `null` is what removes the inline
   * style, so the band's width in the stylesheet is what answers. An inline `0%` would win
   * over it and draw nothing.
   */
  protected readonly percent = computed(() => {
    const reported = this.reported();
    return reported === null ? null : (reported / this.upper()) * 100;
  });

  constructor() {
    if (isDevMode()) effect(() => this.warnOnUnnamed());
  }

  /**
   * A bar nobody can name, reported once per state that has it. The library invents no
   * default name for this component, so this is the only thing that stands between a
   * consumer and a `progressbar` announced as nothing at all — which is the violation axe
   * calls `aria-progressbar-name`, in the one place a static gate here cannot see it: a
   * consumer's own application.
   */
  private warnOnUnnamed(): void {
    if (this.ariaLabel() || this.ariaLabelledby()) return;
    console.warn(
      `[pct-progress] A progress bar with no accessible name. Give it \`ariaLabel\`, or ` +
        `\`ariaLabelledby\` pointing at the caption that already names it. This component ` +
        `supplies no default: the name of a progress bar is WHAT is progressing, and only ` +
        `the application knows that — "Progress" would pass an audit and tell a screen-` +
        `reader user nothing.`,
    );
  }
}

/**
 * The scale the component uses when it is given none. See `max` for why it is not the
 * platform's `1`.
 */
const DEFAULT_MAX = 100;

/**
 * The `value` input's transform: a finite number, or `null` for "no number" — which is what
 * an absent attribute, an empty one and text that does not parse all mean.
 *
 * `numberAttribute` is not enough here: it answers `NaN` for junk, and `NaN` compared with
 * anything is `false`, so it would travel through the clamp and reach the element as an
 * attribute the browser then ignores — a bar that is indeterminate in the accessibility tree
 * and determinate in every branch of this class.
 */
function progressValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
