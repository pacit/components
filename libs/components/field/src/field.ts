import {
  booleanAttribute,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  pctDescribedBy,
  pctFieldMessages,
  PctFieldApi,
  PctFieldControl,
} from '@pacit/components/core';
import { PctLabelAux, PctMessageAux } from './aux';
import { PctFieldSize } from './field.types';

/**
 * The chrome of a form field: label, hint, error message, the required marker and the
 * `[pctPrefix]` / `[pctSuffix]` slots inside the field.
 *
 * Below the field there is **one line**: the hint or the error (the error wins). Two further
 * slots aligned to the end carry side content: `[pctLabelAux]` in the label row (an "i" icon,
 * say) and `[pctMessageAux]` in the message row (a character counter).
 *
 * The chrome is **presentational** — the form contract is implemented not by it but by the
 * control inside (`req-api-wrapper`). Value typing therefore stays with the kind of field
 * (`string`, `number`, `Date`, `string[]`).
 *
 * A control registers itself through the `PCT_FIELD` token; the chrome reads its state and
 * hands it the ids of the descriptions for `aria-describedby`.
 *
 * @example
 * <pct-field label="E-mail" hint="Your work address">
 *   <input pctText type="email" [formField]="f.email" />
 * </pct-field>
 */
@Component({
  selector: 'pct-field',
  templateUrl: './field.html',
  styleUrl: './field.scss',
  providers: [{ provide: PCT_FIELD, useExisting: PctField }],
  host: {
    class: 'pct-field',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-appearance]': 'appearance()',
    '[attr.data-pct-cursor]': 'cursor()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctField implements PctFieldApi {
  private readonly config = inject(PCT_CONFIG);

  readonly label = input<string>('');
  readonly hint = input<string>('');

  /**
   * The field size; taken from the global configuration by default (req-api-config). It
   * concerns the **field row** — the height here equals that of a button of the same size,
   * because both take it from the `--pct-control-height-*` token (req-api-size).
   */
  readonly size = input<PctFieldSize>(this.config.defaultSize);

  /** Requiredness can be given outright when the control does not report it. */
  readonly required = input(false, { transform: booleanAttribute });

  private readonly control = signal<PctFieldControl | null>(null);

  // Whether the side slots are present decides whether their row is drawn at all — an empty
  // label/message row would only add a gap. The queries target the directives, so a consumer
  // has to import them (as with `pctPrefix`).
  protected readonly labelAux = contentChild(PctLabelAux);
  protected readonly messageAux = contentChild(PctMessageAux);

  private readonly uid = nextPctId('pct-field');
  protected readonly labelId = `${this.uid}-label`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // The state comes from the registered control; without one the chrome is neutral.
  private readonly invalid = computed(() => this.control()?.invalid() ?? false);
  private readonly touched = computed(() => this.control()?.touched() ?? false);
  protected readonly disabled = computed(
    () => this.control()?.disabled() ?? false,
  );
  private readonly errors = computed(() => this.control()?.errors() ?? []);

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  protected readonly showInvalid = this.messages.showInvalid;
  protected readonly showError = this.messages.showError;

  /** Requiredness: this input, or the one the control reports. */
  protected readonly isRequired = computed(
    () => this.required() || (this.control()?.required() ?? false),
  );

  /** The label points at the control (`for`) or names it (`aria-labelledby`). */
  protected readonly labelFor = computed(() => {
    const c = this.control();
    return c && c.labelStrategy === 'for' ? c.controlId : null;
  });

  /** The border is drawn only for controls it suits (`req-api-frame`). */
  protected readonly appearance = computed(
    () => this.control()?.fieldAppearance ?? 'boxed',
  );

  /** The control reports the cursor over the border; being disabled overrides it in CSS. */
  protected readonly cursor = computed(
    () => this.control()?.fieldCursor ?? 'default',
  );

  attach(control: PctFieldControl): void {
    const taken = this.control();
    this.control.set(control);
    if (taken !== null && taken !== control)
      this.warnOnSecondControl(taken, control);
  }

  detach(control: PctFieldControl): void {
    // A goodbye from a control that is no longer the current one changes nothing: the chrome
    // has already been taken over by its successor (`pctAttachToField` in `core`).
    if (this.control() === control) this.control.set(null);
  }

  /**
   * Two controls inside one chrome. The last to register wins, and it wins **quietly** — the
   * label points at it, the hint and error ids go to it, and the earlier control is left
   * unlabelled and undescribed while looking exactly as it should. The chrome cannot choose
   * between them (which one the label was written for is not its to know), so it says so.
   *
   * A control **replaced** is not this case: it detaches on destruction, so what is reported
   * here is two controls alive at once.
   */
  private warnOnSecondControl(
    previous: PctFieldControl,
    next: PctFieldControl,
  ): void {
    if (!isDevMode()) return;
    console.warn(
      `[pct-field] Two controls inside one field ("${previous.controlId}" and ` +
        `"${next.controlId}"). The chrome describes the last one to ` +
        `register: the label points at it and the hint and error ids go to it, so ` +
        `the earlier control is left unlabelled and undescribed. Give each control ` +
        `a field of its own.`,
    );
  }

  private readonly row = viewChild<ElementRef<HTMLElement>>('row');

  /**
   * The field border as the reference surface for a control's overlays (req-api-wrapper).
   * `null` only before the view is built — a control asks for it when opening its panel, and
   * by then the row stands.
   */
  readonly surface = computed(() => this.row()?.nativeElement ?? null);

  /**
   * Whether the event hit an element the chrome does not reach into — it then keeps out of
   * the click.
   */
  private handledByTarget(event: MouseEvent): boolean {
    const target = event.target as HTMLElement | null;
    return target?.closest(PctField.ownSurface) != null;
  }

  /**
   * The control itself and interactive elements handle the click on their own. A `fill`
   * decoration handles nothing, but it is a surface of its own: since it shows its own cursor,
   * a click on it must not quietly do something else.
   */
  private static readonly ownSurface =
    'button, a, input, textarea, select, [tabindex], [data-pct-fit="fill"]';

  /**
   * A click on the field area that is not the control (border padding, the gap between
   * decorations) is passed to the control. Without this a "dead zone" appears: the cursor is
   * inside the border, but a click sets no focus.
   */
  protected onRowPointerDown(event: MouseEvent): void {
    if (this.handledByTarget(event)) return;
    // Prevents focus loss on a click into the row's background.
    event.preventDefault();
    this.control()?.focus?.();
  }

  /**
   * Activation goes on `click`, not on `mousedown`: a CDK overlay opened on `mousedown` would
   * close at once, taking the completing `click` for a click outside the panel.
   */
  protected onRowClick(event: MouseEvent): void {
    if (this.handledByTarget(event)) return;
    this.control()?.activate?.();
  }

  constructor() {
    // The description ids belong to the chrome, but the control has to expose them (it is the
    // one carrying `aria-describedby`). This is a write into the control, not a derived value
    // — hence effect, not computed.
    // Only one message is lit below the field, so `aria-describedby` points at exactly the one
    // that is in the DOM: the error, or the hint when there is none. Pointing at a hidden
    // element would be a dangling reference for the screen reader.
    effect(() => {
      this.control()?.setDescribedBy(
        pctDescribedBy([
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
        ]),
      );
    });

    // Groups (labelStrategy: 'labelledby') are named through aria-labelledby, because
    // `<label for>` does not name a set of elements.
    effect(() => {
      const c = this.control();
      if (!c || c.labelStrategy !== 'labelledby') return;
      c.setLabelledBy?.(this.label() ? this.labelId : null);
    });
  }
}
