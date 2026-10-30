import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableFrame,
  PctTableHeader,
  PctTableSort,
} from './table';

const PARTS = [
  PctTable,
  PctTableCaption,
  PctTableHeader,
  PctTableCell,
  PctTableFrame,
];

/**
 * The pattern as the class comment draws it: a caption, a sortable text column, a sortable
 * numeric one, a plain header, and the sort bound two-way to the host.
 */
@Component({
  imports: PARTS,
  template: `
    <table pctTable [(sort)]="sort">
      <caption pctCaption>
        Rules
      </caption>
      <thead>
        <tr>
          <th pctHeader scope="col" sortKey="name">Name</th>
          <th pctHeader scope="col" sortKey="energy" numeric>Energy</th>
          <th pctHeader scope="col">Note</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td pctCell>Heater</td>
          <td pctCell numeric>12.5</td>
          <td pctCell>—</td>
        </tr>
      </tbody>
    </table>
  `,
})
class Host {
  readonly sort = signal<PctTableSort | null>(null);
}

@Component({
  imports: PARTS,
  template: `
    <table pctTable>
      <caption pctCaption id="rules-caption">
        Rules
      </caption>
      <tbody>
        <tr>
          <td pctCell>Heater</td>
        </tr>
      </tbody>
    </table>
  `,
})
class NamedCaptionHost {}

@Component({
  imports: PARTS,
  template: `
    <pct-table-frame>
      <table pctTable>
        <caption pctCaption>
          Registers
        </caption>
        <tbody>
          <tr>
            <td pctCell>4096</td>
          </tr>
        </tbody>
      </table>
    </pct-table-frame>
  `,
})
class FrameHost {}

@Component({
  imports: PARTS,
  template: `
    <pct-table-frame [attr.aria-label]="label()">
      <table pctTable>
        <tbody>
          <tr>
            <td pctCell>4096</td>
          </tr>
        </tbody>
      </table>
    </pct-table-frame>
  `,
})
class UncaptionedFrameHost {
  readonly label = signal<string | null>(null);
}

@Component({
  imports: PARTS,
  template: `
    <table pctTable>
      <thead>
        <tr>
          <th
            pctHeader
            sortKey="temperature"
            [ariaLabel]="label()"
            [ariaLabelledby]="labelledBy()"
          >
            °C
          </th>
        </tr>
      </thead>
    </table>
  `,
})
class NamedHeaderHost {
  readonly label = signal('');
  readonly labelledBy = signal('');
}

@Component({
  imports: PARTS,
  template: `<table>
    <tr>
      <th pctHeader>Alone</th>
    </tr>
  </table>`,
})
class LooseHeaderHost {}

@Component({
  imports: PARTS,
  template: `
    <pct-table-frame>
      @if (shown()) {
        <table pctTable>
          <caption pctCaption>
            Later
          </caption>
          <tbody>
            <tr>
              <td pctCell>4096</td>
            </tr>
          </tbody>
        </table>
      }
    </pct-table-frame>
  `,
})
class LateTableHost {
  readonly shown = signal(false);
}

@Component({
  imports: PARTS,
  template: `
    <h2 id="registers-heading">Registers</h2>
    <pct-table-frame aria-labelledby="registers-heading">
      <table pctTable>
        <tbody>
          <tr>
            <td pctCell>4096</td>
          </tr>
        </tbody>
      </table>
    </pct-table-frame>
  `,
})
class LabelledFrameHost {}

@Component({
  imports: PARTS,
  template: `
    <table pctTable>
      <thead>
        <tr>
          <th pctHeader sortKey="">Empty</th>
        </tr>
      </thead>
    </table>
  `,
})
class EmptyKeyHost {}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const table = () => document.querySelector('table') as HTMLTableElement;
const headers = () =>
  Array.from(document.querySelectorAll('th')) as HTMLTableCellElement[];
const toggle = (header: HTMLElement) =>
  header.querySelector('[data-pct-part="toggle"]') as HTMLButtonElement | null;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctTable — the platform table, dressed', () => {
  it('writes no role and no ARIA on the table: the element is the semantics', async () => {
    await render(Host);

    expect(table().classList.contains('pct-table')).toBe(true);
    expect(table().getAttribute('role')).toBeNull();
    expect(
      table()
        .getAttributeNames()
        .filter((name) => name.startsWith('aria-')),
    ).toEqual([]);
  });

  it('keeps the consumer markup where it was written', async () => {
    await render(Host);

    expect(table().children[0].tagName).toBe('CAPTION');
    expect(table().children[1].tagName).toBe('THEAD');
    expect(table().querySelectorAll('td')).toHaveLength(3);
    expect(table().querySelector('td')?.textContent).toBe('Heater');
  });

  it('gives the caption an id when none is written, and keeps the one that is', async () => {
    await render(Host);
    const generated = document.querySelector('caption') as HTMLElement;
    expect(generated.id).toMatch(/^pct-table-caption-\d+$/);
    TestBed.resetTestingModule();

    await render(NamedCaptionHost);
    expect(document.querySelector('caption')?.id).toBe('rules-caption');
  });

  it('marks numeric header cells and cells, and only those', async () => {
    await render(Host);

    const [name, energy] = headers();
    expect(name.hasAttribute('data-pct-numeric')).toBe(false);
    expect(energy.getAttribute('data-pct-numeric')).toBe('');
    const [text, number] = Array.from(table().querySelectorAll('td'));
    expect(text.hasAttribute('data-pct-numeric')).toBe(false);
    expect(number.getAttribute('data-pct-numeric')).toBe('');
  });
});

