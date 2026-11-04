import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, minLength, submit } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { pctWarn } from '@pacit/components/core';
import { PctField, PctText } from '@pacit/components/field';
import { PctPagination } from '@pacit/components/pagination';
import { PctSelect, type PctSelectOption } from '@pacit/components/select';
import { PctSwitch } from '@pacit/components/switch';
import {
  PctCellTemplate,
  PctDataTable,
  PctDetailsTemplate,
  type PctColumnFilters,
  pctColumnsOf,
  PctFilterTemplate,
  type PctRowId,
  PctTableDetails,
  PctTableGroups,
  PctTableTree,
  PctTablePage,
  type PctTableAnswer,
  type PctTableCellRange,
  PctTableColumnChooser,
  PctTableColumnFilters,
  PctTableColumns,
  PctEditorTemplate,
  PctTableEditing,
  type PctTableEdit,
  PctTableGrid,
  type PctTableGridCell,
  type PctTableLayout,
  type PctTableLoad,
  PctTableRemote,
  type PctTableRequest,
  PctTableSelection,
  type PctTableSort,
  pctTableCsv,
  PctTableWindow,
  pctTableXlsx,
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

/** An edit of a rule's name, room, energy or switch, as the table proposes it. */
type RuleEdit = PctTableEdit<
  Rule,
  {
    readonly name: string;
    readonly room: string;
    readonly energy: number | null;
    readonly enabled: boolean;
  }
>;

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
  return Array.from({ length: count }, (_, i) => registerAt(i));
}

/** The register at `i`: the same each time it is made, so a server can make it on demand. */
function registerAt(i: number): Register {
  return {
    id: i + 1,
    address: 40_001 + i,
    name:
      i % 25 === 12
        ? `${NAMES[i % NAMES.length]} ${i + 1}, the setpoint the schedule writes at night and the one a person writes by hand`
        : `${NAMES[i % NAMES.length]} ${i + 1}`,
    value: ((i * 7919) % 100_000) / 100,
    unit: UNITS[i % UNITS.length],
    enabled: i % 5 !== 2,
  };
}

const reg = pctColumnsOf<Register>();

/** The registers' columns: every key but the id. */
type RegisterColumn = Exclude<keyof Register, 'id'>;

/** The remote demo's columns: the registers' without the switch. */
type RemoteColumn = Exclude<RegisterColumn, 'enabled'>;

/** What the page demo asks its server for: a page of registers in an order, matching words. */
interface PageRequest {
  readonly page: number;
  readonly sort: readonly PctTableSort<RegisterColumn>[];
  readonly filter: string;
}

/** How many registers a page holds. */
const PAGE_SIZE = 20;

/** The server's registers: a thousand, sorted and filtered there, not in the table. */
const SERVED = registersOf(1_000);

/**
 * A server of registers, 300 ms away: it filters by every word in the name or the address,
 * sorts by the keys in order, and answers one page and the count of every match.
 */
/** A page the server answered: its rows, which page it is, and how many rows matched. */
interface PageAnswer {
  readonly rows: readonly Register[];
  readonly page: number;
  readonly total: number;
}

function serve(request: PageRequest, abort: AbortSignal): Promise<PageAnswer> {
  const words = request.filter.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = SERVED.filter((register) =>
    words.every(
      (word) =>
        register.name.toLowerCase().includes(word) ||
        String(register.address).includes(word),
    ),
  );
  const sorted = [...matched].sort((a, b) => {
    for (const { key, direction } of request.sort) {
      const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      if (order !== 0) return direction === 'descending' ? -order : order;
    }
    return 0;
  });
  const from = (request.page - 1) * PAGE_SIZE;
  return new Promise((done, fail) => {
    const timer = setTimeout(
      () =>
        done({
          rows: sorted.slice(from, from + PAGE_SIZE),
          page: request.page,
          total: matched.length,
        }),
      300,
    );
    abort.addEventListener('abort', () => {
      clearTimeout(timer);
      fail(abort.reason);
    });
  });
}

/** How many registers the remote demo's server holds: a million, made as they are asked for. */
const REMOTE_COUNT = 1_000_000;

/** The places of the server's registers whose names hold every word, kept by the question. */
const remoteMatches = new Map<string, Int32Array>();

function remoteMatching(filter: string): Int32Array | null {
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const key = words.join(' ');
  let places = remoteMatches.get(key);
  if (places === undefined) {
    const found: number[] = [];
    for (let i = 0; i < REMOTE_COUNT; i++) {
      const name = registerAt(i).name.toLowerCase();
      if (words.every((word) => name.includes(word))) found.push(i);
    }
    places = Int32Array.from(found);
    remoteMatches.set(key, places);
  }
  return places;
}

