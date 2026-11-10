import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctAttachToField,
  pctDescribedBy,
  pctFieldMessages,
  pctFieldWarnings,
  pctListNavigation,
  pctSameValue,
  pctScrollBehavior,
  PctCompareWith,
  PctFieldAppearance,
  PctFieldControl,
  PctLabelStrategy,
  PctListNavigation,
  PctSize,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * One row of a wheel: the value it stands for, the text it is drawn and typed by, and whether
 * the line may rest on it. The select's item shape, flat — a heading does not snap under a
 * line, so a wheel has no groups — and declared here rather than imported, because a wheel on
 * a page does not bring the select with it.
 *
 * @since next
 */
export interface PctWheelOption<T = string> {
  /** What the wheel's value becomes when the line rests on this row. */
  readonly value: T;
  /** The row's text — what is drawn, what a reader hears and what typeahead matches. */
  readonly label: string;
  /** A row the line passes over and never rests on. */
  readonly disabled?: boolean;
}

/** One drawn row of the runway: an option, and which turn of the ring this copy of it is. */
interface PctWheelRow<T> {
  /** The row's place on the runway, from its start — what the scroll is measured in. */
  readonly at: number;
  /** The option's place in the list — the same for every copy of it. */
  readonly index: number;
  readonly option: PctWheelOption<T>;
  /** A copy outside the canonical turn: drawn and scrolled over, hidden from a reader. */
  readonly copy: boolean;
}

/** How many rows a wheel shows when nobody says. */
const VISIBLE_ROWS = 5;

/**
 * The count of rows a wheel shows, as an odd whole number: the line is the middle row, so an
 * even count has no row to put it on and takes the next odd one; a count that is no count
 * falls back to the default.
 */
function visibleRows(value: unknown): number {
  const count = Math.floor(numberAttribute(value, VISIBLE_ROWS));
  if (!(count >= 1)) return VISIBLE_ROWS;
  return count % 2 === 0 ? count + 1 : count;
}

/**
 * One value chosen by turning a list under a line: the rows scroll, the row that comes to
 * rest under the line is the value. **A listbox on the platform's own scroll** — the APG's
 * [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) pattern, `role="listbox"`
 * pointing at its row with `aria-activedescendant`, one tab stop, the rows snapping to the
 * centre — with the select's item shape, `compareWith` and `T | null`
 * ([0089](../../../../docs/decisions/0089-one-value-more-than-one-control-and-the-consumer-chooses.md)).
 *
 * The wheel is the form control (`FormValueControl`), with a label and a hint of its own
 * outside a `pct-field` (req-api-no-wrapper).
 *
 * **Only a gesture writes.** A key, a click, a wheel, a finger: the row the scroll settles on
 * becomes the value. The wheel's own centring — when it opens, when the form writes — writes
 * nothing, and a wheel with no value holds its first row under the line — or the one `startAt`
 * names — active and not chosen, until somebody turns it.
 *
 * `wrap` makes the list a ring: the rows stand three times in the tree and the scroll is put
 * back on the middle turn each time it settles
 * ([0091](../../../../docs/decisions/0091-the-rings-runway-is-the-cycle-three-times-in-the-tree.md)).
 * It is for a cycle — hours, weekdays — and costs three rows per option.
 *
 * @example
 * <pct-wheel label="Weekday" [options]="weekdays" [formField]="form.day" wrap />
 *
 * @example
 * // `T` comes from the options; entities are compared by `compareWith`.
 * <pct-wheel
 *   ariaLabel="Speed"
 *   [options]="speeds"
 *   [compareWith]="sameSpeed"
 *   [(value)]="speed"
 * />
 *
 * @since next
 */
