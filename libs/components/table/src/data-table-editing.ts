import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterEveryRender,
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import {
  PCT_TEXTS,
  PctAnnouncer,
  pctReportOrphanSlot,
} from '@pacit/components/core';
import { PctNumber, PctText } from '@pacit/components/field';
import { PctDataTable } from './data-table';
import { PctTableGrid, type PctTableDataCell } from './data-table-grid';
import type {
  PctAnyColumn,
  PctColumn,
  PctColumns,
  PctRowId,
} from './model/columns';
import { pctParseDelimited, pctPlainReader, pctPlainWriter } from './model/csv';
import { pctTextOfSheet } from './model/formula';

/**
 * What an editor template is handed: the row, the draft its control edits, and the two ends
 * of the edit.
 *
 * @since 0.3.0
 */
export interface PctEditorContext<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /** The row — `let-row`. */
  readonly $implicit: T;
  /**
   * The draft, of the column's own type, begun at the row's value — `let-value="value"`.
   * Enter, Tab and a press elsewhere commit what it holds.
   */
  readonly value: WritableSignal<M[Id]>;
  /** The column — `let-column="column"`. */
  readonly column: PctColumn<T, M[Id], Id>;
  /** The row's id — `let-id="id"`. */
  readonly id: PctRowId;
  /**
   * Set while the draft may not be committed: Enter, Tab and a press elsewhere then keep the
   * editor open — `let-invalid="invalid"`. A template that checks its value says so here.
   */
  readonly invalid: WritableSignal<boolean>;
  /** Commits the draft, unless it is invalid, and closes the editor. */
  readonly commit: () => void;
  /** Closes the editor and lets the draft go. */
  readonly cancel: () => void;
}

/**
 * A cell of a column edited by the consumer's own control: a select of the values the column
 * takes, a date, a field of signal forms with its rules.
 *
 * The template draws the control and binds it to the draft; the editing commits the draft
 * on Enter or Tab, lets it go on Escape, and asks `invalid` first, so a value the template
 * refuses never leaves the table
 * ([0108](../../../../docs/decisions/0108-a-cell-is-edited-by-a-draft-the-table-never-applies.md)).
 * The template is typed by the two inputs, as a cell template is: `let-value` is a signal of
 * the column's type.
 *
 * @example
 * <ng-template [pctEditor]="columns" pctEditorOf="room" let-value="value">
 *   <pct-select [options]="rooms" [value]="value()" (valueChange)="value.set($event ?? value())" ariaLabel="Room" />
 * </ng-template>
 *
 * @since 0.3.0
 */
@Directive({
  selector: 'ng-template[pctEditor]',
})
export class PctEditorTemplate<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /**
   * The template itself.
   *
   * @since 0.3.0
   */
  readonly template =
    inject<TemplateRef<PctEditorContext<T, M, Id>>>(TemplateRef);

  /**
   * The table's list of columns. It carries the types into the context and is never read.
   *
   * @since 0.3.0
   */
  readonly columns = input.required<PctColumns<T, M>>({ alias: 'pctEditor' });

  /**
   * The id of the column the template edits, or a list of ids that share it.
   *
   * @since 0.3.0
   */
  readonly pctEditorOf = input.required<Id | readonly Id[]>();

  /**
   * What the editing calls when its content query finds this template.
   *
   * @since 0.3.0
   */
  readonly read = pctReportOrphanSlot('pctEditor');

  /**
   * What tells the compiler what `let-value` is. The body is `true`: the signature is the
   * point.
   */
  static ngTemplateContextGuard<
    T,
    M extends Record<string, unknown>,
    Id extends keyof M & string,
  >(
    _slot: PctEditorTemplate<T, M, Id>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctEditorContext<T, M, Id> {
    return true;
  }
}

/**
 * A change an edit made to a cell: the column, the value it is to hold, and the one it held.
 * Typed by the column's id, so the value of `power` is the type of `power` — or `null`, a
 * number's field emptied, and the value it gives back on an undo.
 *
 * @since 0.3.0
 */
export type PctTableChange<M extends Record<string, unknown>> = {
  readonly [Id in keyof M & string]: {
    readonly column: Id;
    readonly value: M[Id] | null;
    readonly previous: M[Id] | null;
  };
}[keyof M & string];

/**
 * An edit of a row: its id, the row as the table holds it, the cells it changes — one, or
 * every cell an edit of the whole row changed — and what made it: an editor committed, or
 * `undo()` and `redo()` asking for a value back.
 *
 * @since 0.3.0
 */
export interface PctTableEdit<T, M extends Record<string, unknown>> {
  readonly id: PctRowId;
  readonly row: T;
  readonly changes: readonly PctTableChange<M>[];
  readonly cause: 'edit' | 'undo' | 'redo';
}

