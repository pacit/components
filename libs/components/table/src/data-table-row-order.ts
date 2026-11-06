import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  type TemplateRef,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { nextPctId, PCT_TEXTS, PctAnnouncer } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctDataTable } from './data-table';
import type { PctRowId } from './model/columns';

/**
 * A move of a row the user asked for: the row's id, and the id of the row it goes in front
 * of — `null` for the end of the list.
 *
 * @since 0.3.1
 */
export interface PctRowMove {
  readonly id: PctRowId;
  readonly before: PctRowId | null;
}

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves
 * in. Kept in a map of this module's own, not in `providers` (`lesson-173`).
 */
interface Link {
  readonly parts: WritableSignal<PctTableRowOrderParts | null>;
}

const LINKS = /* @__PURE__ */ new WeakMap<PctTableRowOrder, Link>();

/**
 * The rows in the order the user puts them: a leading column holds a handle per row, which
 * moves the row with `Alt+↑` and `Alt+↓`, or by dragging it over another row. The table
 * moves nothing itself: a move is said in `(reorder)` — the row's id, and the id of the row
 * it goes in front of, `null` for the end — and the application moves the row in `rows`,
 * where the order is kept. Once the row stands at its new place, its handle has the focus
 * again and a reader hears the row's new number
 * ([0116](../../../../docs/decisions/0116-pinned-rows-stand-outside-the-lines-and-a-move-is-the-applications.md)).
 *
 * The rows stand in the order the application gave them: under a sort the order is the
 * sort's, and in a tree or in groups a place is not a place in the list, so the handles stay
 * disabled there, and the table says so once in development.
 *
 * @example
 * <pct-data-table pctTableRowOrder (reorder)="move($event)" animateRows [rows]="rules()" [columns]="columns" [rowId]="byId" />
 *
 * @since 0.3.1
 */
@Directive({
  selector: 'pct-data-table[pctTableRowOrder]',
  exportAs: 'pctTableRowOrder',
})
export class PctTableRowOrder {
  private readonly table = inject(PctDataTable);

  /**
   * No row moves: the handles are drawn, disabled.
   *
   * @since 0.3.1
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * A move the user asked for, for the application to make in `rows` — in the handler, before
   * the next render: the table then finds the row at its new place, puts the focus back on
   * its handle and tells a reader its number. A move made later is drawn, and says nothing.
   *
   * @since 0.3.1
   */
  readonly reorder = output<PctRowMove>();

  private readonly parts = signal<PctTableRowOrderParts | null>(null);

  constructor() {
    LINKS.set(this, { parts: this.parts });
    const parts = this.parts;
    this.table.contribute({
      order: {
        parts: PctTableRowOrderParts,
        // Read once the table has made the parts, in the render that draws them.
        head: computed(() => (parts() as PctTableRowOrderParts).head()),
        cell: computed(() => (parts() as PctTableRowOrderParts).cell()),
      },
    });
  }
}

/** A drag under way: the row's id, the pointer's, and the place under the pointer. */
interface Drag {
  readonly id: PctRowId;
  readonly pointer: number;
  readonly handle: HTMLElement;
  target: {
    readonly before: PctRowId | null;
    readonly row: HTMLElement;
  } | null;
}

/**
 * The order's parts: the header of the column of handles and a row's handle, templates the
 * table draws in the places it keeps for them, and the handlers of the handle. Declared here,
 * rendered there. `pctTableRowOrder` makes it, so it has no selector.
 *
 * @since 0.3.1
 */
@Component({
  imports: [PctIcon],
  // Its element is the table's child and draws nothing: the templates stand where they are put.
  host: { hidden: '' },
  templateUrl: './data-table-row-order.html',
  styleUrl: './data-table-row-order.scss',
})
export class PctTableRowOrderParts {
  protected readonly order = inject(PctTableRowOrder);
  private readonly table = inject(PctDataTable);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly announcer = inject(PctAnnouncer);
  private readonly injector = inject(Injector);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * What the header of the column of handles holds: the word a handle is named by.
   *
   * @since 0.3.1
   */
  readonly head = viewChild.required<TemplateRef<unknown>>('head');

  /**
   * What a row's cell of the column holds, given the row and whether a move is open to it.
   *
   * @since 0.3.1
   */
  readonly cell = viewChild.required<TemplateRef<unknown>>('cell');

  /** The id of the word a handle is named by, before the row's first text. */
  protected readonly wordId = `${nextPctId('pct-table-order')}-word`;

  private drag: Drag | null = null;

  constructor() {
    (LINKS.get(this.order) as Link).parts.set(this);
  }

  /** The table's element: the parts' own stands in it, out of the paint. */
  private host(): HTMLElement {
    return this.element.nativeElement.closest('pct-data-table') as HTMLElement;
  }