@Component({
  selector: 'pct-wheel',
  imports: [PctIcon],
  templateUrl: './wheel.html',
  styleUrl: './wheel.scss',
  host: {
    class: 'pct-wheel',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-warning]': 'warningLit() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '[attr.data-pct-readonly]': 'readonly() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
    '[style.--_pct-wheel-rows]': 'rows()',
  },
})
export class PctWheel<T = string>
  implements FormValueControl<T | null>, PctFieldControl
{
  /**
   * The chosen value — a required field of the `FormValueControl` contract. `null` means no row
   * is chosen: the line holds the first row, or the one `startAt` names, and nothing is written
   * until a gesture.
   *
   * @since next
   */
  readonly value = model<T | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Takes the wheel out of the tab order and stops it turning. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Holds the value while the wheel stays focusable: it does not turn, and no key or click writes.
   *
   * @since next
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * The form's verdict; shown only once `touched`, so an empty form does not open red.
   *
   * @since next
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /**
   * Whether the user has left the wheel once; with `invalid` it gates the error face.
   *
   * @since next
   */
  readonly touched = input(false, { transform: booleanAttribute });

  /**
   * Marks the label with the required sign and the listbox with `aria-required`; with `[formField]` it follows the schema's `required()`.
   *
   * @since next
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's validation errors; the first one's `message` takes the hint's place once the wheel is touched.
   *
   * @since next
   */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /**
   * A verdict without a veto (0087): shown after the error and before the hint once the wheel is touched, in the warning tone, with `aria-invalid` untouched. Left unbound, the control reads what `pctWarn()` wrote for its own `[formField]`; bound — `[]` included — the list given stands.
   *
   * @since next
   */
  readonly warnings = input<
    readonly ValidationError.WithOptionalFieldTree[] | undefined
  >(undefined);

  /**
   * The warnings drawn under the control — the input, or the form's (0087). The chrome reads this one list.
   *
   * @since next
   */
  readonly fieldWarnings = pctFieldWarnings(this.warnings);

  /**
   * The name the form calls the field by — written on the listbox, where the select writes it on its trigger. A wheel is no native control, so nothing is submitted under it.
   *
   * @since next
   */
  readonly name = input<string>('');

  /**
   * Emitted when the focus leaves the wheel — lets the form mark the field as touched.
   *
   * @since next
   */
  readonly touch = output<void>();

  // --- component API ---

  /**
   * The rows, in the order they turn. A row marked `disabled` is drawn and passed over: no key lands on it, and a scroll that settles on it goes on to the nearest row that can be chosen.
   *
   * @since next
   */
  readonly options = input<readonly PctWheelOption<T>[]>([]);

  /**
   * Value equality — as in `pct-select`; entities are compared by key.
   *
   * @since next
   */
  readonly compareWith = input<PctCompareWith<T>>(pctSameValue);

  /**
   * Makes the list a ring: past the last row comes the first, by key and by scroll. For a cycle — hours, weekdays — and it draws every row three times (0091).
   *
   * @since next
   */
  readonly wrap = input(false, { transform: booleanAttribute });

  /**
   * How many rows show at once, the line in the middle: an odd count, an even one taking the next odd. `PageDown` and `PageUp` move by it.
   *
   * @since next
   */
  readonly rows = input(VISIBLE_ROWS, { transform: visibleRows });

  /**
   * The value of the row the line holds while the wheel's value names no row — the hour it is now, in a wheel of hours. Active and not chosen: it is where the wheel opens and a key starts from, and nothing is written until a gesture. A row that cannot be chosen hands the line to the nearest one that can; a value no row stands for, to the first.
   *
   * @since next
   */
  readonly startAt = input<T | null>(null);

  private readonly config = inject(PCT_CONFIG);

  /**
   * The height of a row and the size of its text; from `providePctConfig` by default (req-api-config).
   *
   * @since next
   */
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name.
   *
   * @since next
   */
  readonly label = input<string>('');

  /**
   * A line of help under the control, outside a `pct-field`; the first error message takes its place while the wheel is invalid and touched.
   *
   * @since next
   */
  readonly hint = input<string>('');

  /**
   * The name of a wheel with no visible label — one of several side by side, each a field of one value.
   *
   * @since next
   */
  readonly ariaLabel = input<string>('');

  /**
   * The id of an element on the page that names the wheel; the wheel's own label and a `pct-field`'s come before it.
   *
   * @since next
   */
  readonly ariaLabelledby = input<string>('');

  // --- a11y ---

  private readonly uid = nextPctId('pct-wheel');
  protected readonly labelId = `${this.uid}-label`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;
  protected readonly warningId = `${this.uid}-warning`;

  // --- working with the chrome (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * The id of the listbox — the element that holds the focus and carries the name.
   *
   * @since next
   */
  readonly controlId = `${this.uid}-list`;
  /**
   * `labelledby`: the listbox is no native control a `<label for>` could name, so the chrome names it.
   *
   * @since next
   */
  readonly labelStrategy: PctLabelStrategy = 'labelledby';
  /**
   * `bare`: the wheel draws its own line, and a field's border around it would be a second frame.
   *
   * @since next
   */
  readonly fieldAppearance: PctFieldAppearance = 'bare';

  private readonly fieldDescribedBy = signal<string | null>(null);
  private readonly fieldLabelledBy = signal<string | null>(null);

  /**
   * The chrome hands over the ids of its hint and error, and the listbox describes itself by them.
   *
   * @since next
   */
  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  /**
   * The chrome hands over the id of its label, and the listbox is named by it instead of by its own.
   *
   * @since next
   */
  setLabelledBy(id: string | null): void {
    this.fieldLabelledBy.set(id);
  }

  /**
   * The name the wheel has without the page: the chrome's label, or its own. Where it has
   * neither, the template hands the listbox the element the page points at.
   */
  protected readonly ownLabelledBy = computed(() =>
    this.inField ? this.fieldLabelledBy() : this.label() ? this.labelId : null,
  );

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
    warnings: this.fieldWarnings,
  });
  protected readonly errorText = this.messages.errorText;
  /**
   * Whether the wheel reads as invalid right now, by the chrome's own rule: invalid and touched.
   *
   * @since next
   */
  readonly showInvalid = this.messages.showInvalid;
  protected readonly warningText = this.messages.warningText;
  /** The warning is lit, whichever owner draws the line — the host says so in both modes (0087). */
  protected readonly warningLit = this.messages.showWarning;

  protected readonly showError = computed(
    () => !this.inField && this.messages.showError(),
  );
  protected readonly showWarning = computed(
    () => !this.inField && this.warningLit(),
  );

  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.errorId, this.showError()],
          [this.warningId, this.showWarning()],
          [
            this.hintId,
            !this.showError() && !this.showWarning() && this.hint() !== '',
          ],
        ]),
  );

  // --- the rows ---

  /**
   * What is drawn: the options once, or — a ring — three times, the middle turn being the one
   * a reader sees and `aria-activedescendant` names. The outer two are the runway the scroll
   * needs on both sides of it (0091).
   */
  protected readonly runway = computed<readonly PctWheelRow<T>[]>(() => {
    const options = this.options();
    const turns = this.turns();
    const canonical = this.canonical();
    const rows: PctWheelRow<T>[] = [];
    for (let turn = 0; turn < turns; turn++) {
      options.forEach((option, index) =>
        rows.push({
          at: turn * options.length + index,
          index,
          option,
          copy: turn !== canonical,
        }),
      );
    }
    return rows;
  });

  /** How many times the options stand in the tree. */
  private readonly turns = computed(() => (this.wrap() ? 3 : 1));
  /** The turn a reader sees — the middle one of a ring, the only one of a list. */
  private readonly canonical = computed(() => (this.wrap() ? 1 : 0));

  /** The row the value names, `-1` when it names none. */
  protected readonly chosen = computed(() => {
    const value = this.value();
    if (value === null || value === undefined) return -1;
    const same = this.compareWith();
    return this.options().findIndex((option) => same(option.value, value));
  });

  /**
   * The row under the line. **Derived, not kept**: it is the chosen row, and with none chosen
   * the row `startAt` names or the first — in both cases one a gesture could choose — so a
   * value the form writes moves the line without anybody telling the walk, and there is no
   * second cursor to fall out of step with the first.
   */
  protected readonly active = computed(() => {
    const chosen = this.chosen();
    if (chosen !== -1) return chosen;
    const options = this.options();
    const start = this.startAt();
    if (start !== null && start !== undefined) {
      const same = this.compareWith();
      const at = options.findIndex((option) => same(option.value, start));
      if (at !== -1) return this.nearest(at);
    }
    return options.findIndex((option) => option.disabled !== true);
  });

  /** The id of the row under the line — what the listbox points at. */
  protected readonly activeId = computed(() => {
    const active = this.active();
    return active === -1 ? null : this.rowId(active);
  });

  protected rowId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  /**
   * The walk a key takes: the core list machinery over the options. It keeps no place of its
   * own between two keys — every key starts it from the line — so a list replaced under it
   * has nothing to carry over.
   */
  private readonly walk: PctListNavigation;

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  /**
   * A gesture is under way — a pointer went down on the rows or a wheel turned over them —
   * and the settle that ends it is the user's. Every scroll the wheel asks for itself takes
   * the flag down, which is the whole of "only a gesture writes" (0089).
   */
  private gesture = false;

  /**
   * The row the wheel has sent its scroll to and has not heard it rest on: set by a travel
   * that takes time, taken down by the settle that arrives there and by a gesture. An engine
   * says a scroll has ended some time after the rows stopped — firefox about 180 ms after —
   * and a key pressed in between sends the wheel on before the travel before is heard to end.
   */
  private bound: number | null = null;

  /** The runway the last centring was made on; another one is placed afresh, not travelled to. */
  private drawn: readonly PctWheelRow<T>[] | null = null;

  constructor() {
    pctAttachToField(this.fieldApi, this);

    const ring = this.wrap;
    this.walk = pctListNavigation<PctWheelOption<T>>({
      items: this.options,
      isDisabled: (option) => option.disabled === true,
      label: (option) => option.label,
      // A getter, because the walk reads it at every movement and the input can change after
      // the walk is made.
      get wrap() {
        return ring();
      },
    });

    // After the render and not before it: the rows a new list brings are measured once they
    // stand, and the row to centre is the one the render has just drawn.
    afterRenderEffect(() => {
      const runway = this.runway();
      this.active();
      untracked(() => {
        const afresh = runway !== this.drawn;
        this.drawn = runway;
        this.centre(afresh);
      });
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const list = this.list().nativeElement;
      // Passive, and so not written in the template: a listener that may call
      // `preventDefault` makes the engine wait for it before it scrolls, and these two only
      // take a note.
      const begin = (): void => {
        this.gesture = true;
        this.bound = null;
      };
      list.addEventListener('pointerdown', begin, { passive: true });
      list.addEventListener('wheel', begin, { passive: true });

      // The size of the list changing is the rows changing height under the scroll — a wheel
      // shown after it was hidden, a size, a density — and the row under the line is put back
      // where the line is.
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.centre(true));
      observer.observe(list);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * The key map of a listbox whose every movement is a choice: a key the wheel takes settles
   * the line, and the row under it becomes the value — at the end of a list that is no ring
   * the row it already was. A letter that moves the line nowhere is not taken, and is left to
   * the page.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.readonly()) return;
    const from = this.active();
    const walk = this.walk;
    walk.setActive(from);
    switch (event.key) {
      case 'ArrowDown':
        walk.move(1);
        break;
      case 'ArrowUp':
        walk.move(-1);
        break;
      case 'PageDown':
        walk.move(this.rows());
        break;
      case 'PageUp':
        walk.move(-this.rows());
        break;
      case 'Home':
        walk.first();
        break;
      case 'End':
        walk.last();
        break;
      // The row under the line taken as it stands — what chooses the first row of a wheel
      // with no value, the one case in which the line holds a row nobody chose.
      case 'Enter':
      case ' ':
        break;
      default:
        if (
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        walk.typeahead(event.key);
        if (walk.activeIndex() === from) return;
    }
    event.preventDefault();
    this.gesture = false;
    this.choose(walk.activeIndex());
  }

  /** A click on a row chooses it — on a copy of it too, the copy standing for the same row. */
  protected pick(row: PctWheelRow<T>): void {
    // The pointer that went down for this click started no scroll.
    this.gesture = false;
    if (this.disabled() || this.readonly() || row.option.disabled === true)
      return;
    this.choose(row.index);
  }

  /**
   * The scroll has come to rest. Two jobs, in this order: a ring is put back on its middle
   * turn — by whole turns, so the row under the line does not change and the snap has nothing
   * to correct — and, if a gesture brought the scroll here, the row under the line becomes the
   * value. The handler runs twice for a settle that crosses a turn, the second time for the
   * scroll it made itself, and finds nothing left to do (0091 §2).
   *
   * A settle heard off the row the wheel sent its scroll to is the one of a travel before —
   * a turn put right here would end the travel under way on the row it left — or of a travel
   * the engine let run on. Either way the wheel is sent to its row again, and nothing is read.
   */
  protected onScrollEnd(): void {
    const list = this.list().nativeElement;
    const height = this.rowHeight();
    // No rows are no height either: the first row is what is measured.
    if (height === 0) return;

    const count = this.options().length;
    const last = this.runway().length - 1;
    const under = Math.min(
      Math.max(Math.round(list.scrollTop / height), 0),
      last,
    );
    if (this.bound !== null && under !== this.bound) {
      this.centre(false);
      return;
    }
    this.bound = null;

    const turn = Math.floor(under / count);
    const canonical = this.canonical();
    if (turn !== canonical)
      list.scrollTop += (canonical - turn) * count * height;

    const gesture = this.gesture;
    this.gesture = false;
    if (!gesture || this.disabled() || this.readonly()) return;

    const landed = this.nearest(under % count);
    if (landed === -1) return;
    this.choose(landed);
    // The line can be resting on a row that is not the value — one that cannot be chosen, or
    // the scroll came back to the row already chosen — and no render follows a value that did
    // not change.
    this.centre(false);
  }

  /** Writes the value a row stands for; the row already chosen is not written again. */
  private choose(index: number): void {
    const option = this.options()[index];
    if (option === undefined || index === this.chosen()) return;
    this.value.set(option.value);
  }

  /**
   * The row a settle on `index` means: itself, or the nearest one that can be chosen — the one
   * after before the one before, round the ring where there is one. `-1` when no row can be.
   */
  private nearest(index: number): number {
    const options = this.options();
    const count = options.length;
    const ring = this.wrap();
    for (let step = 0; step < count; step++) {
      for (const at of [index + step, index - step]) {
        const place = ring ? (at + count) % count : at;
        const option = options[place];
        if (option !== undefined && option.disabled !== true) return place;
      }
    }
    return -1;
  }

  /** The height of a row as laid out; `0` while the wheel is not on the screen. */
  private rowHeight(): number {
    const row = this.list().nativeElement.firstElementChild;
    return row instanceof HTMLElement ? row.offsetHeight : 0;
  }

  /**
   * Puts the row under the line where the line is. `afresh` places it — at once, on the
   * canonical turn — which is how a wheel opens and how it answers a new list; otherwise the
   * scroll travels, smooth or not as the motion axis says, to the copy of the row NEAREST to
   * where it stands, so that a ring goes on round instead of running back across the list.
   * The settle then puts it back on the middle turn.
   */
  private centre(afresh: boolean): void {
    const list = this.list().nativeElement;
    const height = this.rowHeight();
    const active = this.active();
    if (height === 0 || active === -1) return;

    const count = this.options().length;
    const from = list.scrollTop;
    let row = this.canonical() * count + active;
    if (!afresh) {
      for (let turn = 0; turn < this.turns(); turn++) {
        const copy = turn * count + active;
        if (Math.abs(copy * height - from) < Math.abs(row * height - from))
          row = copy;
      }
    }
    const top = row * height;
    if (Math.abs(top - from) < 1) {
      // Already there. A travel under way goes on to the row it was sent to all the same —
      // no engine takes one back for a scroll that moves nothing — so the row is noted, and
      // the settle of that travel sends the wheel here.
      if (this.bound !== null) this.bound = row;
      return;
    }

    const behavior = afresh ? 'instant' : pctScrollBehavior(list);
    this.gesture = false;
    // A scroll made at once is where it was sent when the call returns; only one that takes
    // time can be overtaken.
    this.bound = behavior === 'smooth' ? row : null;
    list.scrollTo({ top, behavior });
  }

  /**
   * Called by signal forms (`focusBoundControl()`, for instance) — focuses the listbox.
   *
   * @since next
   */
  focus(options?: FocusOptions): void {
    this.list().nativeElement.focus(options);
  }

  /**
   * Called by signal forms when the form is reset. The wheel holds nothing the form does not —
   * the row under the line is the value — so there is nothing to take back
   * ([0092](../../../../docs/decisions/0092-a-controls-reset-takes-back-what-the-form-cannot-see.md)).
   *
   * @since next
   */
  reset(): void {
    // Nothing of the wheel's own to take back: the value is the form's, and it has set it.
  }
}
