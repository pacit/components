import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctAttachToField,
  pctDescribedBy,
  pctFieldMessages,
  pctOverlay,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
  PctOverlayPanel,
  PctSize,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

import { PctCalendar, PctDayPredicate } from './calendar';
import { isPctDay, PctDay } from './day';
import { pctDayFormat } from './locale';

/**
 * A day input written as an attribute is a string; one bound from a model may be anything.
 * Absent is `undefined` and not `null`, because `min` / `max` belong to the `FormUiControl`
 * contract and that contract spells an absent bound `undefined` — the same reader
 * `[pctNumber]` and `<pct-slider>` use for their numeric ones.
 */
function optionalDay(value: unknown): PctDay | undefined {
  return isPctDay(value) ? value : undefined;
}

/** Which edge of the field the panel lines its own up with. */
export type PctDatePanelAlign = 'start' | 'end';

/**
 * Date field — a text control the library formats and parses per locale, with a calendar in a
 * panel beside it.
 *
 * **Why not `<input type="date">`,** despite
 * [`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform) — and the answer
 * is three measurements rather than a preference
 * ([0043](../../../../docs/decisions/0043-a-day-is-not-an-instant.md)):
 *
 * - **the order it shows the date in comes from a different place in each engine.** chromium
 *   149 reads `lang` on the element, webkit 26.5 reads the browser's locale and ignores
 *   `lang`, firefox 151 reads neither — so an application in Polish shows `12/01/2026` to two
 *   users out of three and has no way to say otherwise;
 * - **a half-typed date reads `value === ''`** in all three, and `validity.badInput` — the one
 *   flag that tells junk from empty — is `false` in webkit. That is the very complaint
 *   [`req-api-number`](../../../../docs/requirements/api.md#req-api-number) already refuses
 *   `<input type="number">` over;
 * - **one control is four tab stops** in chromium and firefox (three segments and the picker)
 *   and one in webkit, so the same form is walked differently by engine.
 *
 * The value is a [`PctDay`](./day.ts) — `YYYY-MM-DD`, a calendar day and not an instant.
 *
 * @example
 * <pct-field label="Start date">
 *   <pct-date [formField]="f.startsOn" />
 * </pct-field>
 *
 * @example
 * // Standalone, with the bounds and a locale of its own.
 * <pct-date [(value)]="day" min="2026-01-01" max="2026-12-31" locale="pl-PL" label="Day" />
 */
