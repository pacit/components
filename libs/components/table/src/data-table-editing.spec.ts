import {
  ApplicationRef,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import {
  PctEditorTemplate,
  PctTableEditing,
  type PctTableEdit,
} from './data-table-editing';
import {
  PctTableGrid,
  type PctTableDataCell,
  type PctTableGridCell,
} from './data-table-grid';
import { PctTableColumns } from './data-table-columns';
import { pctColumnsOf, type PctColumns } from './model/columns';
import type { PctTableLayout } from './model/layout';

interface Device {
  id: number;
  name: string;
  room: string;
  power: number | null;
  on: boolean;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room' }),
  col.key('power', {
    header: 'Power',
    kind: { number: { unit: 'W', fractionDigits: [0, 1] } },
  }),
  col.key('on', { header: 'On', kind: 'boolean' }),
]);
type Map = typeof columns extends PctColumns<Device, infer M> ? M : never;
type Id = keyof Map & string;
const byId = (device: Device) => device.id;
const DEVICES: Device[] = [
  { id: 1, name: 'Lamp', room: 'Kitchen', power: 12, on: true },
  { id: 2, name: 'Boiler', room: 'Cellar', power: 1900, on: false },
  { id: 3, name: 'Fan', room: 'Attic', power: 40, on: true },
];

