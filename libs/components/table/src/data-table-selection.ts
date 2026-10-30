import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  type TemplateRef,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_TEXTS,
  pctFieldMessages,
  pctFieldWarnings,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctDataTable } from './data-table';
import type { PctRowId } from './model/columns';

/**
 * How many rows a selection holds: one, picked with a radio, or any, with a checkbox each and
 * one in the header over all the rows the filter left.
 *
 * @since next
 */
export type PctSelectionMode = 'single' | 'multiple';

/** The line a selection writes under the table: its error, its warning or its hint. */
interface Line {
  readonly kind: 'error' | 'warning' | 'hint';
  readonly id: string;
  readonly text: string;
}

/**
 * A selection with `ids` added, after the ids it held in their order, or with `ids` taken out.
 */
function adding(
  value: readonly PctRowId[],
  ids: ReadonlySet<PctRowId>,
  on: boolean,
): readonly PctRowId[] {
  if (!on) return value.filter((id) => !ids.has(id));
  const had = new Set(value);
  return [...value, ...[...ids].filter((id) => !had.has(id))];
}

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves in,
 * and the directive hands over the line, which it reads off its own `[formField]`. Kept by
 * the directive in a map of this module's own, not in `providers`, which would keep the
 * directive in every bundle that imports the table (`lesson-173`).
 */
interface Link {
  readonly parts: WritableSignal<PctTableSelectionParts | null>;
  readonly line: () => Line | null;
  readonly picked: () => ReadonlySet<PctRowId>;
}

const LINKS = /* @__PURE__ */ new WeakMap<PctTableSelection, Link>();

