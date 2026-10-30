import { Component, DestroyRef, inject, signal } from '@angular/core';
import { form, FormField, minLength, submit } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { pctWarn } from '@pacit/components/core';
import { PctField, PctText } from '@pacit/components/field';
import { PctSwitch } from '@pacit/components/switch';
import {
  PctCellTemplate,
  PctDataTable,
  PctDetailsTemplate,
  pctColumnsOf,
  type PctRowId,
  PctTableDetails,
  PctTableGroups,
  PctTableSelection,
  type PctTableSort,
  PctTableWindow,
} from '@pacit/components/table';
import { SbxDemo } from '../../ui/demo';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly address: number;
  readonly energy: number | null;
  readonly enabled: boolean;
  readonly nextAt: number;
}

const ROOMS = ['Kitchen', 'Hall', 'Garage', 'Bathroom', 'Living room'];
const NAMES = [
  'Supply fan',
  'Heater',
  'Bypass',
  'Exhaust fan',
  'Boiler',
  'Floor heating',
  'Lamp',
  'Motion sensor',
  'Door lock',
  'Blinds',
];
/** A fixed clock, so the relative column reads the same in every run and every baseline. */
const NOW = Date.UTC(2026, 9, 29, 12, 0);

const RULES: readonly Rule[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ' 2' : ''}`,
  room: ROOMS[(i * 3) % ROOMS.length],
  address: 4096 + i * 4,
  energy: i % 7 === 3 ? null : Math.round(((i * 977) % 9000) * 10) / 100,
  enabled: i % 3 !== 1,
  nextAt: NOW + ((i * 37) % 300) * 60_000,
}));

const col = pctColumnsOf<Rule>();

interface Device {
  readonly id: number;
  readonly name: string;
  readonly state: 'Online' | 'Offline' | 'Fault';
  readonly battery: number | null;
  readonly room: string;
}

const DEVICES: readonly Device[] = [
  { id: 1, name: 'Supply fan', state: 'Online', battery: null, room: 'Attic' },
  {
    id: 2,
    name: 'Window contact, the bedroom’s south window by the wardrobe',
    state: 'Online',
    battery: 64,
    room: 'Bedroom',
  },
  { id: 3, name: 'Door lock', state: 'Fault', battery: 9, room: 'Hall' },
  {
    id: 4,
    name: 'Motion sensor',
    state: 'Offline',
    battery: 0,
    room: 'Garage',
  },
  {
    id: 5,
    name: 'Smoke detector',
    state: 'Online',
    battery: 15,
    room: 'Kitchen',
  },
  {
    id: 6,
    name: 'Thermostat',
    state: 'Online',
    battery: 88,
    room: 'Living room',
  },
];

const dev = pctColumnsOf<Device>();

interface Register {
  readonly id: number;
  readonly address: number;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly enabled: boolean;
}

const UNITS = ['°C', '%', 'Pa', 'kWh'];

/**
 * `count` registers of a controller. Every twenty-fifth has a name long enough to wrap in its
 * column, so the list holds rows of two heights, as real lists do.
 */
function registersOf(count: number): readonly Register[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    address: 40_001 + i,
    name:
      i % 25 === 12
        ? `${NAMES[i % NAMES.length]} ${i + 1}, the setpoint the schedule writes at night and the one a person writes by hand`
        : `${NAMES[i % NAMES.length]} ${i + 1}`,
    value: ((i * 7919) % 100_000) / 100,
    unit: UNITS[i % UNITS.length],
    enabled: i % 5 !== 2,
  }));
}

const reg = pctColumnsOf<Register>();

/**
 * Data table: the first layer drawn from data. What is worth watching: the columns are a
 * typed list, so the switch's template reads `rule.enabled` as a boolean; the header order is
 * a list of keys, Shift adds one; the quick filter searches the text the cells show; the empty
 * and loading states stand beside the table; and the live rows change their values with
 * their ids kept, so the focus in a switch stays where it is.
 */
@Component({
  selector: 'sbx-datatable-view',
  imports: [
    SbxDemo,
    PctDataTable,
    PctCellTemplate,
    PctField,
    PctText,
    PctSwitch,
    PctButton,
    PctTableDetails,
    PctDetailsTemplate,
    PctTableGroups,
    PctTableSelection,
    PctTableWindow,
    FormField,
  ],
  templateUrl: './datatable-view.html',
  styleUrl: './datatable-view.scss',
})
export class DatatableView {
  protected readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room' }),
    col.key('address', { header: 'Address', numeric: true }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
    col.key('nextAt', {
      header: 'Next run',
      kind: { instant: { relative: true, timeZone: 'Europe/Warsaw' } },
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean', sort: false }),
  ]);
  protected readonly byId = (rule: Rule) => rule.id;

  /** The same rules with priorities: on a narrow frame the later columns give way first. */
  protected readonly detailColumns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room', priority: 2 }),
    col.key('address', { header: 'Address', numeric: true, priority: 4 }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      priority: 3,
    }),
    col.key('nextAt', {
      header: 'Next run',
      kind: { instant: { relative: true, timeZone: 'Europe/Warsaw' } },
      priority: 1,
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean', sort: false }),
  ]);
  /** The rules summed up: a count of names, the energy summed, in groups of rooms. */
  protected readonly groupColumns = col.of([
    col.key('name', { header: 'Name', aggregate: 'count' }),
    col.key('room', { header: 'Room' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      aggregate: 'sum',
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean' }),
  ]);
  protected readonly groupBy = signal<readonly ('room' | 'enabled')[]>([
    'room',
  ]);
  protected readonly closedGroups = signal<readonly string[]>([]);
  protected readonly groupRules = RULES.slice(0, 12);
  protected readonly widths = [1200, 720, 360] as const;
  protected readonly width = signal<number>(1200);
  protected readonly detailRules = signal<readonly Rule[]>(RULES.slice(0, 8));
  protected readonly openRules = signal<readonly PctRowId[]>([]);
  protected readonly ran = signal('');
  protected readonly now = NOW;

  protected readonly rules = signal<readonly Rule[]>(RULES);
  protected readonly sort = signal<
    readonly PctTableSort<
      'name' | 'room' | 'address' | 'energy' | 'nextAt' | 'enabled'
    >[]
  >([]);
  protected readonly question = signal('');

  protected readonly live = signal<readonly Rule[]>(RULES.slice(0, 6));

  protected readonly devices = DEVICES;
  protected readonly deviceColumns = dev.of([
    dev.key('name', { header: 'Device', tooltip: true }),
    dev.key('state', {
      header: 'State',
      tone: (state) =>
        state === 'Fault' ? 'danger' : state === 'Offline' ? 'warning' : null,
    }),
    dev.key('battery', {
      header: 'Battery',
      kind: { number: { unit: 'percent' } },
    }),
    dev.key('room', {
      header: 'Room',
      tooltip: (device) => `${device.name}, ${device.room}`,
    }),
  ]);
  protected readonly deviceId = (device: Device) => device.id;
  protected readonly deviceTone = (device: Device) =>
    device.state === 'Fault' ? ('danger' as const) : null;
  protected readonly liveQuestion = signal('');

  /** The registers' list sizes: the first with no window would do, the last is past the scaling. */
  protected readonly counts = [900, 10_000, 100_000, 1_000_000] as const;
  protected readonly count = signal<number>(10_000);
  protected readonly registers = signal<readonly Register[]>(
    registersOf(10_000),
  );
  protected readonly registerColumns = reg.of([
    reg.key('address', { header: 'Address', numeric: true }),
    reg.key('name', { header: 'Name' }),
    reg.key('value', {
      header: 'Value',
      kind: { number: { fractionDigits: 2 } },
    }),
    reg.key('unit', { header: 'Unit' }),
    reg.key('enabled', { header: 'Enabled', kind: 'boolean', sort: false }),
  ]);
  protected readonly registerId = (register: Register) => register.id;
  protected readonly liveRegisters = signal(false);

  /**
   * The rules to move, as a field of a form: at least one, and more than ten move slowly —
   * a warning that lets the form through.
   */
  protected readonly moveModel = signal<{ rules: readonly PctRowId[] }>({
    rules: [],
  });
  protected readonly moveForm = form(this.moveModel, (p) => {
    minLength(p.rules, 1, { message: 'Pick at least one rule to move' });
    pctWarn(p.rules, ({ value }) =>
      value().length > 10
        ? {
            kind: 'many',
            message: 'More than ten rules — the move takes a while',
          }
        : undefined,
    );
  });
  protected readonly moveQuestion = signal('');
  protected readonly moved = signal('');
  /** The rule a new device copies: one row, out of a form. */
  protected readonly template = signal<readonly PctRowId[]>([3]);

  protected move(): void {
    void submit(this.moveForm, async () => {
      this.moved.set(this.moveModel().rules.join(' '));
      return undefined;
    });
  }

  /** Makes a list of `count` registers. */
  protected countRegisters(count: number): void {
    this.count.set(count);
    this.registers.set(registersOf(count));
  }

  protected toggleRegister(register: Register, enabled: boolean): void {
    this.registers.update((registers) =>
      registers.map((other) =>
        other.id === register.id ? { ...other, enabled } : other,
      ),
    );
  }

  constructor() {
    // Every two seconds the readings move and the ids stay: the rows keep their elements.
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      if (this.liveRegisters())
        this.registers.update((registers) =>
          registers.map((register) => ({
            ...register,
            value: Math.round((register.value + 0.25) * 100) / 100,
          })),
        );
      this.live.update((rules) =>
        rules.map((rule) => ({
          ...rule,
          energy:
            rule.energy === null
              ? null
              : Math.round((rule.energy + tick * 0.7) * 10) / 10,
        })),
      );
    }, 2000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected toggle(rule: Rule, enabled: boolean): void {
    this.rules.update((rules) =>
      rules.map((other) =>
        other.id === rule.id ? { ...other, enabled } : other,
      ),
    );
  }

  protected toggleDetail(rule: Rule, enabled: boolean): void {
    this.detailRules.update((rules) =>
      rules.map((other) =>
        other.id === rule.id ? { ...other, enabled } : other,
      ),
    );
  }

  protected toggleLive(rule: Rule, enabled: boolean): void {
    this.live.update((rules) =>
      rules.map((other) =>
        other.id === rule.id ? { ...other, enabled } : other,
      ),
    );
  }
}
