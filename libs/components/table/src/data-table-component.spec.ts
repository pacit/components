import {
  ApplicationRef,
  Component,
  ErrorHandler,
  input,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import { PctCellTemplate } from './data-table-slots';
import { pctColumnsOf, type PctColumn } from './model/columns';

interface Socket {
  readonly id: number;
  readonly name: string;
  readonly state: 'on' | 'off';
  readonly live: boolean;
}

const SOCKETS: readonly Socket[] = [
  { id: 1, name: 'Kettle', state: 'on', live: true },
  { id: 2, name: 'Lamp', state: 'off', live: false },
];

/** Every input the table sets, each written into the cell. */
@Component({
  selector: 'x-state',
  template: `<b>{{ value() }}</b> {{ row().name }} #{{ index() }}
    {{ column().header }}`,
})
class StateCell {
  readonly value = input.required<'on' | 'off'>();
  readonly row = input.required<Socket>();
  readonly index = input.required<number>();
  readonly column = input.required<PctColumn<Socket, 'on' | 'off'>>();
}

/** One input of the four, and one of its own the table never sets. */
@Component({
  selector: 'x-live',
  template: `{{ value() ? 'Live' : 'Dead' }}{{ tone() }}`,
})
class LiveCell {
  readonly value = input(false);
  readonly tone = input('');
}

/** No input at all. */
@Component({ selector: 'x-mark', template: `•` })
class MarkCell {}

const col = pctColumnsOf<Socket>();
const drawn = col.of([
  col.key('name', { header: 'Name' }),
  col.key('state', { header: 'State', component: StateCell }),
  col.key('live', { header: 'Live', kind: 'boolean', component: LiveCell }),
  col.value('mark', () => '', { header: 'Mark', component: MarkCell }),
]);
const byId = (row: Socket) => row.id;

@Component({
  imports: [PctDataTable, PctCellTemplate],
  template: `
    <pct-data-table
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Sockets"
    >
      @if (slotted()) {
        <ng-template [pctCell]="columns" pctCellOf="state" let-value="value">
          <i>{{ value }}</i>
        </ng-template>
      }
    </pct-data-table>
  `,
})
class Host {
  readonly columns = drawn;
  readonly byId = byId;
  readonly rows = signal(SOCKETS);
  readonly slotted = signal(false);
}

const errors: unknown[] = [];

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(type);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const cells = (row: number) =>
  Array.from(
    document
      .querySelectorAll('pct-data-table tbody tr')
      [row].querySelectorAll('td'),
  );
const text = (cell: Element) =>
  (cell.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('PctDataTable — a column drawn by its component', () => {
  const globals = globalThis as { ResizeObserver?: unknown };

  beforeEach(() => {
    errors.length = 0;
    globals.ResizeObserver = class {
      observe(): void {
        // Nothing to observe in jsdom.
      }
      disconnect(): void {
        // Nothing to let go.
      }
    };
  });

  afterEach(() => {
    delete globals.ResizeObserver;
  });

  it('draws the cells with the component and sets the value, the row, the index and the column', async () => {
    await render(Host);
    expect(text(cells(0)[1])).toBe('on Kettle #0 State');
    expect(text(cells(1)[1])).toBe('off Lamp #1 State');
    expect(cells(0)[1].querySelector('x-state b')?.textContent).toBe('on');
    expect(errors).toEqual([]);
  });

  it('sets only the inputs the component declares, and none of its own', async () => {
    await render(Host);
    // A boolean column drawn by a component draws no check mark of its own.
    expect(text(cells(0)[2])).toBe('Live');
    expect(text(cells(1)[2])).toBe('Dead');
    expect(cells(0)[2].querySelector('pct-icon')).toBeNull();
    expect(text(cells(0)[3])).toBe('•');
    expect(cells(0)[3].querySelector('x-mark')).not.toBeNull();
    expect(errors).toEqual([]);
  });

  it('sets the new value on the same component when the row changes', async () => {
    const fixture = await render(Host);
    const before = cells(0)[1].querySelector('x-state');
    fixture.componentInstance.rows.set([
      { ...SOCKETS[0], state: 'off' },
      SOCKETS[1],
    ]);
    await settle(fixture);
    expect(text(cells(0)[1])).toBe('off Kettle #0 State');
    expect(cells(0)[1].querySelector('x-state')).toBe(before);
  });

  it('draws a pctCell template for the column in place of its component', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.slotted.set(true);
    await settle(fixture);
    expect(cells(0)[1].querySelector('x-state')).toBeNull();
    expect(cells(0)[1].querySelector('i')?.textContent).toBe('on');
    // The other columns keep their components.
    expect(cells(0)[2].querySelector('x-live')).not.toBeNull();
  });
});