@Component({
  imports: [PctDataTable, PctTableGrid, PctTableEditing, PctEditorTemplate],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [(focused)]="focused"
      [pctTableEditing]="columns"
      [editable]="editable()"
      [rowEdit]="whole()"
      [history]="keep()"
      [(editing)]="editing"
      (edit)="apply($event)"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template
        [pctEditor]="columns"
        pctEditorOf="room"
        let-value="value"
        let-invalid="invalid"
      >
        <select
          class="rooms"
          aria-label="Room"
          [value]="value()"
          (change)="pick(value, invalid, $event)"
        >
          <option value="Kitchen">Kitchen</option>
          <option value="Cellar">Cellar</option>
          <option value="Attic">Attic</option>
          <option value="Nowhere">Nowhere</option>
        </select>
      </ng-template>
    </pct-data-table>
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly editing$ = viewChild.required(PctTableEditing<Device, Map>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal(DEVICES);
  readonly editable = signal<
    readonly Id[] | ((row: Device, id: Id) => boolean)
  >(['name', 'room', 'power']);
  readonly whole = signal(false);
  readonly keep = signal(20);
  readonly editing = signal<PctTableDataCell<Id> | null>(null);
  readonly focused = signal<PctTableGridCell<Id> | null>(null);
  readonly edits: PctTableEdit<Device, Map>[] = [];

  apply(edit: PctTableEdit<Device, Map>): void {
    this.edits.push(edit);
    this.rows.update((rows) =>
      rows.map((row) =>
        row.id === edit.id
          ? edit.changes.reduce<Device>(
              (one, change) => ({ ...one, [change.column]: change.value }),
              row,
            )
          : row,
      ),
    );
  }

  pick(
    value: WritableSignal<string>,
    invalid: WritableSignal<boolean>,
    event: Event,
  ): void {
    const picked = (event.target as HTMLSelectElement).value;
    value.set(picked);
    invalid.set(picked === 'Nowhere');
  }
}

/** A layout the user hid a column in, and an editor whose popup the page draws outside. */
@Component({
  imports: [
    PctDataTable,
    PctTableGrid,
    PctTableEditing,
    PctEditorTemplate,
    PctTableColumns,
  ],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [pctTableEditing]="columns"
      [editable]="['name', 'room', 'power']"
      [rowEdit]="whole()"
      [pctTableColumns]="columns"
      [layout]="layout()"
      (edit)="edits.push($event)"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template
        [pctEditor]="columns"
        pctEditorOf="room"
        let-value="value"
        let-commit="commit"
        let-cancel="cancel"
      >
        <button
          type="button"
          class="choose"
          aria-controls="rooms"
          (click)="value.set('Attic')"
        >
          {{ value() }}
        </button>
        <button type="button" class="done" (click)="commit()">Done</button>
        <button type="button" class="drop" (click)="cancel()">Drop</button>
      </ng-template>
    </pct-data-table>
    <div id="rooms"><button type="button" class="attic">Attic</button></div>
    <button type="button" class="elsewhere">Elsewhere</button>
  `,
})
class Laid {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly whole = signal(false);
  readonly layout = signal<PctTableLayout<Id>>({});
  readonly edits: PctTableEdit<Device, Map>[] = [];
}

let errors: unknown[] = [];
let warnings: unknown[][] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  const inert = class {
    observe(): void {
      // Nothing to observe in jsdom.
    }
    unobserve(): void {
      // Nothing to let go.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  globals.ResizeObserver = inert;
  globals.IntersectionObserver = inert;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 0,
    height: 20,
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
  } as DOMRect);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
  // jsdom scrolls nothing: the table's scroll to a row is a call to read back.
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args);
  });
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
  const seen = errors;
  errors = [];
  warnings = [];
  expect(seen).toEqual([]);
});

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

const table = () =>
  document.querySelector('pct-data-table table') as HTMLTableElement;
/** The cell of a row, counted from 1 under the header, in a column by its place. */
const cell = (line: number, c: number) =>
  table().rows[line].cells[c] as HTMLTableCellElement;
const active = () => document.activeElement as HTMLElement;
const editors = () =>
  Array.from(table().querySelectorAll<HTMLElement>('[data-pct-part="editor"]'));

/** A key pressed on the element with the focus. */
async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  init: KeyboardEventInit = {},
  target: Element = active(),
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  await settle(fixture);
  return event;
}

/** Text typed into the field with the focus, as the browser hands it over. */
async function type(
  fixture: ComponentFixture<unknown>,
  text: string,
): Promise<void> {
  const field = active() as HTMLInputElement;
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

/** The stop on a cell, by a click's focus. */
async function stopOn(
  fixture: ComponentFixture<unknown>,
  line: number,
  c: number,
): Promise<HTMLTableCellElement> {
  cell(line, c).focus();
  await settle(fixture);
  return cell(line, c);
}

describe('PctTableEditing — a cell edited in place', () => {
  it('opens a text field on Enter, with the focus and the caret after the text', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    const event = await press(fixture, 'Enter');
    expect(event.defaultPrevented).toBe(true);
    expect(editors()).toHaveLength(1);
    const editor = editors()[0];
    expect(cell(1, 0).contains(editor)).toBe(true);
    expect(editor.getAttribute('data-pct-column')).toBe('name');
    const field = active() as HTMLInputElement;
    expect(editor.contains(field)).toBe(true);
    expect(field.classList).toContain('pct-text');
    expect(field.value).toBe('Lamp');
    expect(field.getAttribute('aria-label')).toBe('Edit Name');
    expect(field.selectionStart).toBe(4);
    expect(field.selectionEnd).toBe(4);
    // The field is in the tab order of the cell it stands in.
    expect(field.hasAttribute('tabindex')).toBe(false);
    expect(host.editing()).toEqual({ row: 1, column: 'name' });
    expect(host.edits).toEqual([]);
  });

  it('opens on F2 too, and on a double press under the pointer', async () => {
    const fixture = await render(Host);
    await stopOn(fixture, 2, 0);
    await press(fixture, 'F2');
    expect(editors()).toHaveLength(1);
    expect(cell(2, 0).contains(active())).toBe(true);
    await press(fixture, 'Escape');
    const event = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
    });
    cell(3, 0).dispatchEvent(event);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(cell(3, 0).contains(active())).toBe(true);
    expect(fixture.componentInstance.editing()).toEqual({
      row: 3,
      column: 'name',
    });
  });

  it('lets the draft go on Escape: nothing is proposed, the stop stays on the cell', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    const event = await press(fixture, 'Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(editors()).toEqual([]);
    expect(host.edits).toEqual([]);
    expect(host.editing()).toBeNull();
    expect(active()).toBe(cell(1, 0));
    expect(cell(1, 0).textContent?.trim()).toBe('Lamp');
    // The keys move the stop again: the cell is not one stepped into.
    await press(fixture, 'ArrowDown');
    expect(active()).toBe(cell(2, 0));
  });

  it('commits on Enter, a proposal the application applies, and the stop goes a row down', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    await press(fixture, 'Enter');
    expect(host.edits).toEqual([
      {
        id: 1,
        row: DEVICES[0],
        changes: [{ column: 'name', value: 'Desk lamp', previous: 'Lamp' }],
        cause: 'edit',
      },
    ]);
    expect(editors()).toEqual([]);
    expect(host.editing()).toBeNull();
    expect(cell(1, 0).textContent?.trim()).toBe('Desk lamp');
    expect(active()).toBe(cell(2, 0));
    expect(host.focused()).toEqual({ row: 2, column: 'name' });
  });

  it('goes a row up on Shift+Enter, and stays on the last row at its end', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 2, 0);
    await press(fixture, 'Enter');
    await press(fixture, 'Enter', { shiftKey: true });
    expect(active()).toBe(cell(1, 0));
    await stopOn(fixture, 3, 0);
    await press(fixture, 'Enter');
    await press(fixture, 'Enter');
    expect(active()).toBe(cell(3, 0));
    // Shift+Enter on a cell opens nothing.
    const event = await press(fixture, 'Enter', { shiftKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
    expect(host.edits).toEqual([]);
  });

  it('proposes no edit that changed nothing', async () => {
    const fixture = await render(Host);
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Lamp');
    await press(fixture, 'Enter');
    expect(fixture.componentInstance.edits).toEqual([]);
  });

  it('commits on Tab and goes to the next cell, Shift+Tab to the one before; the ends hold', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    // Tab and Enter with a command key are not the editor's.
    for (const init of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
    ]) {
      expect((await press(fixture, 'Tab', init)).defaultPrevented).toBe(false);
      expect((await press(fixture, 'Enter', init)).defaultPrevented).toBe(
        false,
      );
    }
    expect(editors()).toHaveLength(1);
    expect(host.edits).toEqual([]);
    const event = await press(fixture, 'Tab');
    expect(event.defaultPrevented).toBe(true);
    expect(host.edits.map((edit) => edit.changes)).toEqual([
      [{ column: 'name', value: 'Desk lamp', previous: 'Lamp' }],
    ]);
    expect(active()).toBe(cell(1, 1));
    await press(fixture, 'Enter');
    await press(fixture, 'Tab', { shiftKey: true });
    expect(active()).toBe(cell(1, 0));
    await press(fixture, 'Enter');
    await press(fixture, 'Tab', { shiftKey: true });
    expect(active()).toBe(cell(1, 0));
    await stopOn(fixture, 1, 2);
    await press(fixture, 'Enter');
    await press(fixture, 'Tab');
    expect(active()).toBe(cell(1, 3));
  });

  it('opens with what was typed: a letter in a text, a digit in a number, nothing else', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    const letter = await press(fixture, 'D');
    expect(letter.defaultPrevented).toBe(true);
    expect((active() as HTMLInputElement).value).toBe('D');
    expect((active() as HTMLInputElement).selectionStart).toBe(1);
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'name', value: 'D', previous: 'Lamp' },
    ]);
    // A space, on a text as on a number, is the grid's.
    await stopOn(fixture, 2, 0);
    expect((await press(fixture, ' ')).defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
    await stopOn(fixture, 1, 2);
    expect((await press(fixture, 'x')).defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
    // A letter with a command key is the grid's.
    expect(
      (await press(fixture, 'c', { ctrlKey: true })).defaultPrevented,
    ).toBe(false);
    expect((await press(fixture, 'c', { altKey: true })).defaultPrevented).toBe(
      false,
    );
    expect(editors()).toEqual([]);
    await press(fixture, '7');
    // As typed: a draft of 7 written with no fraction digits it was not given.
    expect((active() as HTMLInputElement).value).toBe('7');
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'power', value: 7, previous: 12 },
    ]);
    // A template's editor takes no letter: what it would mean is the template's.
    await stopOn(fixture, 1, 1);
    expect((await press(fixture, 'K')).defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
  });

  it('keeps every key typed before the editor has the focus', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    const keys = (td: Element, text: string) =>
      [...text].map((key) => {
        const event = new KeyboardEvent('keydown', {
          key: key === '\n' ? 'Enter' : key,
          bubbles: true,
          cancelable: true,
        });
        td.dispatchEvent(event);
        return event.defaultPrevented;
      });
    expect(keys(cell(1, 0), 'Desk')).toEqual([true, true, true, true]);
    await settle(fixture);
    expect((active() as HTMLInputElement).value).toBe('Desk');
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'name', value: 'Desk', previous: 'Lamp' },
    ]);
    await stopOn(fixture, 1, 2);
    // A number goes on with what it is written with, and with nothing else.
    expect(keys(cell(1, 2), '72.5x')).toEqual([true, true, true, true, false]);
    await settle(fixture);
    expect((active() as HTMLInputElement).value).toBe('72.5');
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'power', value: 72.5, previous: 12 },
    ]);
    // Typed straight after Enter: the text goes on after the value it opened.
    await stopOn(fixture, 3, 0);
    expect(keys(cell(3, 0), '\ns')).toEqual([true, true]);
    await settle(fixture);
    expect((active() as HTMLInputElement).value).toBe('Fans');
    await press(fixture, 'Escape');
    // A number's value is its field's to write: a key so soon is let go.
    await stopOn(fixture, 3, 2);
    expect(keys(cell(3, 2), '\n7')).toEqual([true, false]);
    await settle(fixture);
    expect((active() as HTMLInputElement).value).toBe('40');
  });

  it('types a character of AltGr, and leaves a key an input method is composing to it', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    const composing = await press(fixture, '€', { isComposing: true });
    expect(composing.defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
    // Windows says AltGr as Ctrl and Alt both.
    const letter = await press(fixture, '€', {
      ctrlKey: true,
      altKey: true,
      modifierAltGraph: true,
    });
    expect(letter.defaultPrevented).toBe(true);
    expect((active() as HTMLInputElement).value).toBe('€');
    const picked = await press(fixture, 'Enter', { isComposing: true });
    expect(picked.defaultPrevented).toBe(false);
    expect(editors()).toHaveLength(1);
    expect(host.edits).toEqual([]);
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'name', value: '€', previous: 'Lamp' },
    ]);
  });

  it('lets the draft go when its row leaves the table, and proposes nothing for it later', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    host.rows.set(DEVICES.slice(1));
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.editing()).toBeNull();
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Heater');
    await press(fixture, 'Enter');
    expect(host.edits.map((edit) => edit.id)).toEqual([2]);
  });

  it("edits a number in a number field of its kind's fraction digits, and an empty one is null", async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 2, 2);
    await press(fixture, 'Enter');
    const field = active() as HTMLInputElement;
    expect(field.getAttribute('role')).toBe('spinbutton');
    expect(field.getAttribute('aria-label')).toBe('Edit Power');
    // The field rounds its text as it gives the focus back, before the commit reads it.
    await type(fixture, '1950.25');
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'power', value: 1950.3, previous: 1900 },
    ]);
    await stopOn(fixture, 2, 2);
    await press(fixture, 'Enter');
    await type(fixture, '3.14159');
    await press(fixture, 'Tab');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'power', value: 3.1, previous: 1950.3 },
    ]);
    await stopOn(fixture, 1, 2);
    await press(fixture, 'Enter');
    await type(fixture, '');
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'power', value: null, previous: 12 },
    ]);
  });

  it("edits a column in the consumer's template on a draft, and keeps a draft it refuses", async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 1);
    await press(fixture, 'Enter');
    const select = active() as HTMLSelectElement;
    expect(select.classList).toContain('rooms');
    expect(select.value).toBe('Kitchen');
    select.value = 'Nowhere';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    await press(fixture, 'Enter');
    // Refused: the editor stays, with the focus, and nothing leaves.
    expect(host.edits).toEqual([]);
    expect(editors()).toHaveLength(1);
    expect(active()).toBe(select);
    await press(fixture, 'Tab');
    expect(host.edits).toEqual([]);
    expect(active()).toBe(select);
    // The focus taken elsewhere is the user's: the editor waits, and takes it back for nothing.
    cell(3, 0).focus();
    await settle(fixture);
    expect(active()).toBe(cell(3, 0));
    expect(editors()).toHaveLength(1);
    expect(host.edits).toEqual([]);
    select.focus();
    await settle(fixture);
    // Escape lets even a refused draft go.
    await press(fixture, 'Escape');
    expect(editors()).toEqual([]);
    expect(active()).toBe(cell(1, 1));
    await press(fixture, 'Enter');
    const again = active() as HTMLSelectElement;
    expect(again.value).toBe('Kitchen');
    again.value = 'Attic';
    again.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    await press(fixture, 'Enter');
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'room', value: 'Attic', previous: 'Kitchen' },
    ]);
  });

  it('commits when the focus leaves the editor for another cell', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    // A commit first, which hands the focus back to its cell: the next leaving is heard.
    await stopOn(fixture, 2, 0);
    await press(fixture, 'Enter');
    await press(fixture, 'F2');
    expect(host.focused()).toEqual({ row: 2, column: 'name' });
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    cell(3, 1).focus();
    await settle(fixture);
    expect(host.edits.at(-1)?.changes).toEqual([
      { column: 'name', value: 'Desk lamp', previous: 'Lamp' },
    ]);
    expect(editors()).toEqual([]);
    expect(active()).toBe(cell(3, 1));
  });

  it('commits when the focus goes nowhere, the page keeping it, and waits while the window has gone', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    // Another window: the focus comes back where it was, and the editor waits for it.
    const away = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    active().blur();
    await settle(fixture);
    expect(editors()).toHaveLength(1);
    expect(host.edits).toEqual([]);
    away.mockReturnValue(true);
    const field = editors()[0].querySelector('input') as HTMLInputElement;
    field.focus();
    // A press on the page's text: the page has the focus, and the edit is committed.
    field.blur();
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.edits.map((edit) => edit.changes)).toEqual([
      [{ column: 'name', value: 'Desk lamp', previous: 'Lamp' }],
    ]);
    expect(active()).toBe(document.body);
  });

  it('commits the row open when the model names another cell, and lets a refused one go', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    host.editing.set({ row: 2, column: 'name' });
    await settle(fixture);
    expect(host.edits.map((edit) => edit.changes)).toEqual([
      [{ column: 'name', value: 'Desk lamp', previous: 'Lamp' }],
    ]);
    expect(cell(2, 0).contains(active())).toBe(true);
    await press(fixture, 'Escape');
    await stopOn(fixture, 1, 1);
    await press(fixture, 'Enter');
    const select = active() as HTMLSelectElement;
    select.value = 'Nowhere';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    host.editing.set({ row: 3, column: 'name' });
    await settle(fixture);
    expect(host.edits).toHaveLength(1);
    expect(editors().map((one) => one.dataset['pctColumn'])).toEqual(['name']);
    expect(cell(3, 0).contains(active())).toBe(true);
  });

  it('opens nothing on a cell that may not be edited, which keeps the grid its keys', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.editable.set((row, id) => row.id !== 2 && id === 'name');
    await settle(fixture);
    await stopOn(fixture, 2, 0);
    expect((await press(fixture, 'Enter')).defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
    await stopOn(fixture, 1, 2);
    expect((await press(fixture, 'Enter')).defaultPrevented).toBe(false);
    await stopOn(fixture, 1, 0);
    expect((await press(fixture, 'Enter')).defaultPrevented).toBe(true);
    expect(editors()).toHaveLength(1);
  });

  it('warns once of an editable column that has no editor, and opens nothing on it', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.editable.set(['on']);
    await settle(fixture);
    await stopOn(fixture, 1, 3);
    await press(fixture, 'Enter');
    await press(fixture, 'Enter');
    expect(editors()).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual([
      '[pctTableEditing] The column "on" is editable and has no editor: a column of a number ' +
        'kind, or of text whose values are strings, is edited in a field of its own, and any ' +
        'other needs a pctEditor template.',
    ]);
  });

  it('opens the cell the model names, and closes it when the model is cleared', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.editing.set({ row: 3, column: 'power' });
    await settle(fixture);
    // Its row is scrolled to, which a window may not have drawn.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(editors()).toHaveLength(1);
    expect(cell(3, 2).contains(active())).toBe(true);
    await type(fixture, '41');
    host.editing.set(null);
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.edits).toEqual([]);
    // A cell that may not be edited is no cell to open: the model says so.
    host.editing.set({ row: 1, column: 'on' });
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.editing()).toBeNull();
    host.editing.set({ row: 99, column: 'name' });
    await settle(fixture);
    expect(host.editing()).toBeNull();
  });

  it('a double press in an editor is its own: the text is selected, nothing reopens', async () => {
    const fixture = await render(Host);
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    const event = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
    });
    active().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('PctTableEditing — the columns drawn, and a popup outside', () => {
  it('steps over a column the user hid: Tab goes to the next one drawn, a row opens without it', async () => {
    const fixture = await render(Laid);
    const host = fixture.componentInstance;
    host.layout.set({ hidden: ['room'] });
    await settle(fixture);
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await press(fixture, 'Tab');
    expect(table().tHead?.rows[0].cells[1].dataset['pctColumn']).toBe('power');
    expect(active()).toBe(cell(1, 1));
    host.whole.set(true);
    await settle(fixture);
    await press(fixture, 'Enter');
    expect(editors().map((one) => one.dataset['pctColumn'])).toEqual([
      'name',
      'power',
    ]);
    expect(cell(1, 1).contains(active())).toBe(true);
  });

  it('keeps an editor open while the focus is in a popup its control owns, and commits as it leaves it', async () => {
    const fixture = await render(Laid);
    const host = fixture.componentInstance;
    await stopOn(fixture, 1, 1);
    await press(fixture, 'Enter');
    const choose = active();
    expect(choose.classList).toContain('choose');
    choose.click();
    const attic = document.querySelector('.attic') as HTMLElement;
    attic.focus();
    await settle(fixture);
    expect(editors()).toHaveLength(1);
    expect(host.edits).toEqual([]);
    // Within the popup, and back to its control: still the editor's.
    choose.focus();
    attic.focus();
    await settle(fixture);
    expect(editors()).toHaveLength(1);
    (document.querySelector('.elsewhere') as HTMLElement).focus();
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.edits.map((edit) => edit.changes)).toEqual([
      [{ column: 'room', value: 'Attic', previous: 'Kitchen' }],
    ]);
    // A popup no longer heard: the focus leaving it again commits nothing twice.
    attic.focus();
    (document.querySelector('.elsewhere') as HTMLElement).focus();
    await settle(fixture);
    expect(host.edits).toHaveLength(1);
  });
});

describe("PctTableEditing — a template's own ends", () => {
  it("commits on the template's commit(), and lets the draft go on its cancel()", async () => {
    const fixture = await render(Laid);
    const host = fixture.componentInstance;
    const button = (name: string) =>
      table().querySelector(`.${name}`) as HTMLElement;
    await stopOn(fixture, 1, 1);
    await press(fixture, 'Enter');
    button('choose').click();
    button('drop').click();
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.edits).toEqual([]);
    await press(fixture, 'Enter');
    button('choose').click();
    button('done').click();
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.edits.map((edit) => edit.changes)).toEqual([
      [{ column: 'room', value: 'Attic', previous: 'Kitchen' }],
    ]);
  });
});

describe('PctTableEditing — a whole row', () => {
  it('opens every editable cell of the row; Tab moves among them, the last commits them in one edit', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.whole.set(true);
    await settle(fixture);
    await stopOn(fixture, 1, 2);
    await press(fixture, 'Enter');
    expect(editors().map((one) => one.dataset['pctColumn'])).toEqual([
      'name',
      'room',
      'power',
    ]);
    // The focus in the cell the stop was on.
    expect(cell(1, 2).contains(active())).toBe(true);
    expect(host.editing()).toEqual({ row: 1, column: 'power' });
    await type(fixture, '15');
    await press(fixture, 'Tab', { shiftKey: true });
    expect(cell(1, 1).contains(active())).toBe(true);
    expect(host.editing()).toEqual({ row: 1, column: 'room' });
    await press(fixture, 'Tab', { shiftKey: true });
    await type(fixture, 'Desk lamp');
    expect(host.edits).toEqual([]);
    await press(fixture, 'Tab');
    await press(fixture, 'Tab');
    await press(fixture, 'Tab');
    expect(host.edits).toEqual([
      {
        id: 1,
        row: DEVICES[0],
        changes: [
          { column: 'name', value: 'Desk lamp', previous: 'Lamp' },
          { column: 'power', value: 15, previous: 12 },
        ],
        cause: 'edit',
      },
    ]);
    expect(editors()).toEqual([]);
    expect(active()).toBe(cell(1, 3));
  });

  it('lets the whole row go on Escape', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.whole.set(true);
    await settle(fixture);
    await stopOn(fixture, 2, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Heater');
    await press(fixture, 'Tab');
    await press(fixture, 'Tab');
    await type(fixture, '2000');
    await press(fixture, 'Escape');
    expect(host.edits).toEqual([]);
    expect(editors()).toEqual([]);
    expect(active()).toBe(cell(2, 2));
  });

  it('opens on the first editable cell when the stop is on another', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.whole.set(true);
    await settle(fixture);
    await stopOn(fixture, 3, 3);
    await press(fixture, 'Enter');
    expect(editors()).toHaveLength(3);
    expect(cell(3, 0).contains(active())).toBe(true);
    // A letter types into the cell under the stop only.
    await press(fixture, 'Escape');
    await stopOn(fixture, 3, 3);
    expect((await press(fixture, 'q')).defaultPrevented).toBe(false);
    expect(editors()).toEqual([]);
  });
});

describe('PctTableEditing — undo', () => {
  async function edited(): Promise<ComponentFixture<Host>> {
    const fixture = await render(Host);
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Desk lamp');
    await press(fixture, 'Enter');
    return fixture;
  }

  it('asks for the last edit back on Ctrl+Z, and again on Ctrl+Shift+Z', async () => {
    const fixture = await edited();
    const host = fixture.componentInstance;
    const editing = host.editing$();
    expect(editing.canUndo()).toBe(true);
    expect(editing.canRedo()).toBe(false);
    const undo = await press(fixture, 'z', { ctrlKey: true });
    expect(undo.defaultPrevented).toBe(true);
    expect(host.edits.at(-1)).toEqual({
      id: 1,
      row: { ...DEVICES[0], name: 'Desk lamp' },
      changes: [{ column: 'name', value: 'Lamp', previous: 'Desk lamp' }],
      cause: 'undo',
    });
    expect(cell(1, 0).textContent?.trim()).toBe('Lamp');
    // The stop goes to the cell the edit changed.
    expect(active()).toBe(cell(1, 0));
    expect(editing.canUndo()).toBe(false);
    expect(editing.canRedo()).toBe(true);
    await press(fixture, 'Z', { ctrlKey: true, shiftKey: true });
    expect(host.edits.at(-1)).toEqual({
      id: 1,
      row: DEVICES[0],
      changes: [{ column: 'name', value: 'Desk lamp', previous: 'Lamp' }],
      cause: 'redo',
    });
    expect(cell(1, 0).textContent?.trim()).toBe('Desk lamp');
    await press(fixture, 'z', { metaKey: true });
    await press(fixture, 'y', { ctrlKey: true });
    expect(host.edits.map((edit) => edit.cause)).toEqual([
      'edit',
      'undo',
      'redo',
      'undo',
      'redo',
    ]);
    // With nothing to ask back, the key does nothing.
    await press(fixture, 'y', { ctrlKey: true });
    expect(host.edits).toHaveLength(5);
  });

  it('forgets what was undone once a new edit is made, and keeps only `history` edits', async () => {
    const fixture = await edited();
    const host = fixture.componentInstance;
    const editing = host.editing$();
    editing.undo();
    await settle(fixture);
    await stopOn(fixture, 2, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Heater');
    await press(fixture, 'Enter');
    expect(editing.canRedo()).toBe(false);
    host.keep.set(1);
    await settle(fixture);
    await stopOn(fixture, 3, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Fan 2');
    await press(fixture, 'Enter');
    editing.undo();
    editing.undo();
    await settle(fixture);
    // The first undo asked row 1 back; of the two edits since, only the last was kept.
    expect(
      host.edits.filter((edit) => edit.cause === 'undo').map((edit) => edit.id),
    ).toEqual([1, 3]);
    host.keep.set(0);
    await settle(fixture);
    await stopOn(fixture, 1, 0);
    await press(fixture, 'Enter');
    await type(fixture, 'Lamp 2');
    await press(fixture, 'Enter');
    expect(editing.canUndo()).toBe(false);
  });

  it("leaves Ctrl+Z to a field of the consumer's, and undoes nothing it did not edit", async () => {
    const fixture = await edited();
    const host = fixture.componentInstance;
    // In the editor, the key is the field's own.
    await stopOn(fixture, 2, 0);
    await press(fixture, 'Enter');
    const inField = await press(fixture, 'z', { ctrlKey: true });
    expect(inField.defaultPrevented).toBe(false);
    await press(fixture, 'Escape');
    // With Alt, it is no command of the grid's.
    expect(
      (await press(fixture, 'z', { ctrlKey: true, altKey: true }))
        .defaultPrevented,
    ).toBe(false);
    expect(host.edits.map((edit) => edit.cause)).toEqual(['edit']);
  });

  it('lets a draft open go before it asks an edit back', async () => {
    const fixture = await edited();
    const host = fixture.componentInstance;
    host.editing.set({ row: 3, column: 'name' });
    await settle(fixture);
    await type(fixture, 'Fan 2');
    host.editing$().undo();
    await settle(fixture);
    expect(editors()).toEqual([]);
    expect(host.edits.map((edit) => edit.cause)).toEqual(['edit', 'undo']);
  });
});

describe('PctTableEditing — what it needs', () => {
  it('throws without pctTableGrid, naming it', async () => {
    @Component({
      imports: [PctDataTable, PctTableEditing],
      template: `<pct-data-table
        [pctTableEditing]="columns"
        [editable]="['name']"
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Gridless {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    await expect(render(Gridless)).rejects.toThrow(/needs pctTableGrid/);
  });

  it('draws none of its parts in a table that edits nothing', async () => {
    @Component({
      imports: [PctDataTable, PctTableGrid],
      template: `<pct-data-table
        [pctTableGrid]="columns"
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Plain {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    const fixture = await render(Plain);
    expect(
      fixture.nativeElement.querySelector('pct-data-table > ng-component'),
    ).toBeNull();
    await stopOn(fixture, 1, 0);
    expect((await press(fixture, 'Enter')).defaultPrevented).toBe(false);
  });
});