@Component({
  selector: 'pct-date',
  imports: [OverlayModule, PctCalendar, PctIcon, PctOverlayPanel],
  templateUrl: './date.html',
  styleUrl: './date.scss',
  host: {
    class: 'pct-date',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    // What the control knows and the form cannot: there is text in the field and it is not a
    // date. See `malformed` below.
    '[attr.data-pct-malformed]': 'malformed() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctDate
  implements FormValueControl<PctDay | null>, PctFieldControl
{
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);

  /** The chosen day, or `null` when the field is empty. */
  readonly value = model<PctDay | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  /**
   * The earliest and latest day. They belong to the `FormUiControl` contract, so with
   * `[formField]` the directive fills them from the schema's `min()` / `max()` validators.
   *
   * **They clamp the calendar's walk and they do not rewrite what was typed**, which is the
   * one place this control parts company with `[pctNumber]`: a bound clamps a MOVEMENT, and a
   * date somebody wrote out in full is not one. A value outside them is the form's to report,
   * where the user can see why.
   */
  readonly min = input(undefined, { transform: optionalDay });
  readonly max = input(undefined, { transform: optionalDay });

  /** Days inside the bounds that still cannot be picked — weekends, holidays, taken slots. */
  readonly dateDisabled = input<PctDayPredicate | null>(null);

  /** Emitted on blur — lets the form mark the field as touched. */
  readonly touch = output<void>();

  // --- component API ---

  readonly label = input<string>('');
  readonly hint = input<string>('');

  /**
   * The accessible name of a field with no visible `label` — an INPUT rather than an
   * `aria-label` on the tag, because the textbox sits inside this template and an ARIA name
   * on the roleless host is ignored.
   */
  readonly ariaLabel = input<string>('');

  /** As `ariaLabel`, for a name that already stands somewhere on the page. */
  readonly ariaLabelledby = input<string>('');

  /** Overrides the application's `LOCALE_ID` for this field, as on `[pctNumber]`. */
  readonly locale = input<string>('');

  /**
   * Which day the week starts on, `1` (Monday) … `7` (Sunday). Absent, the locale decides.
   */
  readonly firstDayOfWeek = input(0);

  /** Whether the format hint stands in the field while it is empty (`dd.mm.yyyy`). */
  readonly showFormat = input(true, { transform: booleanAttribute });

  readonly size = input<PctSize>(this.config.defaultSize);

  /** Which edge of the field the panel lines up with. */
  readonly panelAlign = input<PctDatePanelAlign>('start');

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');
  private readonly trigger =
    viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly calendar = viewChild(PctCalendar);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  // --- a11y: stable ids for the ARIA relations (req-a11y-built-in) ---

  private readonly uid = nextPctId('pct-date');
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- working with the chrome (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  readonly labelStrategy: PctLabelStrategy = 'for';
  /**
   * A click anywhere on the field places the caret — the control is typed into, and the
   * calendar is behind a button of its own. That is the one thing this control does not share
   * with the select, whose whole surface opens a panel.
   */
  readonly fieldCursor: PctFieldCursor = 'text';

  /** What the chrome hands over inside a field; `null` standing alone. */
  private readonly fieldDescribedBy = signal<string | null>(null);

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  protected readonly showInvalid = this.messages.showInvalid;
  protected readonly showError = this.messages.showError;

  // --- the language the field is written in ---

  protected readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  private readonly format = computed(() => pctDayFormat(this.activeLocale()));

  /** `dd.mm.yyyy` — this language's order and separators, the reader's own letters. */
  protected readonly formatHint = computed(() => {
    if (!this.showFormat()) return null;
    // Read one by one through `texts()` rather than through a local of the whole object: the
    // texts gate finds a read by that shape, and a key nobody can see read is a key it calls
    // dead. The indirection would have cost this control three translations with nothing
    // reporting it.
    return this.format().hint({
      day: this.texts().dateDayLetter,
      month: this.texts().dateMonthLetter,
      year: this.texts().dateYearLetter,
    });
  });

  /** The day as this language writes it, or `''` when there is none. */
  private readonly text = computed(() => {
    const day = this.value();
    // The interop writes values a `PctDay | null` model cannot hold — a `null` before the
    // first real one, and whatever a legacy `ControlValueAccessor` had ([`lesson-117`](../../../../docs/lessons.md#lesson-117)).
    // The read is defensive from the first version rather than after the first exception.
    return day !== null && isPctDay(day) ? this.format().format(day) : '';
  });

  // --- the state the form cannot see ---

  /**
   * There is text in the field and it is not a date.
   *
   * The form sees `null` and calls it empty, which for a required field means the user is
   * told "this is required" while looking at three numbers they typed. The control knows
   * better and says so with `aria-invalid` and a state attribute — **and with nothing else,
   * because there is nowhere to say it**: the message line belongs to `errors`, and `errors`
   * is an input the form owns.
   */
  private readonly rejected = signal<string | null>(null);
  protected readonly malformed = computed(
    () => this.rejected() !== null && !this.disabled(),
  );

  /**
   * While the user is typing the field's content is not rewritten — otherwise the caret would
   * jump to the end on every character. The write to the DOM happens on commit alone, which is
   * `[pctNumber]`'s reading of the same problem.
   */
  private readonly typing = signal(false);

  /**
   * `FormField` provides `NgControl` as well (interop for legacy `ControlValueAccessor`s), so
   * its presence alone does not yet mean classic forms (`lesson-26`).
   */
  private readonly classicForms = inject(NgControl, {
    optional: true,
    self: true,
  });
  private readonly signalForms = inject(FormField, {
    optional: true,
    self: true,
  });

  // --- the panel ---

  /** Inside the chrome the panel lines up with the field's border, not with the input. */
  protected readonly anchor = computed(() => this.fieldApi?.surface() ?? null);

  private readonly panelOverlay = pctOverlay({
    from: () => this.control().nativeElement,
    anchor: () => this.anchor(),
  });

  protected readonly open = this.panelOverlay.open;
  protected readonly inherited = this.panelOverlay.inherited;
  protected readonly panelId = `${this.uid}-panel`;

  protected readonly panelPositions = computed<ConnectedPosition[]>(() => {
    const x = this.panelAlign();
    return [
      { originX: x, originY: 'bottom', overlayX: x, overlayY: 'top' },
      { originX: x, originY: 'top', overlayX: x, overlayY: 'bottom' },
    ];
  });

  /** How many times the panel has been asked to hand focus to the grid. */
  private readonly focusWanted = signal(0);

  /**
   * The description, from whichever of the two owners is drawing it. Standing alone the two
   * ids follow the ONE line the template draws — the error takes it and the hint gives way
   * (`req-api-message`) — because an id in `aria-describedby` that names no element is a
   * reference a screen reader follows nowhere, and nothing reports it. Written the first way
   * (both ids, gated on `hint() !== ''`) it pointed at a hint the error had just replaced.
   */
  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
        ]),
  );

  constructor() {
    pctAttachToField(this.fieldApi, this);

    // What the field shows: the value written in this language, or — while there is no value
    // — the text the user left behind that is not a date. The second half is what makes this
    // control the opposite of `<input type="date">`, which loses it.
    //
    // The rejection is cleared HERE and not on commit, because a value arriving from outside
    // is the one thing a commit cannot see: without this, junk typed and then overwritten by
    // the model left the field red over a date it had just been given. The write is
    // `untracked`, and it cannot loop — it moves nothing this effect reads.
    effect(() => {
      const text = this.text();
      if (this.typing()) return;
      const el = this.control().nativeElement;
      if (text !== '') {
        untracked(() => this.rejected.set(null));
        if (el.value !== text) el.value = text;
        return;
      }
      const junk = untracked(() => this.rejected()) ?? '';
      if (el.value !== junk) el.value = junk;
    });

    // The grid the panel opens on does not exist until the overlay has drawn it, so the focus
    // follows the render rather than the signal that asked for it.
    afterRenderEffect(() => {
      if (this.focusWanted() === 0) return;
      untracked(() => this.calendar()?.focusCursor());
    });

    if (isDevMode()) this.warnOnUnsupportedUsage();
  }

  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  /** Called by signal forms (`focusBoundControl()`, for instance), and by the chrome. */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  reset(): void {
    this.commit('');
  }

  protected onInput(): void {
    this.typing.set(true);
    const text = this.control().nativeElement.value;
    // A date being typed is malformed most of the way through — `27.0` is not a mistake, it
    // is a third of the way in — so the report is taken back on the first keystroke and put
    // back, if at all, only when the field is left.
    this.rejected.set(null);
    if (text.trim() === '') {
      this.value.set(null);
      return;
    }
    const parsed = this.format().parse(text);
    if (parsed !== null) this.value.set(parsed);
  }

  protected onBlur(): void {
    this.commit(this.control().nativeElement.value);
    this.touch.emit();
  }

  /**
   * Settles what is in the field. An empty field is `null` and nothing else; a date is the
   * value; anything else keeps **the text the user typed** and reports that it is not a date
   * — the opposite of what `<input type="date">` does, and the whole of why this control is
   * not one.
   */
  private commit(text: string): void {
    this.typing.set(false);
    if (text.trim() === '') {
      this.rejected.set(null);
      this.value.set(null);
      return;
    }
    const parsed = this.format().parse(text);
    if (parsed === null) {
      // The value is empty and the text is not: the effect above reads the rejection and
      // leaves what the user typed exactly where they left it.
      this.rejected.set(text);
      this.value.set(null);
      return;
    }
    this.rejected.set(null);
    this.value.set(parsed);
  }

  protected toggle(): void {
    if (this.disabled() || this.readonly()) return;
    if (this.open()) this.close(true);
    else this.show();
  }

  private show(): void {
    this.panelOverlay.show();
    this.focusWanted.update((n) => n + 1);
  }

  /** Closes the panel; `restore` decides whether focus comes back to the field. */
  protected close(restore: boolean): void {
    if (!this.open()) return;
    this.panelOverlay.hide();
    if (restore) this.focus();
  }

  protected onPicked(): void {
    this.close(true);
  }

  /**
   * The panel's own key map. Escape closes it, and Tab leaves it — with focus spliced back
   * onto the control it belongs to, because an overlay is a child of `body` and its content
   * therefore stands at the END of the document's tab order however near the field it is
   * drawn ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
   *
   * The tabbable elements are found by our own selector rather than by the CDK's
   * `InteractivityChecker`, and the reason is that this panel's content is **ours**: two
   * buttons and one roving cell, all of them in this template. The popover buys the checker
   * because what stands in its panel is the consumer's and could be anything.
   */
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      // `stopPropagation` so a dialog holding this field does not take the same Escape as
      // its own — the closing stack is the dependency's, and this panel is not on it
      // (0024).
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    const stops = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [tabindex="0"]',
      ),
    );
    const target = event.target as HTMLElement;
    const leaving = event.shiftKey
      ? target === panel || target === stops[0]
      : stops.length === 0 || target === stops[stops.length - 1];
    if (!leaving) return;

    event.preventDefault();
    this.close(true);
  }

  /**
   * The one way of using this that looks correct and quietly breaks the formatting: classic
   * forms, whose `DefaultValueAccessor` takes over writing to the DOM and writes raw strings
   * (`lesson-20`, and `[pctNumber]` carries the same warning).
   */
  private warnOnUnsupportedUsage(): void {
    if (this.classicForms && !this.signalForms) {
      console.warn(
        '[pct-date] Classic forms ([formControl], [(ngModel)]) take over writing ' +
          'the value and break locale formatting. Use signal forms ([formField]) ' +
          'or [(value)] instead.',
      );
    }
  }
}
