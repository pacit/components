import {
  ApplicationRef,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, minLength, required } from '@angular/forms/signals';
import { pctWarn } from '@pacit/components/core';
import { PctDataTable } from './data-table';
import { PctTableDetails } from './data-table-details';
import { PctTableGroups } from './data-table-groups';
import { PctTableSelection } from './data-table-selection';
import { PctCellTemplate, PctDetailsTemplate } from './data-table-slots';
import { pctColumnsOf, type PctRowId } from './model/columns';

interface Device {
  id: number;
  name: string;
  room: string;
  on: boolean;
  power: number;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room' }),
  col.key('power', { header: 'Power', aggregate: 'sum' }),
]);
const byId = (device: Device) => device.id;
const DEVICES: Device[] = [
  { id: 1, name: 'Lamp', room: 'Kitchen', on: true, power: 12 },
  { id: 2, name: 'Boiler', room: 'Kitchen', on: false, power: 1900 },
  { id: 3, name: 'Sensor', room: 'Hall', on: true, power: 1 },
  { id: 4, name: 'Fan', room: 'Hall', on: false, power: 40 },
];

@Component({
  imports: [PctDataTable, PctTableSelection],
  template: `
    <pct-data-table
      pctTableSelection
      [(value)]="value"
      [mode]="mode()"
      [disabled]="off()"
      [readonly]="held()"
      [name]="name()"
      [required]="needed()"
      [hint]="hint()"
      (touch)="touches = touches + 1"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
      [(filter)]="filter"
    />
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly selection = viewChild.required(PctTableSelection);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal<readonly Device[]>(DEVICES);
  readonly value = signal<readonly PctRowId[]>([]);
  readonly mode = signal<'single' | 'multiple'>('multiple');
  readonly off = signal(false);
  readonly held = signal(false);
  readonly name = signal('');
  readonly needed = signal(false);
  readonly hint = signal('');
  readonly filter = signal('');
  touches = 0;
}

/** Every error the application's handler was given: an effect that throws fails its case. */
let errors: unknown[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  const inert = class {
    observe(): void {
      // Nothing to observe in jsdom.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  globals.ResizeObserver = inert;
  globals.IntersectionObserver = inert;
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  expect(errors).toEqual([]);
  errors = [];
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
}

const all = () =>
  document.querySelector(
    '[data-pct-part="select-all"]',
  ) as HTMLInputElement | null;
const picks = () =>
  Array.from(
    document.querySelectorAll<HTMLInputElement>('[data-pct-part="select"]'),
  );
const rows = () =>
  Array.from(
    document.querySelectorAll<HTMLTableRowElement>(
      'tbody > tr:not([data-pct-part])',
    ),
  );
const table = () => document.querySelector('table') as HTMLTableElement;

async function press(
  fixture: ComponentFixture<unknown>,
  input: HTMLInputElement,
  shiftKey = false,
): Promise<void> {
  // The click's activation toggles a checkbox, or checks a radio, before it is handled.
  input.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey }),
  );
  await settle(fixture);
}

describe('PctTableSelection — the rows picked', () => {
  it('leads every row with a checkbox named by the word and the row’s first text', async () => {
    await render(Host);
    const [lamp] = picks();
    expect(picks()).toHaveLength(4);
    expect(lamp.type).toBe('checkbox');
    const [word, name] = (lamp.getAttribute('aria-labelledby') as string).split(
      ' ',
    );
    expect(document.getElementById(word)?.textContent?.trim()).toBe('Select');
    expect(document.getElementById(word)?.hidden).toBe(true);
    const cell = document.getElementById(name) as HTMLElement;
    expect(cell.textContent?.trim()).toBe('Lamp');
    expect(cell.closest('tr')).toBe(rows()[0]);
    // The checkbox's cell comes first; the label around it is the target.
    expect(rows()[0].cells[0].contains(lamp)).toBe(true);
    expect(lamp.parentElement?.tagName).toBe('LABEL');
    expect(all()?.getAttribute('aria-label')).toBe('Select all rows');
  });

  it('picks and drops a row, and marks it on its line', async () => {
    const fixture = await render(Host);
    await press(fixture, picks()[1]);
    expect(fixture.componentInstance.value()).toEqual([2]);
    expect(rows()[1].hasAttribute('data-pct-selected')).toBe(true);
    expect(rows()[0].hasAttribute('data-pct-selected')).toBe(false);
    await press(fixture, picks()[1]);
    expect(fixture.componentInstance.value()).toEqual([]);
    expect(rows()[1].hasAttribute('data-pct-selected')).toBe(false);
  });

  it('draws the value it is given', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set([3]);
    await settle(fixture);
    expect(picks().map((input) => input.checked)).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it('with Shift picks every row drawn between the last pressed and this one, and drops them', async () => {
    const fixture = await render(Host);
    await press(fixture, picks()[3]);
    await press(fixture, picks()[1], true);
    expect(fixture.componentInstance.value()).toEqual([4, 2, 3]);
    // Upwards too, and an unchecking press drops the range.
    await press(fixture, picks()[3], true);
    expect(fixture.componentInstance.value()).toEqual([]);
    // Without Shift a press is one row, however far from the last.
    await press(fixture, picks()[0]);
    await press(fixture, picks()[3]);
    expect(fixture.componentInstance.value()).toEqual([1, 4]);
  });

  it('with Shift and no row pressed before picks the one row', async () => {
    const fixture = await render(Host);
    await press(fixture, picks()[2], true);
    expect(fixture.componentInstance.value()).toEqual([3]);
  });

  it('with Shift after a row the filter took away picks the one row', async () => {
    const fixture = await render(Host);
    await press(fixture, picks()[0]);
    fixture.componentInstance.filter.set('Hall');
    await settle(fixture);
    await press(fixture, picks()[1], true);
    expect(fixture.componentInstance.value()).toEqual([1, 4]);
  });

  it('heads the column with a checkbox clear, mixed or checked over the rows the filter left', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    expect([all()?.checked, all()?.indeterminate]).toEqual([false, false]);
    host.value.set([1]);
    await settle(fixture);
    expect([all()?.checked, all()?.indeterminate]).toEqual([false, true]);
    // A row the filter hides is not counted: the one left is picked.
    host.filter.set('Lamp');
    await settle(fixture);
    expect([all()?.checked, all()?.indeterminate]).toEqual([true, false]);
    // Nothing left: clear.
    host.filter.set('nothing at all');
    await settle(fixture);
    expect([all()?.checked, all()?.indeterminate]).toEqual([false, false]);
  });

  it('picks with the header every row the filter left, keeping the rest, and drops them again', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.value.set([2]);
    host.filter.set('Hall');
    await settle(fixture);
    await press(fixture, all() as HTMLInputElement);
    expect(host.value()).toEqual([2, 3, 4]);
    await press(fixture, all() as HTMLInputElement);
    expect(host.value()).toEqual([2]);
  });

  it('a mixed header picks the rest', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set([3]);
    await settle(fixture);
    await press(fixture, all() as HTMLInputElement);
    expect(fixture.componentInstance.value()).toEqual([3, 1, 2, 4]);
  });

  it('keeps the ids of rows the filter hides and of rows that went', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.value.set([1, 4]);
    host.filter.set('Lamp');
    await settle(fixture);
    host.rows.set(DEVICES.slice(0, 2));
    await settle(fixture);
    expect(host.value()).toEqual([1, 4]);
    expect(rows()[0].hasAttribute('data-pct-selected')).toBe(true);
  });

  it('selectAll adds the rows the filter left, and clear empties the list', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.value.set([1]);
    host.filter.set('Hall');
    await settle(fixture);
    host.selection().selectAll();
    expect(host.value()).toEqual([1, 3, 4]);
    host.selection().selectAll();
    expect(host.value()).toEqual([1, 3, 4]);
    host.selection().clear();
    expect(host.value()).toEqual([]);
  });

  it('picks one row with a radio in single mode, and selectAll picks nothing', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.mode.set('single');
    await settle(fixture);
    expect(all()).toBeNull();
    const radios = picks();
    expect(radios.map((input) => input.type)).toEqual([
      'radio',
      'radio',
      'radio',
      'radio',
    ]);
    expect(new Set(radios.map((input) => input.name)).size).toBe(1);
    expect(radios[0].name).toMatch(/^pct-data-table-\d+-pick$/);
    // The word the radios are named by is the header's, read as its text.
    const word = document.getElementById(
      (radios[0].getAttribute('aria-labelledby') as string).split(' ')[0],
    ) as HTMLElement;
    expect(word.hidden).toBe(false);
    expect(word.closest('th')).not.toBeNull();
    await press(fixture, radios[2]);
    expect(host.value()).toEqual([3]);
    await press(fixture, picks()[0], true);
    expect(host.value()).toEqual([1]);
    host.selection().selectAll();
    expect(host.value()).toEqual([1]);
  });

  it('disables every control of the column', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.off.set(true);
    await settle(fixture);
    expect(all()?.disabled).toBe(true);
    expect(picks().every((input) => input.disabled)).toBe(true);
    fixture.componentInstance.mode.set('single');
    await settle(fixture);
    expect(picks().every((input) => input.disabled)).toBe(true);
  });

  it('holds the selection when read-only: a press changes nothing, and the checkbox stays as it was', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.value.set([1]);
    host.held.set(true);
    await settle(fixture);
    expect(all()?.getAttribute('aria-readonly')).toBe('true');
    expect(picks()[0].getAttribute('aria-readonly')).toBe('true');
    await press(fixture, picks()[0]);
    await press(fixture, picks()[1]);
    await press(fixture, all() as HTMLInputElement);
    expect(host.value()).toEqual([1]);
    expect(picks().map((input) => input.checked)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(all()?.checked).toBe(false);
    host.mode.set('single');
    await settle(fixture);
    // A radio has no `aria-readonly`; its press is taken back all the same.
    expect(picks()[1].hasAttribute('aria-readonly')).toBe(false);
    await press(fixture, picks()[1]);
    expect(host.value()).toEqual([1]);
    expect(picks()[1].checked).toBe(false);
    host.held.set(false);
    await settle(fixture);
    expect(picks()[0].hasAttribute('aria-readonly')).toBe(false);
  });

  it('names the native controls by the name given, the radios by a generated one otherwise', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    expect(picks()[0].hasAttribute('name')).toBe(false);
    expect(all()?.hasAttribute('name')).toBe(false);
    host.name.set('rules');
    await settle(fixture);
    expect(picks().every((input) => input.name === 'rules')).toBe(true);
    expect(all()?.name).toBe('rules');
    host.mode.set('single');
    await settle(fixture);
    expect(picks().every((input) => input.name === 'rules')).toBe(true);
  });

  it('marks the header with the required sign', async () => {
    const fixture = await render(Host);
    const th = () => all()?.closest('th') as HTMLElement;
    expect(th().querySelector('.pct-data-table__required')).toBeNull();
    expect(all()?.hasAttribute('aria-required')).toBe(false);
    fixture.componentInstance.needed.set(true);
    await settle(fixture);
    const sign = th().querySelector('.pct-data-table__required');
    expect(sign?.textContent).toBe('*');
    expect(sign?.getAttribute('aria-hidden')).toBe('true');
    expect(all()?.getAttribute('aria-required')).toBe('true');
  });

  it('writes the hint under the table, which describes the table by it', async () => {
    const fixture = await render(Host);
    expect(table().hasAttribute('aria-describedby')).toBe(false);
    expect(document.querySelector('[data-pct-part="hint"]')).toBeNull();
    fixture.componentInstance.hint.set('Pick the devices to move');
    await settle(fixture);
    const hint = document.querySelector(
      '[data-pct-part="hint"]',
    ) as HTMLElement;
    expect(hint.textContent).toBe('Pick the devices to move');
    expect(hint.id).toMatch(/^pct-table-selection-\d+-hint$/);
    expect(table().getAttribute('aria-describedby')).toBe(hint.id);
    // Outside the frame, so a scrolled table keeps it in view.
    expect(hint.closest('pct-table-frame')).toBeNull();
  });

  it('tells the form it was left when the focus leaves a control of the column', async () => {
    const fixture = await render(Host);
    picks()[0].dispatchEvent(new FocusEvent('blur'));
    (all() as HTMLInputElement).dispatchEvent(new FocusEvent('blur'));
    expect(fixture.componentInstance.touches).toBe(2);
    fixture.componentInstance.mode.set('single');
    await settle(fixture);
    picks()[0].dispatchEvent(new FocusEvent('blur'));
    expect(fixture.componentInstance.touches).toBe(3);
  });

  it('counts its column among the ones a placeholder row and a details row span', async () => {
    @Component({
      imports: [
        PctDataTable,
        PctTableSelection,
        PctTableDetails,
        PctDetailsTemplate,
      ],
      template: `
        <pct-data-table
          pctTableSelection
          pctTableDetails
          [details]="[1]"
          [rows]="rows()"
          [columns]="columns"
          [rowId]="byId"
          [loading]="true"
          caption="Devices"
        >
          <ng-template [pctDetails]="columns" let-device>{{
            device.name
          }}</ng-template>
        </pct-data-table>
      `,
    })
    class SpanHost {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = signal<readonly Device[]>([]);
    }
    const fixture = await render(SpanHost);
    const placeholder = document.querySelector(
      'tr[data-pct-part="placeholder"]',
    ) as HTMLTableRowElement;
    expect(placeholder.cells).toHaveLength(5);
    fixture.componentInstance.rows.set(DEVICES);
    await settle(fixture);
    const details = document.querySelector(
      'tr[data-pct-part="details"] > td',
    ) as HTMLTableCellElement;
    expect(details.colSpan).toBe(5);
    // The checkbox comes before the disclosure.
    expect(
      rows()[0].cells[0].querySelector('[data-pct-part="select"]'),
    ).not.toBeNull();
    expect(
      rows()[0].cells[1].querySelector('[data-pct-part="disclosure"]'),
    ).not.toBeNull();
  });

  it('counts its column in a group’s heading and in the total', async () => {
    @Component({
      imports: [PctDataTable, PctTableSelection, PctTableGroups],
      template: `
        <pct-data-table
          pctTableSelection
          [pctTableGroups]="columns"
          [groupBy]="['room']"
          [rows]="rows"
          [columns]="columns"
          [rowId]="byId"
          caption="Devices"
        />
      `,
    })
    class GroupHost {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    await render(GroupHost);
    const heading = document.querySelector(
      'tr[data-pct-part="group"] > th',
    ) as HTMLTableCellElement;
    expect(heading.colSpan).toBe(2);
    const total = document.querySelector('tfoot th') as HTMLTableCellElement;
    expect(total.colSpan).toBe(2);
    // The rows of a group are picked by their own checkbox; a heading has none.
    expect(
      document.querySelector('tr[data-pct-part="group"] input'),
    ).toBeNull();
  });

  it('names a row by its first cell of text, past a template', async () => {
    @Component({
      imports: [PctDataTable, PctTableSelection, PctCellTemplate],
      template: `
        <pct-data-table
          pctTableSelection
          [rows]="rows"
          [columns]="columns"
          [rowId]="byId"
          caption="Devices"
        >
          <ng-template [pctCell]="columns" pctCellOf="name" let-device>
            <b>{{ device.name }}</b>
          </ng-template>
        </pct-data-table>
      `,
    })
    class TemplateHost {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    await render(TemplateHost);
    const name = (picks()[0].getAttribute('aria-labelledby') as string).split(
      ' ',
    )[1];
    expect(document.getElementById(name)?.textContent?.trim()).toBe('Kitchen');
  });

  it('names a row by its first cell when every cell is drawn by a template', async () => {
    const only = col.of([col.key('name', { header: 'Name' })]);
    @Component({
      imports: [PctDataTable, PctTableSelection, PctCellTemplate],
      template: `
        <pct-data-table
          pctTableSelection
          [rows]="rows"
          [columns]="columns"
          [rowId]="byId"
          caption="Devices"
        >
          <ng-template [pctCell]="columns" pctCellOf="name" let-device>
            <b>{{ device.name }}</b>
          </ng-template>
        </pct-data-table>
      `,
    })
    class OnlyHost {
      readonly columns = only;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    await render(OnlyHost);
    const name = (picks()[0].getAttribute('aria-labelledby') as string).split(
      ' ',
    )[1];
    expect(document.getElementById(name)?.textContent?.trim()).toBe('Lamp');
  });

  it('gives a cell no id when nothing picks', async () => {
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class PlainHost {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    await render(PlainHost);
    expect(document.querySelector('td[id]')).toBeNull();
    expect(document.querySelector('[data-pct-part="select"]')).toBeNull();
  });
});

describe('PctTableSelection — its defaults', () => {
  it('picks any number of rows, none at first, enabled, optional, with no hint', async () => {
    @Component({
      imports: [PctDataTable, PctTableSelection],
      template: `<pct-data-table
        pctTableSelection
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class BareHost {
      readonly selection = viewChild.required(PctTableSelection);
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    const fixture = await render(BareHost);
    const selection = fixture.componentInstance.selection();
    expect(selection.value()).toEqual([]);
    expect(selection.mode()).toBe('multiple');
    expect(selection.disabled()).toBe(false);
    expect(selection.readonly()).toBe(false);
    expect(selection.name()).toBe('');
    expect(selection.invalid()).toBe(false);
    expect(selection.touched()).toBe(false);
    expect(selection.required()).toBe(false);
    expect(selection.errors()).toEqual([]);
    expect(selection.warnings()).toBeUndefined();
    expect(selection.hint()).toBe('');
    expect(selection.showInvalid()).toBe(false);
    expect(all()?.type).toBe('checkbox');
    expect(all()?.disabled).toBe(false);
    expect(all()?.hasAttribute('aria-invalid')).toBe(false);
    expect(
      document
        .querySelector('pct-data-table')
        ?.hasAttribute('data-pct-invalid'),
    ).toBe(false);
  });
});

