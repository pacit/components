import { pctWallClockOf } from '@pacit/components/core';
import {
  pctTimeStep,
  pctTimeTickText,
  pctTimeTicks,
  type PctTimeStep,
} from './time-ticks';
import {
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../../testing/src/property.testkit';

const H = 3_600_000;
const iso = (at: number) => new Date(at).toISOString().slice(0, 16);
const ticksOf = (
  from: number,
  to: number,
  step: PctTimeStep,
  zone?: string,
  weekStart?: number,
) =>
  pctTimeTicks({ from, to }, step, zone, weekStart).map(
    (t) => `${iso(t.at)} ${t.label}`,
  );

describe('pctTimeStep', () => {
  it('takes the finest step that leaves the spacing between ticks', () => {
    expect(pctTimeStep(24 * H, 700)).toEqual({ unit: 'hour', count: 3 });
    expect(pctTimeStep(24 * H, 1400)).toEqual({ unit: 'hour', count: 2 });
    expect(pctTimeStep(120_000, 700)).toEqual({ unit: 'second', count: 15 });
    expect(pctTimeStep(7 * 24 * H, 700)).toEqual({ unit: 'day', count: 1 });
    expect(pctTimeStep(60 * 24 * H, 700)).toEqual({ unit: 'week', count: 1 });
    expect(pctTimeStep(365 * 24 * H, 700)).toEqual({ unit: 'month', count: 3 });
    expect(pctTimeStep(24 * H, 700, 35)).toEqual({ unit: 'hour', count: 2 });
  });

  it('steps by whole minutes for windows of minutes', () => {
    expect(pctTimeStep(10 * 60_000, 700)).toEqual({ unit: 'minute', count: 1 });
    expect(pctTimeStep(20 * 60_000, 700)).toEqual({ unit: 'minute', count: 2 });
    expect(pctTimeStep(50 * 60_000, 700)).toEqual({ unit: 'minute', count: 5 });
  });

  it('asks for one tick at least, however narrow the axis', () => {
    expect(pctTimeStep(H, 10)).toEqual({ unit: 'hour', count: 1 });
    expect(pctTimeStep(0, 700)).toEqual({ unit: 'second', count: 1 });
  });

  it('steps in whole years of 1, 2 or 5 times a power of ten beyond a year', () => {
    const year = 365.2425 * 24 * H;
    expect(pctTimeStep(5 * year, 700)).toEqual({ unit: 'month', count: 6 });
    expect(pctTimeStep(8 * year, 700)).toEqual({ unit: 'year', count: 1 });
    expect(pctTimeStep(50 * year, 700)).toEqual({ unit: 'year', count: 5 });
    expect(pctTimeStep(300 * year, 700)).toEqual({ unit: 'year', count: 50 });
    expect(pctTimeStep(12 * year, 70)).toEqual({ unit: 'year', count: 20 });
    // never closer than the spacing: thirteen years in 700 px are two-year steps, not one
    expect(pctTimeStep(13 * year, 700)).toEqual({ unit: 'year', count: 2 });
    expect(pctTimeStep(10 * year, 700)).toEqual({ unit: 'year', count: 1 });
  });
});

describe('pctTimeTicks', () => {
  it('keeps 00:00, 06:00, 12:00 and 18:00 on the day of twenty-five hours', () => {
    expect(
      ticksOf(
        Date.UTC(2026, 9, 24, 22),
        Date.UTC(2026, 9, 25, 23),
        { unit: 'hour', count: 6 },
        'Europe/Warsaw',
      ),
    ).toEqual([
      '2026-10-24T22:00 date',
      '2026-10-25T05:00 time',
      '2026-10-25T11:00 time',
      '2026-10-25T17:00 time',
      '2026-10-25T23:00 date',
    ]);
  });

  it('gives a wall clock shown twice two ticks, an hour apart', () => {
    expect(
      ticksOf(
        Date.UTC(2026, 9, 24, 23, 30),
        Date.UTC(2026, 9, 25, 2, 30),
        { unit: 'hour', count: 1 },
        'Europe/Warsaw',
      ),
    ).toEqual([
      '2026-10-25T00:00 time',
      '2026-10-25T01:00 time',
      '2026-10-25T02:00 time',
    ]);
  });

  it('gives a skipped wall clock no tick within a day', () => {
    expect(
      ticksOf(
        Date.UTC(2026, 2, 28, 23, 30),
        Date.UTC(2026, 2, 29, 2, 30),
        { unit: 'hour', count: 1 },
        'Europe/Warsaw',
      ),
    ).toEqual([
      '2026-03-29T00:00 time',
      '2026-03-29T01:00 time',
      '2026-03-29T02:00 time',
    ]);
  });

  it('starts a day where the zone starts it when midnight is skipped', () => {
    // São Paulo moved its clocks at midnight in 2018: the 4th of November began at 01:00
    expect(
      ticksOf(
        Date.UTC(2018, 10, 3, 12),
        Date.UTC(2018, 10, 5, 12),
        { unit: 'day', count: 1 },
        'America/Sao_Paulo',
      ),
    ).toEqual(['2018-11-04T03:00 date', '2018-11-05T02:00 date']);
    expect(
      ticksOf(
        Date.UTC(2018, 10, 4, 1),
        Date.UTC(2018, 10, 4, 5),
        { unit: 'hour', count: 1 },
        'America/Sao_Paulo',
      ),
    ).toEqual([
      '2018-11-04T01:00 time',
      '2018-11-04T02:00 time',
      '2018-11-04T03:00 date',
      '2018-11-04T04:00 time',
      '2018-11-04T05:00 time',
    ]);
  });

  it('steps by seconds and minutes on the wall clock', () => {
    const seconds = pctTimeTicks(
      {
        from: Date.UTC(2026, 0, 1, 12, 0, 3),
        to: Date.UTC(2026, 0, 1, 12, 0, 20),
      },
      { unit: 'second', count: 5 },
      'UTC',
    );
    expect(
      seconds.map((t) => new Date(t.at).toISOString().slice(11, 19)),
    ).toEqual(['12:00:05', '12:00:10', '12:00:15', '12:00:20']);
    const quarters = pctTimeTicks(
      { from: Date.UTC(2026, 0, 1, 23, 20), to: Date.UTC(2026, 0, 2, 0, 50) },
      { unit: 'minute', count: 15 },
      'UTC',
    );
    expect(quarters.map((t) => `${iso(t.at)} ${t.label}`)).toEqual([
      '2026-01-01T23:30 time',
      '2026-01-01T23:45 time',
      '2026-01-02T00:00 date',
      '2026-01-02T00:15 time',
      '2026-01-02T00:30 time',
      '2026-01-02T00:45 time',
    ]);
  });

  it('places a step of two days on every second day of the epoch (1 January 2026 is day 20 454)', () => {
    expect(
      ticksOf(
        Date.UTC(2026, 0, 1, 12),
        Date.UTC(2026, 0, 6, 12),
        { unit: 'day', count: 2 },
        'UTC',
      ),
    ).toEqual(['2026-01-03T00:00 date', '2026-01-05T00:00 date']);
  });

  it('starts a week on the day it is told', () => {
    const from = Date.UTC(2026, 9, 20);
    const to = Date.UTC(2026, 10, 10);
    expect(ticksOf(from, to, { unit: 'week', count: 1 }, 'UTC')).toEqual([
      '2026-10-26T00:00 date',
      '2026-11-02T00:00 date',
      '2026-11-09T00:00 date',
    ]);
    expect(ticksOf(from, to, { unit: 'week', count: 1 }, 'UTC', 7)).toEqual([
      '2026-10-25T00:00 date',
      '2026-11-01T00:00 date',
      '2026-11-08T00:00 date',
    ]);
    expect(ticksOf(from, to, { unit: 'week', count: 1 }, 'UTC', 2)).toEqual([
      '2026-10-20T00:00 date',
      '2026-10-27T00:00 date',
      '2026-11-03T00:00 date',
      '2026-11-10T00:00 date',
    ]);
  });

  it('steps by months and years from their first days, January written as the year', () => {
    expect(
      ticksOf(
        Date.UTC(2026, 0, 15),
        Date.UTC(2026, 11, 31),
        { unit: 'month', count: 3 },
        'UTC',
      ),
    ).toEqual([
      '2026-04-01T00:00 month',
      '2026-07-01T00:00 month',
      '2026-10-01T00:00 month',
    ]);
    expect(
      ticksOf(
        Date.UTC(2025, 11, 1),
        Date.UTC(2026, 1, 1),
        { unit: 'month', count: 1 },
        'UTC',
      ),
    ).toEqual([
      '2025-12-01T00:00 month',
      '2026-01-01T00:00 year',
      '2026-02-01T00:00 month',
    ]);
    expect(
      ticksOf(
        Date.UTC(2019, 5),
        Date.UTC(2024, 5),
        { unit: 'year', count: 2 },
        'UTC',
      ),
    ).toEqual([
      '2020-01-01T00:00 year',
      '2022-01-01T00:00 year',
      '2024-01-01T00:00 year',
    ]);
  });

  it("places a month at the zone's midnight", () => {
    expect(
      ticksOf(
        Date.UTC(2026, 5, 20),
        Date.UTC(2026, 6, 20),
        { unit: 'month', count: 1 },
        'Europe/Warsaw',
      ),
    ).toEqual(['2026-06-30T22:00 month']);
  });

  it('has no tick for a window that runs backwards or is not a number', () => {
    expect(
      pctTimeTicks({ from: 10, to: 5 }, { unit: 'hour', count: 1 }, 'UTC'),
    ).toEqual([]);
    expect(
      pctTimeTicks({ from: NaN, to: NaN }, { unit: 'hour', count: 1 }, 'UTC'),
    ).toEqual([]);
  });

  it('gives a window of one instant the tick standing on it', () => {
    const at = Date.UTC(2026, 0, 1, 12);
    expect(
      pctTimeTicks({ from: at, to: at }, { unit: 'hour', count: 1 }, 'UTC'),
    ).toEqual([{ at, label: 'time' }]);
  });

  it('includes a tick standing exactly on either end of the window', () => {
    const from = Date.UTC(2026, 0, 1, 12, 0, 5);
    const to = Date.UTC(2026, 0, 1, 12, 0, 15);
    expect(
      pctTimeTicks({ from, to }, { unit: 'second', count: 5 }, 'UTC').map(
        (t) => t.at,
      ),
    ).toEqual([from, from + 5000, to]);
    // and with milliseconds past each end, the ticks inside them
    const ticks = pctTimeTicks(
      { from: from - 300, to: to + 700 },
      { unit: 'second', count: 5 },
      'UTC',
    );
    expect(ticks.map((t) => t.at)).toEqual([from, from + 5000, to]);
  });

  it('labels a tick of seconds as a time, and midnight as a date', () => {
    const ticks = pctTimeTicks(
      {
        from: Date.UTC(2026, 0, 1, 23, 59, 50),
        to: Date.UTC(2026, 0, 2, 0, 0, 10),
      },
      { unit: 'second', count: 5 },
      'UTC',
    );
    expect(
      ticks.map(
        (t) => `${new Date(t.at).toISOString().slice(11, 19)} ${t.label}`,
      ),
    ).toEqual([
      '23:59:50 time',
      '23:59:55 time',
      '00:00:00 date',
      '00:00:05 time',
      '00:00:10 time',
    ]);
  });

  it('gives a quarter skipped by a change of half an hour no tick', () => {
    // Lord Howe Island moves from +10:30 to +11:00 at 02:00 on 4 October 2026: 02:00 to 02:29 are skipped
    const zone = 'Australia/Lord_Howe';
    const ticks = pctTimeTicks(
      { from: Date.UTC(2026, 9, 3, 15, 0), to: Date.UTC(2026, 9, 3, 16, 0) },
      { unit: 'minute', count: 15 },
      zone,
    );
    expect(
      ticks
        .map((t) => pctWallClockOf(t.at, zone))
        .map((c) => `${c.hour}:${c.minute}`),
    ).toEqual(['1:30', '1:45', '2:30', '2:45', '3:0']);
  });

  it('starts a day the zone skipped whole where the next one starts, once', () => {
    // Samoa skipped 30 December 2011, from the 29th straight into the 31st
    const ticks = pctTimeTicks(
      { from: Date.UTC(2011, 11, 28, 12), to: Date.UTC(2011, 11, 31, 12) },
      { unit: 'day', count: 1 },
      'Pacific/Apia',
    );
    expect(ticks.map((t) => `${iso(t.at)} ${t.label}`)).toEqual([
      '2011-12-29T10:00 date',
      '2011-12-30T10:00 date',
      '2011-12-31T10:00 date',
    ]);
  });

  it('marks every aligned wall clock in the window, and nothing else, in zones chosen for their trouble', () => {
    const steps: PctTimeStep[] = [
      { unit: 'minute', count: 15 },
      { unit: 'minute', count: 30 },
      { unit: 'hour', count: 1 },
      { unit: 'hour', count: 3 },
    ];
    const cases = pctRecord({
      zone: pctOneOf([
        'Europe/Warsaw',
        'Australia/Lord_Howe',
        'Asia/Kathmandu',
        'America/Sao_Paulo',
        'Pacific/Chatham',
        'UTC',
      ] as const),
      at: pctInt(
        Date.UTC(2017, 0, 1) / 900_000,
        Date.UTC(2027, 0, 1) / 900_000,
      ),
      hours: pctInt(1, 30),
      step: pctInt(0, 3),
    });
    pctForAll(
      cases,
      ({ zone, at, hours, step }) => {
        const from = at * 900_000 + 7_000;
        const to = from + hours * H;
        const s = steps[step];
        const got = pctTimeTicks({ from, to }, s, zone).map((t) => t.at);
        const minutes = s.unit === 'hour' ? 60 * s.count : s.count;
        const want: number[] = [];
        for (let t = Math.ceil(from / 60_000) * 60_000; t <= to; t += 60_000) {
          const c = pctWallClockOf(t, zone);
          if ((c.hour * 60 + c.minute) % minutes === 0) want.push(t);
        }
        expect(got).toEqual(want);
      },
      { runs: 60 },
    );
  });
});

describe('pctTimeTicks around the odd changes of clocks', () => {
  it('starts a day once when the zone shows its midnight twice', () => {
    // Havana falls back from 01:00 to 00:00 on 1 November 2026
    const zone = 'America/Havana';
    const days = pctTimeTicks(
      { from: Date.UTC(2026, 9, 31, 12), to: Date.UTC(2026, 10, 2, 12) },
      { unit: 'day', count: 1 },
      zone,
    );
    expect(days.map((t) => iso(t.at))).toEqual([
      '2026-11-01T04:00',
      '2026-11-02T05:00',
    ]);
    const months = pctTimeTicks(
      { from: Date.UTC(2026, 9, 15), to: Date.UTC(2026, 10, 15) },
      { unit: 'month', count: 1 },
      zone,
    );
    expect(months.map((t) => iso(t.at))).toEqual(['2026-11-01T04:00']);
  });

  it('labels with the date the first tick of a day whose midnight was skipped', () => {
    // Santiago skips 00:00 on 6 September 2026: the day starts at 01:00
    const zone = 'America/Santiago';
    const ticks = pctTimeTicks(
      { from: Date.UTC(2026, 8, 5, 22), to: Date.UTC(2026, 8, 6, 16) },
      { unit: 'hour', count: 6 },
      zone,
    );
    expect(
      ticks.map((t) => `${pctWallClockOf(t.at, zone).hour} ${t.label}`),
    ).toEqual(['18 time', '6 date', '12 time']);
  });

  it('reads the years before a hundred as years', () => {
    const ticks = pctTimeTicks(
      { from: Date.UTC(2026, 0, 1) - 1, to: Date.UTC(2026, 0, 1) + 1 },
      { unit: 'year', count: 1 },
      'UTC',
    );
    expect(ticks).toHaveLength(1);
    const early = new Date(0);
    early.setUTCFullYear(50, 0, 1);
    const fifty = pctTimeTicks(
      { from: early.getTime() - 1, to: early.getTime() + 1 },
      { unit: 'year', count: 1 },
      'UTC',
    );
    expect(fifty.map((t) => t.at)).toEqual([early.getTime()]);
  });
});

describe('pctTimeTickText', () => {
  const at = Date.UTC(2026, 9, 28, 14, 0, 15);
  const hour = { unit: 'hour', count: 3 } as const;
  it('writes a tick as the locale writes a time, a date, a month and a year', () => {
    expect(
      pctTimeTickText({ at, label: 'time' }, hour, 'pl', 'Europe/Warsaw'),
    ).toBe('15:00');
    expect(
      pctTimeTickText(
        { at, label: 'time' },
        { unit: 'second', count: 15 },
        'pl',
        'Europe/Warsaw',
      ),
    ).toBe('15:00:15');
    expect(
      pctTimeTickText({ at, label: 'date' }, hour, 'pl', 'Europe/Warsaw'),
    ).toBe('28.10');
    expect(
      pctTimeTickText({ at, label: 'date' }, hour, 'en-US', 'Europe/Warsaw'),
    ).toBe('10/28');
    expect(
      pctTimeTickText({ at, label: 'month' }, hour, 'en-GB', 'Europe/Warsaw'),
    ).toBe('Oct');
    expect(
      pctTimeTickText({ at, label: 'year' }, hour, 'pl', 'Europe/Warsaw'),
    ).toBe('2026');
  });

  it('reads the time in the zone it is given', () => {
    expect(pctTimeTickText({ at, label: 'time' }, hour, 'pl', 'UTC')).toBe(
      '14:00',
    );
    expect(
      pctTimeTickText({ at, label: 'time' }, hour, 'pl', 'Asia/Kathmandu'),
    ).toBe('19:45');
  });

  it('keeps a formatter per locale, zone and kind, and the same one when asked again', () => {
    const Real = Intl.DateTimeFormat;
    let made = 0;
    class Counted extends Real {
      constructor(...args: ConstructorParameters<typeof Real>) {
        super(...args);
        made++;
      }
    }
    Intl.DateTimeFormat = Counted as typeof Intl.DateTimeFormat;
    try {
      expect(pctTimeTickText({ at, label: 'time' }, hour, 'fr', 'UTC')).toBe(
        '14:00',
      );
      expect(pctTimeTickText({ at, label: 'time' }, hour, 'fr', 'UTC')).toBe(
        '14:00',
      );
      expect(made).toBe(1);
      expect(
        pctTimeTickText(
          { at, label: 'time' },
          { unit: 'second', count: 5 },
          'fr',
          'UTC',
        ),
      ).toBe('14:00:15');
      expect(
        pctTimeTickText(
          { at, label: 'date' },
          { unit: 'second', count: 5 },
          'fr',
          'UTC',
        ),
      ).toBe('28/10');
      expect(made).toBe(3);
    } finally {
      Intl.DateTimeFormat = Real;
    }
  });

  it("reads the runtime's zone when given none", () => {
    const expected = new Intl.DateTimeFormat('de', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(at);
    expect(pctTimeTickText({ at, label: 'time' }, hour, 'de')).toBe(expected);
  });
});