/** A cell open in an editor: what it began at, what draws it, and the draft. */
interface Open {
  readonly column: PctAnyColumn<unknown>;
  /** The row's value. */
  readonly before: unknown;
  /** The draft as the editor began: what is a change is told from this. */
  readonly start: unknown;
  /** The consumer's template, or `null` for a field of the column's kind. */
  readonly slot: TemplateRef<unknown> | null;
  readonly number: boolean;
  /** The fraction digits a number's field takes, fewest and most: its kind's. */
  readonly digits: readonly [number, number];
  readonly context: PctEditorContext<unknown, Record<string, unknown>, string>;
}

/** The row open: one cell of it, or every cell an edit of the whole row opened. */
interface Session {
  readonly id: PctRowId;
  readonly row: unknown;
  readonly cells: ReadonlyMap<string, Open>;
}

/** The edits of one step of the history: one row's, or every row a paste changed. */
type Step = readonly Entry[];

/** An edit as the history holds it, to be asked back. */
interface Entry {
  readonly id: PctRowId;
  readonly row: unknown;
  readonly changes: readonly {
    readonly column: string;
    readonly value: unknown;
    readonly previous: unknown;
  }[];
}

/** Where the stop goes once an editor is committed. */
type Move = 'down' | 'up' | 'next' | 'previous';

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves
 * in, and read the cells open and the table's locale. Kept in a map of this module's own, as
 * the filters' are, so a table that edits nothing carries none of it.
 */
interface Link {
  readonly parts: WritableSignal<PctTableEditingParts | null>;
  readonly cell: (column: string) => Open | undefined;
  readonly locale: () => string;
}

const LINKS = /* @__PURE__ */ new WeakMap<object, Link>();

/** What a key and a press can reach in an editor. */
const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), ' +
  'select:not(:disabled), textarea:not(:disabled), [contenteditable]:not([contenteditable="false"])';

/** How many renders an editor asked for the focus waits for its row to be drawn. */
const PATIENCE = 10;

/**
 * The cells of the table edited in place (0097, D9; 0108): Enter or F2 on a cell opens its
 * editor with the focus in it, a letter or a digit opens it with what was typed, and a
 * double press opens it under the pointer. Enter commits and the stop goes a row down, Shift
 * with it a row up; Tab commits and goes to the next cell, Shift+Tab to the one before;
 * Escape lets the draft go and the stop stays. The focus leaving the editor commits it too.
 *
 * **The table never changes its rows.** A commit is a proposal, as a press on a sortable
 * header is: `(edit)` hands the row's id, the row and the changes, each cell's value and the
 * one it held, and the application writes new rows. An edit that changed nothing is none.
 *
 * **The editor.** A column's `pctEditor` template draws its own control on a signal of the
 * draft; without one, a column of a number kind is edited in a number field of its fraction
 * digits, and a column of text whose values are strings in a text field. Any other column
 * needs a template to be edited.
 *
 * **A whole row.** With `rowEdit`, Enter opens every editable cell of the row; Tab moves
 * among them, the last commits, and the row's changes leave in one `(edit)`. Escape lets the
 * row go.
 *
 * **Undo.** `undo()` and `redo()` — Ctrl+Z and Ctrl+Shift+Z or Ctrl+Y on the grid — ask for
 * the committed edits back, the last `history` of them, as edits of their own with the values
 * turned round: the application applies them as it applied the first.
 *
 * It needs `pctTableGrid`, which gives the cells their stop and their keys.
 *
 * @example
 * <pct-data-table [pctTableGrid]="columns" [pctTableEditing]="columns" [editable]="['name', 'power']" (edit)="apply($event)" …>
 *
 * @since 0.3.0
 */
