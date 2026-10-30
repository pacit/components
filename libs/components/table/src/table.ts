import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  contentChild,
  DestroyRef,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  isDevMode,
  model,
  signal,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';
import type { PctSortDirection } from './model/order';
import { PctIcon } from '@pacit/components/icon';

/**
 * The column the rows stand sorted by, named by the key its header carries, and which way.
 *
 * `Id` is `string` here, where the consumer writes the keys; the data table narrows it to the
 * ids of its columns.
 *
 * @since next
 */
export interface PctTableSort<Id extends string = string> {
  readonly key: Id;
  readonly direction: PctSortDirection;
}

/**
 * A table the consumer writes, dressed by the library: the platform's `<table>`, its caption,
 * header cells and cells, each element wearing a component of its own.
 *
 * **Element by element, because the markup is the consumer's.** The rows are written in the
 * consumer's template, and projected content keeps the encapsulation of the template that
 * declared it: a stylesheet on the table cannot reach a cell. A directive carries no styles
 * and the library's styling API does not stand on `::ng-deep`, so each element the paint
 * needs is a component on that element, as `a[pctCrumbLink]` is on an anchor. A cell or a
 * header cell without its attribute keeps the browser's own look.
 *
 * **No role and no ARIA of its own.** A `<table>` with a `<caption>` and `scope` on its
 * header cells is the platform's semantics, read by every reader. The one attribute written
 * is `aria-sort`, on the header of the column the rows stand sorted by.
 *
 * **It sorts nothing.** `sort` says which column the rows are ordered by and a header's press
 * proposes the next order; putting the rows in that order is the consumer's, who owns them.
 * The headers follow the APG's sortable table
 * (https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/): a button in each
 * sortable header, and `aria-sort` on the sorted column's header alone.
 *
 * @example
 * <table pctTable [(sort)]="sort">
 *   <caption pctCaption>Rules</caption>
 *   <thead>
 *     <tr><th pctHeader scope="col" sortKey="name">Name</th>
 *         <th pctHeader scope="col" numeric>Energy</th></tr>
 *   </thead>
 *   <tbody>
 *     @for (rule of sorted(); track rule.id) {
 *       <tr><td pctCell>{{ rule.name }}</td><td pctCell numeric>{{ rule.energy }}</td></tr>
 *     }
 *   </tbody>
 * </table>
 *
 * @since next
 */
@Component({
  selector: 'table[pctTable]',
  templateUrl: './table.html',
  styleUrl: './table.scss',
  host: { class: 'pct-table' },
})
export class PctTable {
  /**
   * The column the rows stand sorted by, and which way, or `null` while they stand in the
   * consumer's own order. A header with a `sortKey` writes it when pressed: a column not yet
   * sorted starts ascending, and the sorted one turns the other way. Bind it two-way and order
   * the rows from it.
   *
   * @since next
   */
  readonly sort = model<PctTableSort | null>(null);
}

/**
 * The table's caption: its name, which a reader announces with the table, and the name of the
 * frame around it when the frame scrolls.
 *
 * @since next
 */
@Component({
  selector: 'caption[pctCaption]',
  templateUrl: './caption.html',
  styleUrl: './caption.scss',
  host: { class: 'pct-table-caption', '[id]': 'id()' },
})
export class PctTableCaption {
  /**
   * The caption's id. A frame names itself by it, so one is generated when none is written.
   *
   * @since next
   */
  readonly id = input(nextPctId('pct-table-caption'));
}

/**
 * A header cell. With a `sortKey` its content is a button that proposes sorting the rows by
 * that column, and the header of the sorted column carries `aria-sort`.
 *
 * @since next
 */