@Component({
  imports: [PctDataTable, PctTableSelection, FormField],
  template: `
    <pct-data-table
      pctTableSelection
      [formField]="f.devices"
      [mode]="mode()"
      [hint]="hint()"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    />
  `,
})
class FormHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly mode = signal<'single' | 'multiple'>('multiple');
  readonly hint = signal('Pick what to move');
  readonly model = signal<{ devices: readonly PctRowId[] }>({ devices: [] });
  readonly f = form(this.model, (p) => {
    required(p.devices);
    minLength(p.devices, 1, { message: 'Pick a device' });
    pctWarn(p.devices, ({ value }) =>
      value().length > 2
        ? { kind: 'many', message: 'Moving many takes a while' }
        : undefined,
    );
  });
}

describe('PctTableSelection — a field of a form', () => {
  const host = () => document.querySelector('pct-data-table') as HTMLElement;
  const line = (part: string) =>
    document.querySelector(`[data-pct-part="${part}"]`) as HTMLElement | null;

  it('[formField] binds the directive: the model is the form’s, both ways', async () => {
    const fixture = await render(FormHost);
    const app = fixture.componentInstance;
    await press(fixture, picks()[1]);
    expect(app.model().devices).toEqual([2]);
    app.model.set({ devices: [1, 3] });
    await settle(fixture);
    expect(picks().map((input) => input.checked)).toEqual([
      true,
      false,
      true,
      false,
    ]);
    // `required()` reaches the header.
    expect(all()?.getAttribute('aria-required')).toBe('true');
  });

  it('shows the error only once touched, in place of the hint, and drops it once a row is picked', async () => {
    const fixture = await render(FormHost);
    expect(line('error')).toBeNull();
    expect(line('hint')?.textContent).toBe('Pick what to move');
    expect(table().getAttribute('aria-describedby')).toBe(line('hint')?.id);
    picks()[0].dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    const error = line('error') as HTMLElement;
    expect(error.textContent).toBe('Pick a device');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.id).toMatch(/^pct-table-selection-\d+-error$/);
    expect(line('hint')).toBeNull();
    expect(table().getAttribute('aria-describedby')).toBe(error.id);
    expect(all()?.getAttribute('aria-invalid')).toBe('true');
    expect(host().hasAttribute('data-pct-invalid')).toBe(true);
    await press(fixture, picks()[0]);
    expect(line('error')).toBeNull();
    expect(all()?.hasAttribute('aria-invalid')).toBe(false);
    expect(host().hasAttribute('data-pct-invalid')).toBe(false);
    expect(table().getAttribute('aria-describedby')).toBe(line('hint')?.id);
  });

  it('shows a warning without a veto, with its glyph and the word a reader hears', async () => {
    const fixture = await render(FormHost);
    fixture.componentInstance.f.devices().markAsTouched();
    fixture.componentInstance.model.set({ devices: [1, 2, 3] });
    await settle(fixture);
    const warning = line('warning') as HTMLElement;
    expect(warning.getAttribute('role')).toBe('status');
    expect(warning.id).toMatch(/^pct-table-selection-\d+-warning$/);
    expect(warning.querySelector('pct-icon')?.getAttribute('name')).toBe(
      'warning',
    );
    expect(warning.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Warning: Moving many takes a while',
    );
    expect(table().getAttribute('aria-describedby')).toBe(warning.id);
    expect(host().hasAttribute('data-pct-warning')).toBe(true);
    expect(host().hasAttribute('data-pct-invalid')).toBe(false);
    expect(fixture.componentInstance.f.devices().valid()).toBe(true);
  });

  it('marks the radios invalid in single mode, where the header has no checkbox', async () => {
    const fixture = await render(FormHost);
    fixture.componentInstance.mode.set('single');
    fixture.componentInstance.f.devices().markAsTouched();
    await settle(fixture);
    expect(
      picks().every((input) => input.getAttribute('aria-invalid') === 'true'),
    ).toBe(true);
    await press(fixture, picks()[0]);
    expect(fixture.componentInstance.model().devices).toEqual([1]);
    expect(picks().some((input) => input.hasAttribute('aria-invalid'))).toBe(
      false,
    );
  });
});