/**
 * The rows picked, as a form control: `[(value)]` binds the ids of the rows picked, and
 * `[formField]` makes the selection a field like any other — its errors, its warnings and its
 * hint stand under the table, and `aria-describedby` on the `<table>` names the one shown.
 *
 * A leading column holds a native checkbox per row and one in the header, which is checked,
 * mixed or clear over the rows the filter left; Shift with a press picks or drops the rows
 * between the last one pressed and this one, as the lines stand. A row is not picked by a
 * press on the row, which would take the press from the controls in its cells.
 *
 * **The selection is the application's.** An id stays in `value` when a filter hides its
 * row and when the rows change: the list is what the application said, and a press takes out
 * only the ids it drops — in `single` mode, the one it replaces ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 * `selectAll` adds the rows the filter left to it, and `clear` empties it.
 *
 * A list that must not be empty takes `minLength(1)`: the form's `required()` reads an empty
 * list as filled, and still marks the column's header with the required sign.
 *
 * @example
 * <pct-data-table pctTableSelection [formField]="form.devices" [rows]="devices()" [columns]="columns" [rowId]="byId" />
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableSelection]',
  exportAs: 'pctTableSelection',
  host: {
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-warning]': 'warningLit() ? "" : null',
  },
})
export class PctTableSelection implements FormValueControl<
  readonly PctRowId[]
> {
  private readonly table = inject(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The ids of the rows picked — a required field of the `FormValueControl` contract.
   *
   * @since next
   */
  readonly value = model<readonly PctRowId[]>([]);

  /**
   * One row or any: a radio per row, or a checkbox per row and one over them all.
   *
   * @since next
   */
  readonly mode = input<PctSelectionMode>('multiple');

  /**
   * No row is picked or dropped: every control of the column is disabled. With `[formField]`
   * the directive writes it.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Holds the selection: the controls stay focusable and a press changes nothing.
   * `aria-readonly` goes on the checkboxes; the `radio` role has none.
   *
   * @since next
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * The form's verdict; shown only once `touched`, so a form opens with no error under it.
   *
   * @since next
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /**
   * Whether the user has left the column's controls once; with `invalid` it gates the error.
   *
   * @since next
   */
  readonly touched = input(false, { transform: booleanAttribute });

  /**
   * Marks the column's header with the required sign; with `[formField]` it follows the
   * schema's `required()`.
   *
   * @since next
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's errors; the first one's `message` stands under the table once touched.
   *
   * @since next
   */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /**
   * A verdict without a veto (0087): shown after the error and before the hint once touched.
   * Left unbound, the selection reads what `pctWarn()` wrote for its own `[formField]`.
   *
   * @since next
   */
  readonly warnings = input<
    readonly ValidationError.WithOptionalFieldTree[] | undefined
  >(undefined);

  /**
   * The `name` attribute of the native controls: the radios of `single` mode share it, and are
   * one group by it. Generated by default.
   *
   * @since next
   */
  readonly name = input<string>('');

  /**
   * A line of help under the table; the error or the warning takes its place.
   *
   * @since next
   */
  readonly hint = input<string>('');

  /**
   * Emitted when the focus leaves a control of the column — lets the form mark the field as
   * touched.
   *
   * @since next
   */
  readonly touch = output<void>();

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
    warnings: pctFieldWarnings(this.warnings),
  });

  /**
   * Whether the selection reads as invalid right now: invalid and touched.
   *
   * @since next
   */
  readonly showInvalid = this.messages.showInvalid;

  /** The warning is lit: the host says so for a stylesheet to paint by. */
  protected readonly warningLit = this.messages.showWarning;

  private readonly uid = nextPctId('pct-table-selection');

  /** The line under the table: the error, else the warning, else the hint. */
  private readonly line = computed((): Line | null => {
    const messages = this.messages;
    if (messages.showError())
      return {
        kind: 'error',
        id: `${this.uid}-error`,
        text: messages.errorText(),
      };
    if (messages.showWarning())
      return {
        kind: 'warning',
        id: `${this.uid}-warning`,
        text: messages.warningText(),
      };
    const hint = this.hint();
    return hint ? { kind: 'hint', id: `${this.uid}-hint`, text: hint } : null;
  });

  /** The parts, once the table has made them. */
  private readonly parts = signal<PctTableSelectionParts | null>(null);

  /**
   * The ids picked, to look up: one in `single` mode, whatever the list says, as a radio group
   * checks one. Here and not in the parts, so the table's rows read it from their first render.
   */
  private readonly picked = computed(() => {
    const value = this.value();
    return new Set(this.mode() === 'single' ? value.slice(0, 1) : value);
  });

  constructor() {
    LINKS.set(this, {
      parts: this.parts,
      line: this.line,
      picked: this.picked,
    });
    const parts = this.parts;
    this.table.contribute({
      selection: {
        parts: PctTableSelectionParts,
        // Read once the table has made the parts, in the render that draws them: the outlet
        // stands before every place they are drawn in.
        head: computed(() => (parts() as PctTableSelectionParts).head()),
        cell: computed(() => (parts() as PctTableSelectionParts).cell()),
        below: computed(() => (parts() as PctTableSelectionParts).below()),
        picked: this.picked,
        describedBy: computed(() => this.line()?.id ?? null),
      },
    });
    // A press on the table, which the parts tell apart: one beside a row's control is theirs.
    // Listened to once the page is live, not from the template: a listener there is one the
    // server marks for replay, and a press replayed before hydration cannot be taken back.
    const host = this.host.nativeElement;
    const press = (event: MouseEvent) =>
      (this.parts() as PctTableSelectionParts).press(event);
    afterNextRender(() => host.addEventListener('click', press));
    inject(DestroyRef).onDestroy(() =>
      host.removeEventListener('click', press),
    );
  }

  /**
   * Picks every row the filter left, keeping the ids already picked; in `single` mode, nothing.
   *
   * @since next
   */
  selectAll(): void {
    if (this.mode() === 'single') return;
    const picked = new Set(this.value());
    this.value.set([
      ...this.value(),
      ...this.table.matchedIds().filter((id) => !picked.has(id)),
    ]);
  }

  /**
   * Called by signal forms — focuses the checkbox of the first row picked, or the first row's,
   * or the header's when no row is drawn.
   *
   * @since next
   */
  focus(options?: FocusOptions): void {
    const own = this.host.nativeElement.querySelectorAll<HTMLInputElement>(
      ':scope > pct-table-frame > table > tbody > tr > td > label > [data-pct-part="select"]',
    );
    // A disabled selection disables every control, the header's too: none takes the focus.
    const controls = Array.from(own);
    const target =
      controls.find((input) => input.checked) ??
      controls[0] ??
      this.host.nativeElement.querySelector<HTMLInputElement>(
        ':scope > pct-table-frame > table > thead [data-pct-part="select-all"]',
      );
    target?.focus(options);
  }

  /**
   * Drops every row picked, the ones the filter hides among them.
   *
   * @since next
   */
  clear(): void {
    this.value.set([]);
  }
}

/**
 * The selection's parts: templates the table draws in the places it keeps for them, and the
 * handlers of the controls in them. Declared here, rendered there: the bindings are read in
 * this component, the elements stand in the table. `pctTableSelection` makes it, so it has
 * no selector: there is no tag to write.
 *
 * @since next
 */
@Component({
  imports: [PctIcon],
  // Its element is the table's child and draws nothing: the templates stand where they are put.
  host: { hidden: '' },
  templateUrl: './data-table-selection.html',
  styleUrl: './data-table-selection.scss',
})
export class PctTableSelectionParts {
  protected readonly selection = inject(PctTableSelection);
  protected readonly table = inject(PctDataTable);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The table's element: the parts' own stands in it, out of the paint. */
  private host(): Element | null {
    return this.element.nativeElement.closest('pct-data-table');
  }

  private readonly link = LINKS.get(this.selection) as Link;

  /**
   * What the header of the column of picks holds.
   *
   * @since next
   */
  readonly head = viewChild.required<TemplateRef<unknown>>('head');