describe('PctTableHeader — sorting', () => {
  it('is a label and nothing more without a sort key', async () => {
    await render(Host);

    const note = headers()[2];
    expect(toggle(note)).toBeNull();
    expect(note.textContent?.trim()).toBe('Note');
    expect(note.hasAttribute('aria-sort')).toBe(false);
  });

  it('puts the label in a button with the chevron on a sortable column', async () => {
    await render(Host);

    expect(headers()[0].getAttribute('data-pct-sortable')).toBe('');
    expect(headers()[2].hasAttribute('data-pct-sortable')).toBe(false);
    const button = toggle(headers()[0]);
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.textContent?.trim()).toBe('Name');
    // Named by its label alone: the two name inputs are empty until a consumer fills them.
    expect(button?.hasAttribute('aria-label')).toBe(false);
    expect(button?.hasAttribute('aria-labelledby')).toBe(false);
    const icon = button?.querySelector('[data-pct-part="icon"]');
    expect(icon?.tagName).toBe('PCT-ICON');
  });

  it('names the sort button by its label, unless a name is given to stand in for it', async () => {
    const fixture = await render(NamedHeaderHost);
    const button = toggle(headers()[0]) as HTMLButtonElement;
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.hasAttribute('aria-labelledby')).toBe(false);

    fixture.componentInstance.label.set('Temperature in degrees Celsius');
    fixture.componentInstance.labelledBy.set('energy-help');
    await settle(fixture);
    expect(button.getAttribute('aria-label')).toBe(
      'Temperature in degrees Celsius',
    );
    expect(button.getAttribute('aria-labelledby')).toBe('energy-help');
    expect(headers()[0].hasAttribute('aria-label')).toBe(false);
  });

  it('writes aria-sort on no header while the rows stand in their own order', async () => {
    await render(Host);

    for (const header of headers()) {
      expect(header.hasAttribute('aria-sort')).toBe(false);
    }
  });

  it('sorts a column ascending on its first press and turns it on the next', async () => {
    const fixture = await render(Host);
    const [name] = headers();

    toggle(name)?.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toEqual({
      key: 'name',
      direction: 'ascending',
    });
    expect(name.getAttribute('aria-sort')).toBe('ascending');

    toggle(name)?.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toEqual({
      key: 'name',
      direction: 'descending',
    });
    expect(name.getAttribute('aria-sort')).toBe('descending');

    toggle(name)?.click();
    await settle(fixture);
    expect(name.getAttribute('aria-sort')).toBe('ascending');
  });

  it('moves the sort to another column, ascending, and takes it off the first', async () => {
    const fixture = await render(Host);
    const [name, energy] = headers();
    fixture.componentInstance.sort.set({
      key: 'name',
      direction: 'descending',
    });
    await settle(fixture);

    toggle(energy)?.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toEqual({
      key: 'energy',
      direction: 'ascending',
    });
    expect(energy.getAttribute('aria-sort')).toBe('ascending');
    expect(name.hasAttribute('aria-sort')).toBe(false);
  });

  it('reads a sort the consumer writes, and its removal', async () => {
    const fixture = await render(Host);
    const [, energy] = headers();

    fixture.componentInstance.sort.set({
      key: 'energy',
      direction: 'descending',
    });
    await settle(fixture);
    expect(energy.getAttribute('aria-sort')).toBe('descending');

    fixture.componentInstance.sort.set(null);
    await settle(fixture);
    expect(energy.hasAttribute('aria-sort')).toBe(false);
  });

  it('marks no header for a key that no header carries', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.sort.set({
      key: 'nowhere',
      direction: 'ascending',
    });
    await settle(fixture);

    for (const header of headers()) {
      expect(header.hasAttribute('aria-sort')).toBe(false);
    }
  });

  it('reads an empty sort key as none: the header stays a label', async () => {
    await render(EmptyKeyHost);

    expect(toggle(headers()[0])).toBeNull();
    expect(headers()[0].hasAttribute('data-pct-sortable')).toBe(false);
  });

  it('needs its table: a header outside one is an error', async () => {
    await expect(render(LooseHeaderHost)).rejects.toThrow(/PctTable/);
  });
});

