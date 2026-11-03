import {
  Component,
  computed,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { PctPagination } from '@pacit/components/pagination';
import {
  PctDataTable,
  PctTablePage,
  pctColumnsOf,
  type PctTableSort,
} from '@pacit/components/table';

interface Register {
  readonly id: number;
  readonly address: number;
  readonly name: string;
}

type Key = 'address' | 'name';

interface Page {
  readonly rows: readonly Register[];
  readonly page: number;
  readonly total: number;
}

const col = pctColumnsOf<Register>();
const SIZE = 10;
const ALL: readonly Register[] = Array.from({ length: 95 }, (_, i) => ({
  id: i + 1,
  address: 40_001 + i,
  name: `Register ${i + 1}`,
}));

/** A stand-in for a server: it sorts and answers one page, 300 ms later. */
function fetchPage(
  page: number,
  sort: readonly PctTableSort<Key>[],
): Promise<Page> {
  const matched = ALL;
  const [by] = sort;
  const sorted = by
    ? [...matched].sort(
        (a, b) =>
          (a[by.key] < b[by.key] ? -1 : 1) *
          (by.direction === 'descending' ? -1 : 1),
      )
    : matched;
  const from = (page - 1) * SIZE;
  return new Promise((done) =>
    setTimeout(
      () =>
        done({
          rows: sorted.slice(from, from + SIZE),
          page,
          total: matched.length,
        }),
      300,
    ),
  );
}

/**
 * Pages from a server
 *
 * With `clientSort` off, the `sort` model is a request for the server, as `filter` is with
 * `clientFilter` off. `pctTablePage` tells a reader each row's place among every match, and
 * `pct-pagination` turns the pages.
 */
@Component({
  selector: 'demo-datatable-paged',
  imports: [PctDataTable, PctTablePage, PctPagination],
  styles: `
    pct-pagination {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-data-table
      caption="Registers on the server"
      pctTablePage
      [rowOffset]="offset()"
      [rowTotal]="total()"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      [clientSort]="false"
      [clientFilter]="false"
      [loading]="answer.isLoading()"
      [(sort)]="sort"
    />
    <pct-pagination ariaLabel="Pages" [count]="pages()" [(page)]="page" />
  `,
})
export class DatatablePagedDemo {
  readonly columns = col.of([
    col.key('address', { header: 'Address', numeric: true }),
    col.key('name', { header: 'Name' }),
  ]);
  readonly byId = (register: Register) => register.id;
  readonly sort = signal<readonly PctTableSort<Key>[]>([]);
  /** Back to the first page whenever the order changes. */
  readonly page = linkedSignal({ source: this.sort, computation: () => 1 });
  readonly answer = resource({
    params: () => ({ page: this.page(), sort: this.sort() }),
    loader: ({ params }) => fetchPage(params.page, params.sort),
  });
  /** The last page answered, kept while the next one loads. */
  readonly answered = linkedSignal<Page | undefined, Page | undefined>({
    source: () => this.answer.value(),
    computation: (next, previous) => next ?? previous?.value,
  });
  readonly rows = computed(() => this.answered()?.rows ?? []);
  readonly total = computed(() => this.answered()?.total ?? 0);
  readonly offset = computed(() => ((this.answered()?.page ?? 1) - 1) * SIZE);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / SIZE)));
}