  /**
   * What a row's cell of the column holds, given the row.
   *
   * @since next
   */
  readonly cell = viewChild.required<TemplateRef<unknown>>('cell');

  /**
   * What stands under the table: the selection's line.
   *
   * @since next
   */
  readonly below = viewChild.required<TemplateRef<unknown>>('below');

  protected readonly line = computed(() => this.link.line());

  constructor() {
    this.link.parts.set(this);
  }

  /** The ids picked, to look up. */
  private readonly picked = this.link.picked;

  private readonly uid = nextPctId('pct-table-selection');

  /** The id of the word a row's control is named by, before the row's first text. */
  protected readonly wordId = `${this.uid}-word`;

  /**
   * What a row's control is described by: the selection's error or warning, which a reader
   * would not hear from the table's description once inside a cell. A hint is the table's.
   */
  protected readonly describedBy = computed(() => {
    const line = this.line();
    return line && line.kind !== 'hint' ? line.id : null;
  });

  /** The header's checkbox, over the rows the filter left: all of them picked, or some. */
  protected readonly pickedAll = computed(() => {
    const picked = this.picked();
    const ids = this.table.matchedIds();
    const count = ids.filter((id) => picked.has(id)).length;
    return {
      checked: count > 0 && count === ids.length,
      mixed: count > 0 && count < ids.length,
    };
  });

  /** The name the radios of a single selection share, which makes them one group. */
  protected readonly radioName = computed(
    () => this.selection.name() || `${this.uid}-pick`,
  );

  /** The row pressed last: the other end of the range a press with Shift picks. */
  private anchor: PctRowId | null = null;

  /**
   * A row's checkbox or radio was pressed: the row is picked or dropped as the control now
   * stands, and with Shift every row drawn between it and the row pressed before.
   */
  protected pick(id: PctRowId, event: MouseEvent): void {
    // A held selection takes the press back: the control's own toggle is the platform's.
    if (this.selection.readonly()) {
      event.preventDefault();
      return;
    }
    this.pickRow(
      id,
      (event.target as HTMLInputElement).checked,
      event.shiftKey,
    );
  }

  /**
   * A press on the table, heard by the directive's host: one on the target around a row's
   * control, beside the control itself, is the selection's. The engines part here: Chromium
   * hands a press with Shift on to the control, Firefox and WebKit hand it to nothing. So the
   * label hands on no press, and the press is the selection's in all three.
   *
   * @since next
   */
  press(event: MouseEvent): void {
    const label = (event.target as Element).closest(
      'td > .pct-data-table__target',
    );
    // A table nested in a cell picks its own rows.
    if (label === null || label.closest('pct-data-table') !== this.host())
      return;
    const control = label.querySelector('input') as HTMLInputElement;
    if (event.target === control) return;
    event.preventDefault();
    if (control.disabled || this.selection.readonly()) return;
    // A radio checked stays checked; any other press turns the control.
    if (control.type === 'radio' && control.checked) return;
    const line = Number(
      (label.closest('tr') as HTMLTableRowElement).dataset['pctIndex'],
    );
    control.checked = !control.checked;
    this.pickRow(this.table.lines()[line].key, control.checked, event.shiftKey);
  }

  /** Picks the row, or drops it, and with `shift` every row drawn between it and the anchor. */
  private pickRow(id: PctRowId, on: boolean, shift: boolean): void {
    const selection = this.selection;
    const anchor = this.anchor;
    this.anchor = id;
    if (selection.mode() === 'single') {
      selection.value.set([id]);
      return;
    }
    const drawn = this.table
      .lines()
      .flatMap((line) => (line.kind === 'row' ? [line.key] : []));
    // No row pressed before is no row drawn: `indexOf` finds none.
    const from = shift ? drawn.indexOf(anchor as PctRowId) : -1;
    const to = drawn.indexOf(id);
    const range = new Set(
      from < 0 ? [id] : drawn.slice(Math.min(from, to), Math.max(from, to) + 1),
    );
    selection.value.update((value) => adding(value, range, on));
  }

  /**
   * A control of the column lost the focus: the form hears the column was left, unless the
   * focus went on to another of its controls — an arrow between radios, a Tab to the next row.
   */
  protected leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (
      next instanceof Element &&
      next.closest('pct-data-table') === this.host() &&
      next.matches('[data-pct-part="select"], [data-pct-part="select-all"]')
    )
      return;
    this.selection.touch.emit();
  }

  /** The header's checkbox was pressed: every row the filter left is picked, or dropped. */
  protected pickAll(event: MouseEvent): void {
    const selection = this.selection;
    if (selection.readonly()) {
      event.preventDefault();
      return;
    }
    const ids = new Set(this.table.matchedIds());
    const all = this.pickedAll().checked;
    selection.value.update((value) => adding(value, ids, !all));
  }
}