describe('PctTableFrame — the region that exists while the table overflows', () => {
  const globals = globalThis as { ResizeObserver?: unknown };
  let wake: () => void;
  let observed: Element[];
  let disconnected: number;

  beforeEach(() => {
    observed = [];
    disconnected = 0;
    wake = () => undefined;
    globals.ResizeObserver = class {
      constructor(callback: () => void) {
        wake = callback;
      }
      observe(target: Element) {
        observed.push(target);
      }
      disconnect() {
        disconnected++;
      }
    };
  });

  afterEach(() => {
    delete globals.ResizeObserver;
  });

  const frame = () => document.querySelector('pct-table-frame') as HTMLElement;

  function widths(element: HTMLElement, scroll: number, client: number): void {
    Object.defineProperty(element, 'scrollWidth', {
      value: scroll,
      configurable: true,
    });
    Object.defineProperty(element, 'clientWidth', {
      value: client,
      configurable: true,
    });
  }

  it('watches the frame and the table in it, and is no region before the first measure', async () => {
    await render(FrameHost);

    expect(frame().hasAttribute('role')).toBe(false);
    expect(frame().hasAttribute('tabindex')).toBe(false);

    expect(observed).toEqual([frame(), table()]);
  });

  it('is nothing while the table fits: no role, no stop, no name', async () => {
    const fixture = await render(FrameHost);
    widths(frame(), 300, 300);
    wake();
    await settle(fixture);

    expect(frame().hasAttribute('role')).toBe(false);
    expect(frame().hasAttribute('tabindex')).toBe(false);
    expect(frame().hasAttribute('aria-labelledby')).toBe(false);
  });

  function heights(element: HTMLElement, scroll: number, client: number): void {
    Object.defineProperty(element, 'scrollHeight', {
      value: scroll,
      configurable: true,
    });
    Object.defineProperty(element, 'clientHeight', {
      value: client,
      configurable: true,
    });
  }

  it('becomes a region too while a table taller than a height it is given overflows it', async () => {
    const fixture = await render(FrameHost);
    widths(frame(), 300, 300);
    heights(frame(), 401, 400);
    wake();
    await settle(fixture);
    expect(frame().getAttribute('role')).toBe('region');
    heights(frame(), 400, 400);
    wake();
    await settle(fixture);
    expect(frame().hasAttribute('role')).toBe(false);
  });

  it('takes the name an input gives it where no caption names it', async () => {
    @Component({
      imports: [PctTableFrame, PctTable],
      template: `<pct-table-frame [labelledby]="name"
        ><table pctTable></table
      ></pct-table-frame>`,
    })
    class InputNamed {
      readonly name = 'outside';
    }
    await render(InputNamed);
    expect(frame().getAttribute('aria-labelledby')).toBe('outside');
  });

  it('becomes a focusable region named by the caption while the table overflows', async () => {
    const fixture = await render(FrameHost);
    widths(frame(), 301, 300);
    wake();
    await settle(fixture);

    expect(frame().getAttribute('role')).toBe('region');
    expect(frame().getAttribute('tabindex')).toBe('0');
    const caption = document.querySelector('caption') as HTMLElement;
    expect(frame().getAttribute('aria-labelledby')).toBe(caption.id);

    widths(frame(), 300, 300);
    wake();
    await settle(fixture);
    expect(frame().hasAttribute('role')).toBe(false);
  });

  it('warns once of an overflowing frame nothing names, and not of one with a label', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(UncaptionedFrameHost);
    widths(frame(), 400, 300);
    wake();
    wake();
    await settle(fixture);

    expect(frame().hasAttribute('aria-labelledby')).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe(
      '[pct-table-frame] The table scrolls, so the frame takes focus, and nothing names ' +
        'it: give the table a <caption pctCaption>, or the frame an aria-label.',
    );
    TestBed.resetTestingModule();
    warn.mockClear();

    const labelled = await render(UncaptionedFrameHost);
    labelled.componentInstance.label.set('Registers');
    await settle(labelled);
    widths(frame(), 400, 300);
    wake();
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn of a frame that fits, or of one named by its caption', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(UncaptionedFrameHost);
    widths(frame(), 300, 300);
    wake();
    TestBed.resetTestingModule();

    await render(FrameHost);
    widths(frame(), 400, 300);
    wake();
    expect(warn).not.toHaveBeenCalled();
  });

  it('watches a table that arrives after the first render, and measures on its arrival', async () => {
    const fixture = await render(LateTableHost);
    expect(observed).toEqual([frame()]);

    widths(frame(), 400, 300);
    fixture.componentInstance.shown.set(true);
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);

    expect(observed).toContain(table());
    expect(frame().getAttribute('role')).toBe('region');
    const caption = document.querySelector('caption') as HTMLElement;
    expect(frame().getAttribute('aria-labelledby')).toBe(caption.id);
  });

  it("keeps the consumer's aria-labelledby where no caption names the frame", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(LabelledFrameHost);
    expect(frame().getAttribute('aria-labelledby')).toBe('registers-heading');

    widths(frame(), 400, 300);
    wake();
    await settle(fixture);
    expect(frame().getAttribute('role')).toBe('region');
    expect(frame().getAttribute('aria-labelledby')).toBe('registers-heading');
    expect(warn).not.toHaveBeenCalled();
  });

  it('lets both observers go with the frame', async () => {
    const fixture = await render(FrameHost);
    const stop = vi.spyOn(MutationObserver.prototype, 'disconnect');
    fixture.destroy();

    expect(disconnected).toBe(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