  /** The ids of the rows, as the lines stand. */
  private ids(): readonly PctRowId[] {
    return this.table
      .lines()
      .flatMap((line) => (line.kind === 'row' ? [line.key] : []));
  }

  /**
   * `Alt+↑` and `Alt+↓` on a handle move its row one place, past the row before it or the
   * one after; `Escape` lets go of a row being dragged. The keys are the handle's: a grid
   * under the table does not see them.
   */
  protected key(id: PctRowId, event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.drag !== null) {
      this.letGo();
      event.preventDefault();
      return;
    }
    if (!event.altKey) return;
    const step =
      event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = this.ids();
    const at = ids.indexOf(id);
    if (at < 0) return;
    // The last row's step down is the end, where it stands: `move` refuses it.
    if (step > 0) this.move(id, ids[at + 2] ?? null);
    else if (at > 0) this.move(id, ids[at - 1]);
  }

  /** The press that takes hold of a row: the pointer's, held until it lets go. */
  protected grab(id: PctRowId, event: PointerEvent): void {
    if (event.button !== 0) return;
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    // The press is kept from selecting text, which would take the focus with it.
    event.preventDefault();
    handle.focus();
    this.drag = { id, pointer: event.pointerId, handle, target: null };
    (handle.closest('tr') as HTMLElement).setAttribute('data-pct-dragging', '');
  }

  /**
   * The pointer over the rows: the row under it is the place, before it in its upper half,
   * after it in the lower, and the row is marked so. A row's details, open below it, are its
   * lower half.
   */
  protected over(event: PointerEvent): void {
    const drag = this.drag;
    if (drag === null || drag.pointer !== event.pointerId) return;
    const rows = Array.from(
      this.host().querySelectorAll<HTMLElement>(
        ':scope > pct-table-frame > table > tbody:not([data-pct-pinned]) > tr[data-pct-index]',
      ),
    );
    const lines = this.table.lines();
    const ids = this.ids();
    let target: Drag['target'] = null;
    for (const row of rows) {
      const box = row.getBoundingClientRect();
      if (event.clientY < box.top || event.clientY >= box.bottom) continue;
      const line = lines[Number(row.dataset['pctIndex'])];
      if (
        line === undefined ||
        (line.kind !== 'row' && line.kind !== 'details')
      )
        break;
      const at = ids.indexOf(line.key);
      const before =
        line.kind === 'row' && event.clientY < box.top + box.height / 2
          ? line.key
          : (ids[at + 1] ?? null);
      target = { before, row };
      break;
    }
    if (
      drag.target?.row !== target?.row ||
      drag.target?.before !== target?.before
    ) {
      drag.target?.row.removeAttribute('data-pct-drop');
      if (target !== null)
        target.row.setAttribute(
          'data-pct-drop',
          target.before === lines[Number(target.row.dataset['pctIndex'])].key
            ? 'before'
            : 'after',
        );
      drag.target = target;
    }
  }

  /** The pointer let go: the row moves to the place it was over, if any. */
  protected drop(event: PointerEvent): void {
    const drag = this.drag;
    if (drag === null || drag.pointer !== event.pointerId) return;
    const target = drag.target;
    this.letGo();
    if (target !== null) this.move(drag.id, target.before);
  }

  /** The drag is over, with or without a move: the marks are taken off. */
  protected letGo(): void {
    const drag = this.drag;
    if (drag === null) return;
    drag.target?.row.removeAttribute('data-pct-drop');
    (drag.handle.closest('tr') as HTMLElement).removeAttribute(
      'data-pct-dragging',
    );
    this.drag = null;
  }

  /**
   * A move said to the application, unless the row already stands there; then, once the rows
   * are drawn again, the handle's focus and the row's new number for a reader.
   */
  private move(id: PctRowId, before: PctRowId | null): void {
    const ids = this.ids();
    const at = ids.indexOf(id);
    if (before === id || (ids[at + 1] ?? null) === before) return;
    this.order.reorder.emit({ id, before });
    afterNextRender(
      () => {
        const ids = this.ids();
        const place = ids.indexOf(id);
        if (place < 0) return;
        if (place !== at) {
          const sentence = this.texts().tableMovedTo;
          const message = sentence
            .replace('{place}', String(place + 1))
            .replace('{count}', String(ids.length));
          this.announcer.retract(message);
          this.announcer.announce(message);
        }
        // `@for` moved the row's element, which let the focus go.
        const handles = Array.from(
          this.host().querySelectorAll<HTMLElement>('[data-pct-part="handle"]'),
        );
        handles
          .find((handle) => handle.dataset['pctRow'] === String(id))
          ?.focus();
      },
      { injector: this.injector },
    );
  }
}