@Directive({
  selector: 'pct-data-table[pctTableEditing]',
  exportAs: 'pctTableEditing',
  host: { '(dblclick)': 'pressed($event)' },
})
export class PctTableEditing<T, M extends Record<string, unknown>> {
  private readonly table = inject<PctDataTable<T>>(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly texts = inject(PCT_TEXTS);
  private readonly announcer = inject(PctAnnouncer);
  private readonly grid = inject<PctTableGrid<T, M> | null>(PctTableGrid, {
    optional: true,
    self: true,
  });

  /**
   * The table's list of columns, which carries the ids and the values' types the edits are
   * typed by. Never read.
   *
   * @since 0.3.0
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctTableEditing',
  });

  /**
   * Which cells may be edited: the ids of the columns whose every cell may, or a question
   * asked of each row and column.
   *
   * @since 0.3.0
   */
  readonly editable = input.required<
    readonly (keyof M & string)[] | ((row: T, id: keyof M & string) => boolean)
  >();

  /**
   * Enter opens every editable cell of the row, and the row's changes are committed together.
   *
   * @since 0.3.0
   */
  readonly rowEdit = input(false, { transform: booleanAttribute });

  /**
   * How many committed edits `undo()` can ask back; `0` keeps none.
   *
   * @since 0.3.0
   */
  readonly history = input(20, { transform: numberAttribute });

  /**
   * The cell open in an editor, or `null`; with `rowEdit`, the cell of the row whose editor
   * has the focus. Set, the cell opens, if it may be edited; set to `null`, the editor closes
   * and its draft goes.
   *
   * @since 0.3.0
   */
  readonly editing = model<PctTableDataCell<keyof M & string> | null>(null);

  /**
   * An edit committed, or asked back: the application writes the rows it makes.
   *
   * @since 0.3.0
   */
  readonly edit = output<PctTableEdit<T, M>>();

  /** The edits committed, a step each: a paste of several rows is one step, undone at once. */
  private readonly past = signal<readonly Step[]>([]);
  private readonly future = signal<readonly Step[]>([]);

  /**
   * Whether `undo()` has an edit to ask back.
   *
   * @since 0.3.0
   */
  readonly canUndo = computed(() => this.past().length > 0);

  /**
   * Whether `redo()` has an edit to ask again.
   *
   * @since 0.3.0
   */
  readonly canRedo = computed(() => this.future().length > 0);

  private readonly slots = contentChildren(PctEditorTemplate);

  /** The consumer's editors, by column id. */
  private readonly templates = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const slot of this.slots()) {
      slot.read();
      const ids = slot.pctEditorOf();
      for (const id of typeof ids === 'string' ? [ids] : ids)
        if (!map.has(id)) map.set(id, slot.template as TemplateRef<unknown>);
    }
    return map;
  });

  /** The row open, or `null`. */
  private readonly session = signal<Session | null>(null);

  /** The model as the directive last wrote it: another value is the application's. */
  private written: PctTableDataCell | null = null;

  /**
   * The editor to take the focus once it is drawn, by its column, and what was typed on the
   * cell before it had it: the field is given that text, as typed.
   */
  private focusing: {
    readonly column: string;
    left: number;
    typed: string | null;
  } | null = null;

  /** While a commit hands the focus back to the cell: the editor's leaving commits nothing. */
  private closing = false;

  /** The popups of an editor's controls the focus went into, outside the table: each is heard. */
  private readonly popups = new Set<HTMLElement>();

  /** The columns told once that they are editable and have no editor. */
  private readonly warned = new Set<string>();

  constructor() {
    if (this.grid === null)
      throw new Error(
        '[pctTableEditing] needs pctTableGrid on the same table: an editor opens on the ' +
          "grid's stop and gives the focus back to it.",
      );
    const parts = signal<PctTableEditingParts | null>(null);
    LINKS.set(this, {
      parts,
      cell: (column) => this.session()?.cells.get(column),
      locale: () => this.table.locale(),
    });
    this.table.contribute({
      editing: {
        parts: PctTableEditingParts,
        // Read once the table has made the parts, in the render that draws them.
        editor: computed(() => (parts() as PctTableEditingParts).editor()),
        open: computed(() => {
          // Read where the table's first render reads: each template knows it is read.
          this.templates();
          const session = this.session();
          return session === null || parts() === null
            ? () => false
            : (id: PctRowId, column: string) =>
                id === session.id && session.cells.has(column);
        }),
      },
    });
    // Before the grid's: Enter on a cell is the editing's, not a step into its controls.
    const host = this.host.nativeElement;
    const onKey = (event: KeyboardEvent) => this.onCell(event);
    host.addEventListener('keydown', onKey, true);
    // In the browser only, and on the document: Firefox sends a paste to the body.
    afterNextRender(() => this.document.addEventListener('paste', this.pasted));
    inject(DestroyRef).onDestroy(() => {
      host.removeEventListener('keydown', onKey, true);
      this.document.removeEventListener('paste', this.pasted);
      this.listen(null);
    });
    effect(() => {
      const cell = this.editing();
      untracked(() => this.follow(cell));
    });
    afterEveryRender({
      write: () => {
        this.listen(this.own());
        // A row the table no longer holds has nothing to edit: its draft goes.
        const session = this.session();
        if (session !== null && this.rowOf(session.id) === undefined)
          this.drop();
        this.land();
      },
    });
  }

  /**
   * Asks for the last committed edit back: an edit of its own, the values turned round.
   *
   * @since 0.3.0
   */
  undo(): void {
    const step = this.past().at(-1);
    if (step === undefined) return;
    this.drop();
    this.past.update((past) => past.slice(0, -1));
    this.future.update((future) => [...future, step]);
    for (const entry of [...step].reverse())
      this.ask(
        entry,
        entry.changes.map(({ column, value, previous }) => ({
          column,
          value: previous,
          previous: value,
        })),
        'undo',
      );
    this.go({ row: step[0].id, column: step[0].changes[0].column });
  }

  /**
   * Asks again for the last edit `undo()` asked back.
   *
   * @since 0.3.0
   */
  redo(): void {
    const step = this.future().at(-1);
    if (step === undefined) return;
    this.drop();
    this.future.update((future) => future.slice(0, -1));
    this.past.update((past) => [...past, step]);
    for (const entry of step) this.ask(entry, entry.changes, 'redo');
    this.go({ row: step[0].id, column: step[0].changes[0].column });
  }

  /** An edit from the history, emitted with the row as the table holds it now. */
  private ask(entry: Entry, changes: Entry['changes'], cause: 'undo' | 'redo') {
    const row = this.rowOf(entry.id);
    this.edit.emit({
      id: entry.id,
      row: (row === undefined ? entry.row : row) as T,
      changes: changes as readonly PctTableChange<M>[],
      cause,
    });
  }

  /** A step of edits kept to be asked back, as many as `history` keeps; a new one forgets the undone. */
  private record(step: Step): void {
    const limit = Math.max(0, Math.floor(this.history()) || 0);
    this.past.update((past) =>
      limit === 0 ? [] : [...past, step].slice(-limit),
    );
    this.future.set([]);
  }

  /**
   * The table the editors' keys and focus are heard on: inside the host, so a key in an editor
   * reaches its field first, the editing next, and the grid on the host last.
   */
  private listened: HTMLTableElement | null = null;

  private readonly heard = {
    keydown: (event: Event) => {
      if (editorOf(event.target) !== null)
        this.inEditor(event as KeyboardEvent);
    },
    focusin: (event: Event) => {
      const editor = editorOf(event.target);
      if (editor !== null) this.entered(editor.dataset['pctColumn'] as string);
    },
    focusout: (event: Event) => {
      if (editorOf(event.target) !== null) this.left(event as FocusEvent);
    },
  };

  private readonly pasted = (event: Event) =>
    this.paste(event as ClipboardEvent);

  /** The focus leaving a popup of an editor's control, heard on the popup. */
  private readonly leftPopup = (event: Event) => this.left(event as FocusEvent);

  /** Listens on the table drawn, and on no other. */
  private listen(table: HTMLTableElement | null): void {
    if (table === this.listened) return;
    for (const [name, heard] of Object.entries(this.heard)) {
      this.listened?.removeEventListener(name, heard);
      table?.addEventListener(name, heard);
    }
    this.listened = table;
  }

  /** The table the data table drew. */
  private own(): HTMLTableElement | null {
    return this.host.nativeElement.querySelector<HTMLTableElement>(
      ':scope > pct-table-frame > table',
    );
  }

  /** The row with this id, as the table holds it; `undefined` while it holds none. */
  private rowOf(id: PctRowId): unknown {
    for (const line of this.table.lines())
      if (line.kind === 'row' && line.key === id) return line.row;
    return undefined;
  }

  /** The cell of a row's data an element is, with its row and column; `null` for any other. */
  private cellAt(element: HTMLElement): {
    readonly id: PctRowId;
    readonly row: T;
    readonly column: string;
  } | null {
    const table = this.own();
    if (table === null || element.tagName !== 'TD') return null;
    const tr = element.parentElement as HTMLTableRowElement;
    if (
      tr.parentElement?.tagName !== 'TBODY' ||
      tr.hasAttribute('data-pct-part')
    )
      return null;
    if (element.closest('table') !== table) return null;
    const line = this.table.lines()[Number(tr.dataset['pctIndex'])];
    const column =
      table.tHead?.rows[0]?.cells[(element as HTMLTableCellElement).cellIndex]
        ?.dataset['pctColumn'];
    if (line?.kind !== 'row' || column === undefined) return null;
    return { id: line.key, row: line.row, column };
  }

  /** Whether a column of a row may be edited, and is drawn. */
  private editableAt(row: T, column: string): boolean {
    const editable = this.editable();
    const may =
      typeof editable === 'function'
        ? editable(row, column as keyof M & string)
        : editable.includes(column as keyof M & string);
    return (
      may && (this.table.shownColumns() as readonly string[]).includes(column)
    );
  }

  /** The cell open in an editor, made for a column of a row: `null` where none can be. */
  private opened(id: PctRowId, row: T, column: PctAnyColumn<T>): Open | null {
    const before = column.value(row);
    const slot = this.templates().get(column.id) ?? null;
    const kind = column.kind;
    const quantity = typeof kind === 'object' ? kind.number : undefined;
    const number = quantity !== undefined;
    const text =
      (kind === undefined || kind === 'text') &&
      (before === null || before === undefined || typeof before === 'string');
    if (slot === null && !number && !text) {
      this.warnNone(column.id);
      return null;
    }
    const start =
      slot !== null ? before : number ? (before ?? null) : (before ?? '');
    const digits = quantity?.fractionDigits;
    const value = signal<unknown>(start);
    const invalid = signal(false);
    return {
      column: column as PctAnyColumn<unknown>,
      before,
      start,
      slot,
      number: slot === null && number,
      // None at the least: a draft is written as typed, `7` and not `7.0`.
      digits: [
        0,
        digits === undefined
          ? 3
          : typeof digits === 'number'
            ? digits
            : digits[1],
      ],
      context: {
        $implicit: row,
        value,
        column: column as PctAnyColumn<unknown>,
        id,
        invalid,
        commit: () => this.finish(true, null),
        cancel: () => this.finish(false, null),
      },
    };
  }

  /**
   * Opens a cell, or the whole row with `rowEdit`, and gives its editor the focus: what was
   * typed, when it was, is the draft. `false` where the cell may not be edited.
   */
  private begin(
    at: { readonly id: PctRowId; readonly row: T; readonly column: string },
    typed: string | null,
  ): boolean {
    const now = this.session();
    if (now !== null && now.id === at.id && now.cells.has(at.column)) {
      const cell = now.cells.get(at.column) as Open;
      const pending =
        this.focusing?.column === at.column ? this.focusing.typed : null;
      if (typed !== null) {
        // Typed faster than the editor took the focus: the text goes on — after what was
        // typed, or after the value Enter or F2 opened. A number's value is written in its
        // locale, which only its field writes: a key on it, so soon, is let go.
        if (cell.slot !== null) return false;
        const base =
          pending ?? (cell.number ? null : String(cell.context.value()));
        if (base === null) return false;
        const text = base + typed;
        if (!this.type(cell, text)) return false;
        this.focusing = { column: at.column, left: PATIENCE, typed: text };
      } else
        this.focusing = { column: at.column, left: PATIENCE, typed: pending };
      this.land();
      return true;
    }
    const columns = this.table.columns() as readonly PctAnyColumn<T>[];
    const cells = new Map<string, Open>();
    for (const column of columns) {
      const one = column.id === at.column;
      if (!one && !this.rowEdit()) continue;
      if (!this.editableAt(at.row, column.id)) continue;
      const open = this.opened(at.id, at.row, column);
      if (open !== null) cells.set(column.id, open);
    }
    const first = cells.has(at.column) ? at.column : cells.keys().next().value;
    if (first === undefined) return false;
    if (typed !== null) {
      const cell = cells.get(first) as Open;
      if (cell.slot !== null || first !== at.column) return false;
      if (!this.type(cell, typed)) return false;
    }
    // Another row left open is committed as the new one opens, or let go when it may not be.
    if (now !== null) {
      const refused = [...now.cells.values()].some((cell) =>
        cell.context.invalid(),
      );
      this.finish(!refused, null);
    }
    this.session.set({ id: at.id, row: at.row, cells });
    this.write({ row: at.id, column: first });
    this.focusing = { column: first, left: PATIENCE, typed };
    return true;
  }

  /**
   * Makes the text typed on a cell its draft: a text's as it is, a number's as far as it is
   * one. A number begins at a digit, and goes on with what a number is written with.
   */
  private type(cell: Open, text: string): boolean {
    if (!cell.number) {
      cell.context.value.set(text);
      return true;
    }
    if (!/^\d[\d.,\s-]*$/.test(text)) return false;
    // The digits before a separator are the number until the field reads the rest, as typed.
    cell.context.value.set(Number((/^\d+/.exec(text) as RegExpExecArray)[0]));
    return true;
  }

  /**
   * Closes the row open. Committed, its changes leave in one edit — unless a draft is
   * invalid, and then the editor stays and `false` says so. The stop moves as asked, and the
   * focus goes back to the cell when it was in an editor.
   */
  private finish(commit: boolean, move: Move | null): boolean {
    const session = this.session();
    if (session === null) return true;
    const cells = [...session.cells.values()];
    if (commit) {
      const refused = cells.find((cell) => cell.context.invalid());
      if (refused !== undefined) {
        this.focusing = {
          column: refused.column.id,
          left: PATIENCE,
          typed: null,
        };
        this.land();
        return false;
      }
    }
    // The focus back on the cell first: a field commits its own text as it loses it — a
    // number rounded to its digits — and the draft read next is that.
    const editor = this.document.activeElement?.closest(
      '[data-pct-part="editor"]',
    );
    if (editor && this.host.nativeElement.contains(editor)) {
      this.closing = true;
      try {
        (editor.closest('td') as HTMLElement).focus({ preventScroll: true });
      } finally {
        this.closing = false;
      }
    }
    const changes = commit
      ? cells
          .filter((cell) => !Object.is(cell.context.value(), cell.start))
          .map((cell) => ({
            column: cell.column.id,
            value: cell.context.value(),
            previous: cell.before,
          }))
      : [];
    const column = this.written?.column ?? cells[0].column.id;
    const to = move === null ? null : this.next(session.id, column, move);
    this.session.set(null);
    this.write(null);
    this.focusing = null;
    for (const popup of this.popups)
      popup.removeEventListener('focusout', this.leftPopup);
    this.popups.clear();
    if (changes.length > 0) {
      this.record([{ id: session.id, row: session.row, changes }]);
      this.edit.emit({
        id: session.id,
        row: session.row as T,
        changes: changes as readonly PctTableChange<M>[],
        cause: 'edit',
      });
    }
    if (to !== null) this.go(to);
    return true;
  }

  /** Lets the row open go, with nothing committed. */
  private drop(): boolean {
    return this.finish(false, null);
  }

  /** The cell a commit sends the stop to: a row down or up, a column on or back. */
  private next(id: PctRowId, column: string, move: Move): PctTableDataCell {
    if (move === 'next' || move === 'previous') {
      const drawn: readonly string[] = this.table.shownColumns();
      const at = drawn.indexOf(column) + (move === 'next' ? 1 : -1);
      return { row: id, column: drawn[at] ?? column };
    }
    const lines = this.table.lines();
    const at = lines.findIndex(
      (line) => line.kind === 'row' && line.key === id,
    );
    const step = move === 'down' ? 1 : -1;
    for (let line = at + step; line >= 0 && line < lines.length; line += step) {
      const other = lines[line];
      if (other.kind === 'row') return { row: other.key, column };
    }
    return { row: id, column };
  }

  /** Moves the grid's stop: the focus follows it while it is in the table. */
  private go(cell: PctTableDataCell): void {
    (this.grid as PctTableGrid<T, M>).focused.set(
      cell as PctTableDataCell<keyof M & string>,
    );
  }

  private write(cell: PctTableDataCell | null): void {
    this.written = cell;
    this.editing.set(cell as PctTableDataCell<keyof M & string> | null);
  }

  /** The model the application set, followed: the cell it names opens, or the row closes. */
  private follow(cell: PctTableDataCell | null): void {
    if (cell === this.written) return;
    this.written = cell;
    if (cell === null) {
      this.drop();
      return;
    }
    const row = this.rowOf(cell.row);
    const opened =
      row !== undefined &&
      this.begin({ id: cell.row, row: row as T, column: cell.column }, null);
    if (!opened) this.write(null);
    else if (this.focusing !== null) this.table.scrollTo(cell.row);
  }

  /** The editor asked for, given the focus once its row is drawn. */
  private land(): void {
    const focusing = this.focusing;
    if (focusing === null) return;
    const editor = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '[data-pct-part="editor"]',
      ),
    ).find((one) => one.dataset['pctColumn'] === focusing.column);
    const control = this.focusOne(
      editor === undefined
        ? []
        : Array.from(editor.querySelectorAll<HTMLElement>(FOCUSABLE)),
    );
    if (control === null) {
      if (--focusing.left <= 0) this.focusing = null;
      return;
    }
    this.focusing = null;
    if (!(control instanceof HTMLInputElement)) return;
    // What was typed on the cell, as typed: the field reads it as it reads a key.
    if (focusing.typed !== null) {
      control.value = focusing.typed;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // The caret after the text, as a sheet's F2 leaves it: typing goes on from there.
    if (control.type === 'text') {
      const end = control.value.length;
      control.setSelectionRange(end, end);
    }
  }

  /**
   * Gives the focus to the first of these controls that takes it: a control the page does
   * not draw, or one inside another, refuses it. The one that took it, or `null`.
   */
  private focusOne(controls: readonly HTMLElement[]): HTMLElement | null {
    for (const control of controls) {
      control.focus();
      if (this.document.activeElement === control) return control;
    }
    return null;
  }

  /** A key on a cell of the grid: Enter or F2 opens it, a letter types into it, Ctrl+Z undoes. */
  private onCell(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement;
    const table = this.own();
    if (table === null || !table.contains(target)) return;
    if (target.closest('[data-pct-part="editor"]') !== null) return;
    // AltGr is Ctrl and Alt on Windows: what it writes, `€`, is typed, not a command.
    const altGraph = event.getModifierState('AltGraph');
    const command =
      (event.ctrlKey || event.metaKey) && !event.altKey && !altGraph;
    const key = event.key.toLowerCase();
    // A field of the consumer's in a cell undoes its own typing.
    const field = target.matches(
      'input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable]:not([contenteditable="false"])',
    );
    if (
      command &&
      !field &&
      (key === 'z' || (key === 'y' && !event.shiftKey))
    ) {
      event.preventDefault();
      if (key === 'z' && !event.shiftKey) this.undo();
      else this.redo();
      return;
    }
    const at = this.cellAt(target);
    if (at === null) return;
    if (event.key === 'Enter' || event.key === 'F2') {
      if (!event.shiftKey && this.begin(at, null)) event.preventDefault();
      return;
    }
    if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      (altGraph || (!event.altKey && !event.ctrlKey && !event.metaKey)) &&
      this.begin(at, event.key)
    )
      event.preventDefault();
  }

  /** A double press on a cell opens it. */
  protected pressed(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // A double press in an editor selects a word of its text.
    if (target.closest('[data-pct-part="editor"]') !== null) return;
    const cell = target.closest('td');
    const at = cell === null ? null : this.cellAt(cell);
    if (at !== null && this.begin(at, null)) event.preventDefault();
  }

  /**
   * A key in an editor, after its control had it: Enter commits and goes a row on, Tab to the
   * next control of the row open or past it, Escape lets the draft go.
   */
  private inEditor(event: KeyboardEvent): void {
    // A key that picks a word of an input method is the method's.
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement;
    // A control's own popup has the key first: the next one is the editor's.
    if (target.closest('[aria-expanded="true"]') !== null) return;
    const command = event.ctrlKey || event.metaKey || event.altKey;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.drop();
        return;
      case 'F2':
        event.preventDefault();
        this.finish(true, null);
        return;
      case 'Enter':
        // A line break is a text area's own.
        if (command || target.tagName === 'TEXTAREA') return;
        event.preventDefault();
        this.finish(true, event.shiftKey ? 'up' : 'down');
        return;
      case 'Tab': {
        if (command) return;
        event.preventDefault();
        const controls = Array.from(
          this.host.nativeElement.querySelectorAll<HTMLElement>(
            '[data-pct-part="editor"]',
          ),
        ).flatMap((editor) =>
          Array.from(editor.querySelectorAll<HTMLElement>(FOCUSABLE)),
        );
        const at = controls.findIndex((one) => one.contains(target));
        const on = event.shiftKey
          ? controls.slice(0, Math.max(at, 0)).reverse()
          : controls.slice(at + 1);
        if (at < 0 || !this.focusOne(on))
          this.finish(true, event.shiftKey ? 'previous' : 'next');
        return;
      }
    }
  }

  /** An editor of the row took the focus: the model names its cell. */
  private entered(column: string): void {
    const session = this.session();
    if (session === null || this.written?.column === column) return;
    this.write({ row: session.id, column });
  }

  /**
   * The focus left an editor: to another of the row open, nothing; anywhere else in the page,
   * the row is committed — or kept open, its draft refused. Nowhere, the window went: once
   * it is back, the focus says.
   */
  private left(event: FocusEvent): void {
    const session = this.session();
    if (session === null || this.closing) return;
    const next = event.relatedTarget;
    if (next instanceof Element) {
      if (!this.within(next)) this.close(session);
      return;
    }
    queueMicrotask(() => {
      const now = this.session();
      if (now === null || !this.document.hasFocus()) return;
      const active = this.document.activeElement;
      if (active === null || !this.within(active)) this.close(now);
    });
  }

  /**
   * Whether an element stands in an editor of the row open, or in a popup one of its controls
   * owns — a calendar the page draws outside the table — which is then heard as an editor is.
   */
  private within(element: Element): boolean {
    if (editorOf(element) !== null) return true;
    const owners = this.host.nativeElement.querySelectorAll(
      '[data-pct-part="editor"] [aria-controls], [data-pct-part="editor"] [aria-owns]',
    );
    for (const owner of Array.from(owners)) {
      const ids =
        (owner.getAttribute('aria-controls') ?? '') +
        ' ' +
        (owner.getAttribute('aria-owns') ?? '');
      for (const id of ids.split(/\s+/)) {
        const popup = id === '' ? null : this.document.getElementById(id);
        if (popup === null || !popup.contains(element)) continue;
        if (!this.popups.has(popup)) {
          this.popups.add(popup);
          popup.addEventListener('focusout', this.leftPopup);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * The focus went elsewhere: the row is committed, or, a draft refused, kept open — the focus
   * is the user's to take, and the editor waits for it.
   */
  private close(session: Session): void {
    for (const cell of session.cells.values())
      if (cell.context.invalid()) return;
    this.finish(true, null);
  }

  /**
   * Ctrl+V or ⌘+V on the grid, or a menu's Paste: tab-separated values — what a sheet and the
   * grid's copy put on the clipboard — written from the stop's cell, or the range's first, to
   * the right and down, a value into each cell that may be edited, read as its column's kind
   * reads it (`pctPlainReader`), and a text the copy wrote as its value is that value, so a cell
   * pasted back onto itself is unchanged. One value pasted on a range fills the range. Each row changed
   * is an `(edit)` of its own, and the paste is one step of the history, undone at once. A cell
   * that may not be edited, a column drawn by its own editor — its rules are the template's —
   * and a text that is no value of its column, are left out, and the
   * announcement counts them; past the table's last row or column nothing is written. In an
   * editor, in a field of the application's and in a cell stepped into, the paste is theirs.
   */
  private paste(event: ClipboardEvent): void {
    const table = this.own();
    const active = this.document.activeElement;
    const grid = this.grid as PctTableGrid<T, M>;
    if (
      event.defaultPrevented ||
      event.clipboardData === null ||
      this.session() !== null ||
      table === null ||
      active === null ||
      active.closest('table') !== table ||
      active.closest('td, th') !== active
    )
      return;
    const block = pctParseDelimited(
      event.clipboardData.getData('text/plain'),
      '\t',
    );
    if (block.length === 0) return;
    const lines = this.table.lines().filter((line) => line.kind === 'row');
    const keys = lines.map((line) => line.key);
    const ids: readonly string[] = this.table.shownColumns();
    const range = grid.range();
    const focused = grid.focused();
    const corner =
      range ?? (focused === null ? null : { from: focused, to: focused });
    // The range's first cell is its top left, whichever way it was drawn.
    const rows =
      corner === null
        ? []
        : [corner.from, corner.to].map((one) =>
            keys.indexOf(one.row as PctRowId),
          );
    const places =
      corner === null
        ? []
        : [corner.from, corner.to].map((one) => ids.indexOf(one.column));
    if (rows.length === 0 || [...rows, ...places].some((at) => at < 0)) return;
    const top = Math.min(...rows);
    const left = Math.min(...places);
    event.preventDefault();
    const targets: [number, number, string][] = [];
    if (range !== null && block.length === 1 && block[0].length === 1) {
      for (let r = top; r <= Math.max(...rows); r++)
        for (let c = left; c <= Math.max(...places); c++)
          targets.push([r, c, block[0][0]]);
    } else
      block.forEach((line, r) =>
        line.forEach((text, c) => {
          if (top + r < lines.length && left + c < ids.length)
            targets.push([top + r, left + c, text]);
        }),
      );
    const columns = new Map(
      (this.table.columns() as readonly PctAnyColumn<T>[]).map((column) => [
        column.id,
        column,
      ]),
    );
    const locale = this.table.resolvedLocale();
    const words = { yes: this.texts().tableYes, no: this.texts().tableNo };
    const templates = this.templates();
    // One reader and one writer a column, made once for the whole paste.
    const kinds = new Map<
      string,
      {
        readonly read: (text: string) => unknown;
        readonly write: (value: unknown) => string;
      }
    >();
    const kindOf = (column: PctAnyColumn<T>) => {
      let known = kinds.get(column.id);
      if (known === undefined) {
        const text = column.kind === undefined || column.kind === 'text';
        const read = pctPlainReader(column.kind, locale, words);
        known = {
          read: text ? (one) => read(pctTextOfSheet(one)) : read,
          write: pctPlainWriter(column.kind, locale),
        };
        kinds.set(column.id, known);
      }
      return known;
    };
    const changed = new Map<PctRowId, Entry>();
    let pasted = 0;
    for (const [r, c, text] of targets) {
      const line = lines[r];
      const column = columns.get(ids[c]) as PctAnyColumn<T>;
      const before = column.value(line.row);
      const kind = column.kind;
      // A text column whose values are not texts takes no text, and a column drawn by its own
      // editor none either: what a text means there is the editor's to say.
      const opaque =
        templates.has(column.id) ||
        ((kind === undefined || kind === 'text') &&
          before !== null &&
          before !== undefined &&
          typeof before !== 'string');
      if (opaque || !this.editableAt(line.row, column.id)) continue;
      const { read, write } = kindOf(column);
      // A value written as the copy writes it is that value: a day, a moment to the second.
      const value = write(before) === text ? before : read(text);
      if (value === undefined) continue;
      pasted++;
      if (Object.is(value, before)) continue;
      const entry = changed.get(line.key) ?? {
        id: line.key,
        row: line.row,
        changes: [],
      };
      changed.set(line.key, {
        ...entry,
        changes: [
          ...entry.changes,
          { column: column.id, value, previous: before },
        ],
      });
    }
    const step = [...changed.values()];
    if (step.length > 0) this.record(step);
    for (const entry of step)
      this.edit.emit({
        id: entry.id,
        row: entry.row as T,
        changes: entry.changes as readonly PctTableChange<M>[],
        cause: 'edit',
      });
    const skipped = targets.length - pasted;
    const say =
      skipped === 0 ? this.texts().tablePasted : this.texts().tablePasteSkipped;
    const message = say
      .replace('{count}', String(pasted))
      .replace('{skipped}', String(skipped));
    // Each paste is said, the same count again too.
    this.announcer.retract(message);
    this.announcer.announce(message);
  }

  private warnNone(column: string): void {
    if (!isDevMode() || this.warned.has(column)) return;
    this.warned.add(column);
    console.warn(
      `[pctTableEditing] The column "${column}" is editable and has no editor: a column of ` +
        `a number kind, or of text whose values are strings, is edited in a field of its own, ` +
        `and any other needs a pctEditor template.`,
    );
  }
}

/** The editor an element of an event stands in, or `null`. */
function editorOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>('[data-pct-part="editor"]')
    : null;
}

/**
 * What a table that edits its cells draws in a cell open: the column's own editor, or a field
 * of its kind. The table makes it in its own view, out of the paint, so a table that edits
 * nothing carries none of it (0097).
 *
 * @since 0.3.0
 */
@Component({
  imports: [NgTemplateOutlet, PctNumber, PctText],
  // Its element is the table's child and draws nothing: the templates stand where they are put.
  host: { hidden: '' },
  templateUrl: './data-table-editing.html',
  styleUrl: './data-table-editing.scss',
})
export class PctTableEditingParts {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly link = LINKS.get(inject(PctTableEditing)) as Link;

  /**
   * What a cell open holds: its editor.
   *
   * @since 0.3.0
   */
  readonly editor = viewChild.required<TemplateRef<unknown>>('editor');

  constructor() {
    this.link.parts.set(this);
  }

  /** The column's cell open: the table draws the editor only for a cell open. */
  protected cellOf(column: PctAnyColumn<unknown>): Open {
    return this.link.cell(column.id) as Open;
  }

  /** The locale a number is written in: the table's. */
  protected locale(): string {
    return this.link.locale();
  }

  /** The draft of a number's field. */
  protected numberOf(cell: Open): number | null {
    const value = cell.context.value();
    return typeof value === 'number' ? value : null;
  }

  /** The draft of a text's field. */
  protected textOf(cell: Open): string {
    const value = cell.context.value();
    return typeof value === 'string' ? value : '';
  }

  /** What a field is named: the column it edits. */
  protected nameOf(column: PctAnyColumn<unknown>): string {
    return this.texts().tableEdit.replace('{column}', () => column.header);
  }
}