@Component({
  selector: 'th[pctHeader]',
  imports: [NgTemplateOutlet, PctIcon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  host: {
    class: 'pct-table-header',
    // Only on the sorted column: APG's sortable table writes it on one header at a time, and a
    // `none` on every other column is a word each of them would say for nothing.
    '[attr.aria-sort]': 'direction()',
    '[attr.data-pct-numeric]': 'numeric() ? "" : null',
    '[attr.data-pct-sortable]': 'sortKey() === null ? null : ""',
  },
})
export class PctTableHeader {
  private readonly table = inject(PctTable);

  /**
   * The key the column is sorted by. Unset or empty, the header is a label and nothing more.
   *
   * @since next
   */
  readonly sortKey = input<string | null, string | null | undefined>(null, {
    transform: (key) => key || null,
  });

  /**
   * The column holds numbers: its header stands at the end edge, over the digits it names.
   *
   * @since next
   */
  readonly numeric = input(false, { transform: booleanAttribute });

  /**
   * A name for the sort button, standing in for its label. Empty by default, and it should
   * usually stay so: the label is the name, and a name that does not contain the visible text
   * breaks WCAG 2.5.3. It is for a header whose label is an icon or an abbreviation.
   *
   * @since next
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page.
   *
   * @since next
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * A sentence a reader hears after the sort button's name, as its description: what the
   * header says to the eye beside its label and nowhere in the tree. The data table writes the
   * place and the way of a sort key after the first here, which `aria-sort` cannot carry.
   *
   * @since next
   */
  readonly description = input<string>('');

  /** The id of the element the description stands in. */
  protected readonly descriptionId = nextPctId('pct-table-header');

  /** Which way the rows stand sorted by this column, or `null` when they stand by another or by none. */
  protected readonly direction = computed(() => {
    const sort = this.table.sort();
    return sort?.key === this.sortKey() ? sort.direction : null;
  });

  protected press(key: string): void {
    this.table.sort.set({
      key,
      direction: this.direction() === 'ascending' ? 'descending' : 'ascending',
    });
  }
}

/**
 * A cell.
 *
 * @since next
 */
@Component({
  selector: 'td[pctCell]',
  templateUrl: './cell.html',
  styleUrl: './cell.scss',
  host: {
    class: 'pct-table-cell',
    '[attr.data-pct-numeric]': 'numeric() ? "" : null',
  },
})
export class PctTableCell {
  /**
   * The cell holds a number: it stands at the end edge in digits of one width, so a column of
   * them lines up by place value.
   *
   * @since next
   */
  readonly numeric = input(false, { transform: booleanAttribute });
}

/**
 * The frame a table scrolls in when it is wider than the space it is given, or taller than a
 * height it is given. While the table overflows, the frame is a focusable region named by the table's caption, so a keyboard can
 * reach it and scroll it and a reader can say what it holds. While the table fits, the frame
 * is nothing: a stop with nothing to scroll is a stop for nothing.
 *
 * @since next
 */
@Component({
  selector: 'pct-table-frame',
  templateUrl: './frame.html',
  styleUrl: './frame.scss',
  host: {
    class: 'pct-table-frame',
    '[attr.role]': 'overflows() ? "region" : null',
    '[attr.tabindex]': 'overflows() ? "0" : null',
    // The caption names the region; an `aria-labelledby` the consumer wrote on the frame stays
    // where no caption stands, and stays while the frame is no region, rather than going with
    // the first change detection.
    '[attr.aria-labelledby]':
      'overflows() ? (caption()?.id() ?? named()) : named()',
    // A name in words, for a region with no element to name it: only while it is a region,
    // since ARIA lets no name stand on a generic element.
    '[attr.aria-label]': 'overflows() ? label() : null',
  },
})
export class PctTableFrame {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** The consumer's own `aria-labelledby`, read once from the element they wrote. */
  protected readonly labelledBy = inject(
    new HostAttributeToken('aria-labelledby'),
    { optional: true },
  );

  /**
   * The id of the element that names the frame when no caption does, for a component that
   * renders the frame and takes the name as an input: the attribute itself is read once, from
   * the element the consumer wrote.
   *
   * @since next
   */
  readonly labelledby = input<string | null>(null);

  /**
   * The frame's name in words, for a component that renders the frame and names its table
   * with a label rather than an element: the region takes it while the table overflows.
   *
   * @since next
   */
  readonly label = input<string | null>(null);

  /** The name's id: the input's, or the attribute's. */
  protected readonly named = computed(
    () => this.labelledby() ?? this.labelledBy,
  );

  protected readonly caption = contentChild(PctTableCaption, {
    descendants: true,
  });

  /** Measured, so it is `false` until the browser has laid the table out, and under SSR. */
  protected readonly overflows = signal(false);

  private warned = false;

  constructor() {
    afterNextRender(() => {
      const frame = this.host.nativeElement;
      const observer = new ResizeObserver(() => this.measure(frame));
      observer.observe(frame);
      // The table's own width moves when its rows do, with the frame's width unchanged. A table
      // an `@if` puts in later, or swaps for another, is watched from the moment it arrives.
      const watch = () => {
        for (const table of Array.from(frame.children)) observer.observe(table);
        this.measure(frame);
      };
      for (const table of Array.from(frame.children)) observer.observe(table);
      const arrivals = new MutationObserver(watch);
      arrivals.observe(frame, { childList: true });
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        arrivals.disconnect();
      });
    });
  }

  private measure(frame: HTMLElement): void {
    // Either axis: a frame given a height scrolls its rows as a wider one scrolls its columns.
    const overflows =
      frame.scrollWidth > frame.clientWidth ||
      frame.scrollHeight > frame.clientHeight;
    this.overflows.set(overflows);
    if (overflows && isDevMode()) this.warnOnUnnamedRegion(frame);
  }

  /**
   * A frame that scrolls takes focus, and a focusable region with no name is announced as a
   * region and nothing more. Said once, and only in dev mode: the fix is a caption.
   */
  private warnOnUnnamedRegion(frame: HTMLElement): void {
    if (
      this.warned ||
      this.caption() ||
      this.named() ||
      frame.hasAttribute('aria-label')
    )
      return;
    this.warned = true;
    console.warn(
      `[pct-table-frame] The table scrolls, so the frame takes focus, and nothing names ` +
        `it: give the table a <caption pctCaption>, or the frame an aria-label.`,
    );
  }
}