/** The blocks that failed once, so the demo's server fails each of them a first time only. */
const remoteFailed = new Set<string>();

/**
 * A server of a million registers, 300 ms away: it orders them by address either way, filters
 * by the words of a name, and fails every tenth block the first time it is asked for, so the
 * retry has something to do.
 */
function serveBlock(
  request: PctTableRequest<RemoteColumn>,
  abort: AbortSignal,
): Promise<PctTableAnswer<Register>> {
  const places = remoteMatching(request.filter);
  const total = places === null ? REMOTE_COUNT : places.length;
  const descending = request.sort[0]?.direction === 'descending';
  const rows: Register[] = [];
  for (let at = request.from; at < Math.min(request.to, total); at++) {
    const place = descending ? total - 1 - at : at;
    rows.push(registerAt(places === null ? place : places[place]));
  }
  const block = `${request.filter}|${descending}|${request.from}`;
  const fails =
    (request.from / (request.to - request.from)) % 10 === 9 &&
    !remoteFailed.has(block);
  if (fails) remoteFailed.add(block);
  return new Promise((done, fail) => {
    const timer = setTimeout(
      () =>
        fails
          ? fail(new Error('The server did not answer'))
          : done({ rows, total }),
      300,
    );
    abort.addEventListener('abort', () => {
      clearTimeout(timer);
      fail(abort.reason);
    });
  });
}

/**
 * Data table: the first layer drawn from data. What is worth watching: the columns are a
 * typed list, so the switch's template reads `rule.enabled` as a boolean; the header order is
 * a list of keys, Shift adds one; the quick filter searches the text the cells show; the empty
 * and loading states stand beside the table; and the live rows change their values with
 * their ids kept, so the focus in a switch stays where it is.
 */
/** A place of the home: a floor, a room or a device, each with the places inside it. */
interface Place {
  readonly id: string;
  readonly name: string;
  readonly kind: 'floor' | 'room' | 'device';
  readonly power: number;
  readonly places?: readonly Place[];
}

const device = (id: string, name: string, power: number): Place => ({
  id,
  name,
  kind: 'device',
  power,
});
const room = (id: string, name: string, places: readonly Place[]): Place => ({
  id,
  name,
  kind: 'room',
  power: places.reduce((sum, place) => sum + place.power, 0),
  places,
});
const floor = (id: string, name: string, places: readonly Place[]): Place => ({
  id,
  name,
  kind: 'floor',
  power: places.reduce((sum, place) => sum + place.power, 0),
  places,
});

const HOME: readonly Place[] = [
  floor('ground', 'Ground floor', [
    room('kitchen', 'Kitchen', [
      device('kettle', 'Kettle', 2000),
      device('fridge', 'Fridge', 120),
      device('lamp-k', 'Lamp', 12),
    ]),
    room('hall', 'Hall', [device('sensor', 'Motion sensor', 1)]),
    room('garage', 'Garage', []),
  ]),
  floor('upstairs', 'Upstairs', [
    room('bedroom', 'Bedroom', [
      device('lamp-b', 'Lamp', 9),
      device('heater', 'Heater', 1500),
    ]),
    room('bath', 'Bathroom', [device('fan', 'Fan', 40)]),
  ]),
];

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
    PctTableTree,
    PctTableSelection,
    PctTableWindow,
    PctTablePage,
    PctTableRemote,
    PctTableColumnFilters,
    PctFilterTemplate,
    PctTableColumns,
    PctTableColumnChooser,
    PctTableGrid,
    PctTableEditing,
    PctEditorTemplate,
    PctSelect,
    PctPagination,
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
  protected readonly treeColumns = pctColumnsOf<Place>().of([
    pctColumnsOf<Place>().key('name', { header: 'Name' }),
    pctColumnsOf<Place>().key('kind', { header: 'Kind' }),
    pctColumnsOf<Place>().key('power', {
      header: 'Power',
      kind: { number: { unit: 'W' } },
    }),
  ]);
  protected readonly home = signal<readonly Place[]>(HOME);
  protected readonly openPlaces = signal<readonly PctRowId[]>(['ground']);
  protected readonly treeFilter = signal('');
  protected readonly placesOf = (place: Place) => place.places;
  protected readonly byPlaceId = (place: Place) => place.id;

  /** A room added to the ground floor: the rows are new objects, the branches stay open. */
  protected addRoom(): void {
    this.home.update((floors) =>
      floors.map((f) =>
        f.id === 'ground'
          ? {
              ...f,
              places: [
                ...(f.places ?? []),
                room('office', 'Office', [device('pc', 'Computer', 200)]),
              ],
            }
          : f,
      ),
    );
  }
  protected readonly widths = [1200, 720, 360] as const;
  protected readonly width = signal<number>(1200);
  protected readonly detailRules = signal<readonly Rule[]>(RULES.slice(0, 8));
  protected readonly openRules = signal<readonly PctRowId[]>([]);
  protected readonly ran = signal('');
  protected readonly now = NOW;

  protected readonly rules = signal<readonly Rule[]>(RULES);

  /**
   * The rules filtered column by column: the name by its words, the room by the rooms the
   * rules stand in, the energy by a range, the next run by its days, the state by its word,
   * and the address by a half of the bus this view draws itself.
   */
  protected readonly filterColumns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room', columnFilter: 'values' }),
    col.key('address', {
      header: 'Address',
      numeric: true,
      filterBy: (address, half) =>
        half === 'low' ? address < 4128 : address >= 4128,
    }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
    col.key('nextAt', {
      header: 'Next run',
      kind: {
        instant: {
          timeZone: 'Europe/Warsaw',
          format: {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          },
        },
      },
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean' }),
  ]);
  protected readonly ruleFilters = signal<
    PctColumnFilters<
      typeof this.filterColumns extends { readonly __map?: infer M } ? M : never
    >
  >({});
  protected readonly filterRow = signal(false);
  protected readonly ruleFiltersText = computed(() =>
    JSON.stringify(this.ruleFilters()),
  );

  /** The rules laid out by the user: each column at a width that, together, the frame scrolls. */
  protected readonly layoutColumns = col.of([
    col.key('name', { header: 'Name', width: 200, minWidth: 140 }),
    col.key('room', { header: 'Room', width: 150 }),
    col.key('address', { header: 'Address', numeric: true, width: 150 }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      width: 140,
    }),
    col.key('nextAt', {
      header: 'Next run',
      kind: { instant: { relative: true, timeZone: 'Europe/Warsaw' } },
      width: 160,
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean' }),
  ]);
  protected readonly ruleLayout = signal<
    PctTableLayout<
      'name' | 'room' | 'address' | 'energy' | 'nextAt' | 'enabled'
    >
  >({});
  protected readonly ruleLayoutText = computed(() =>
    JSON.stringify(this.ruleLayout()),
  );

  /** The rules under grouped headers: a group's header spans its columns, two levels deep. */
  protected readonly headColumns = col.of([
    col.key('name', { header: 'Name', width: 200, minWidth: 140 }),
    col.key('room', { header: 'Room', width: 150, group: 'Where' }),
    col.key('address', {
      header: 'Address',
      numeric: true,
      width: 150,
      group: 'Where',
    }),
    col.key('energy', {
      header: 'Used',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      width: 140,
      group: 'Energy/This month',
    }),
    col.key('nextAt', {
      header: 'At',
      kind: { instant: { relative: true, timeZone: 'Europe/Warsaw' } },
      width: 160,
      group: 'Energy/Next run',
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean' }),
  ]);
  protected readonly headLayout = signal<
    PctTableLayout<
      'name' | 'room' | 'address' | 'energy' | 'nextAt' | 'enabled'
    >
  >({});
  protected readonly headLayoutText = computed(() =>
    JSON.stringify(this.headLayout()),
  );
  protected readonly laidPicked = signal<readonly PctRowId[]>([]);

  /** The grid's stop, its range and its picks, said under it as they change. */
  protected readonly gridPicked = signal<readonly PctRowId[]>([]);
  protected readonly gridFocused = signal<PctTableGridCell<
    'name' | 'room' | 'address' | 'energy' | 'nextAt' | 'enabled'
  > | null>(null);
  protected readonly gridRange = signal<PctTableCellRange<
    'name' | 'room' | 'address' | 'energy' | 'nextAt' | 'enabled'
  > | null>(null);
  protected readonly gridText = computed(() =>
    JSON.stringify({
      focused: this.gridFocused(),
      range: this.gridRange(),
      picked: this.gridPicked().length,
    }),
  );
  /** The rules edited in place: the table proposes each edit, and these are its rows. */
  protected readonly editColumns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean', sort: false }),
  ]);
  protected readonly editRules = signal<readonly Rule[]>(RULES.slice(0, 6));
  protected readonly editWhole = signal(false);
  protected readonly editCell = signal<{
    readonly row: PctRowId;
    readonly column: 'name' | 'room' | 'energy' | 'enabled';
  } | null>(null);
  protected readonly roomOptions: readonly PctSelectOption[] = ROOMS.map(
    (room) => ({ value: room, label: room }),
  );
  private readonly lastEdit = signal<RuleEdit | null>(null);
  protected readonly editText = computed(() => {
    const edit = this.lastEdit();
    return JSON.stringify({
      editing: this.editCell(),
      last:
        edit === null
          ? null
          : { id: edit.id, cause: edit.cause, changes: edit.changes },
    });
  });

  /** An edit the table proposed, applied: the rules are written anew with its values. */
  protected applyEdit(edit: RuleEdit): void {
    this.lastEdit.set(edit);
    this.editRules.update((rules) =>
      rules.map((rule) =>
        rule.id === edit.id
          ? edit.changes.reduce<Rule>(
              (one, change) => ({ ...one, [change.column]: change.value }),
              rule,
            )
          : rule,
      ),
    );
  }

  /** The rules as a file of the page's: the table writes the text, the page downloads it. */
  private readonly document = inject(DOCUMENT);
  private readonly editTable =
    viewChild.required<PctDataTable<Rule>>('editTable');
  protected downloadCsv(): void {
    const csv = pctTableCsv(this.editTable());
    this.download(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      'rules.csv',
    );
  }
  protected async downloadXlsx(): Promise<void> {
    this.download(await pctTableXlsx(this.editTable()), 'rules.xlsx');
  }
  private download(file: Blob, name: string): void {
    const url = URL.createObjectURL(file);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }

  /** The layout as an application keeps it: a string, read back as the model. */
  protected readonly savedLayout = signal('');
  protected saveLayout(): void {
    this.savedLayout.set(JSON.stringify(this.ruleLayout()));
  }
  protected restoreLayout(): void {
    this.ruleLayout.set(JSON.parse(this.savedLayout()));
  }
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

  /** The page demo's order and words, the table's models, read by the request. */
  protected readonly pageSort = signal<readonly PctTableSort<RegisterColumn>[]>(
    [],
  );
  protected readonly pageFilter = signal('');
  /** The page shown: back to the first whenever the order or the words change. */
  protected readonly page = linkedSignal({
    source: () => [this.pageSort(), this.pageFilter()],
    computation: () => 1,
  });
  /** How many times the server was asked: one request a change. */
  protected readonly served = signal(0);
  protected readonly pageResource = resource({
    params: (): PageRequest => ({
      page: this.page(),
      sort: this.pageSort(),
      filter: this.pageFilter(),
    }),
    loader: ({ params, abortSignal }) => {
      this.served.update((count) => count + 1);
      return serve(params, abortSignal);
    },
  });
  /**
   * The last page answered, kept while the next one loads: a resource with new params has no
   * value until they are answered, and the table would empty and the pages shrink to one.
   */
  protected readonly answered = linkedSignal<
    PageAnswer | undefined,
    PageAnswer | undefined
  >({
    source: () => this.pageResource.value(),
    computation: (answer, previous) => answer ?? previous?.value,
  });
  protected readonly pageRows = computed(() => this.answered()?.rows ?? []);
  protected readonly pageTotal = computed(() => this.answered()?.total ?? 0);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.pageTotal() / PAGE_SIZE)),
  );
  /** The rows before the page shown — the one answered, not the one asked for. */
  protected readonly pageOffset = computed(
    () => ((this.answered()?.page ?? 1) - 1) * PAGE_SIZE,
  );

  /** The remote demo's columns: the server orders by address, and by nothing else. */
  protected readonly remoteColumns = reg.of([
    reg.key('address', { header: 'Address', numeric: true }),
    reg.key('name', { header: 'Name', sort: false }),
    reg.key('value', {
      header: 'Value',
      kind: { number: { fractionDigits: 2 } },
      sort: false,
    }),
    reg.key('unit', { header: 'Unit', sort: false }),
  ]);
  protected readonly remoteSort = signal<readonly PctTableSort<RemoteColumn>[]>(
    [],
  );
  protected readonly remoteFilter = signal('');
  /** How many blocks the server was asked for. */
  protected readonly remoteAsked = signal(0);
  protected readonly loadRegisters: PctTableLoad<Register, RemoteColumn> = (
    request,
    abort,
  ) => {
    this.remoteAsked.update((count) => count + 1);
    return serveBlock(request, abort);
  };

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
