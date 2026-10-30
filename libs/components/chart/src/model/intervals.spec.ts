import {
  pctIntervalNext,
  pctIntervals,
  pctIntervalStart,
  pctIntervalText,
} from './intervals';

const H = 3_600_000;
const D = 24 * H;
/** Midnight in Warsaw on 25 October 2026, the day of twenty-five hours: 22:00 UTC the day before. */
const DST = Date.UTC(2026, 9, 24, 22);
/** Midnight in Warsaw on 29 March 2026, the day of twenty-three hours. */
const SPRING = Date.UTC(2026, 2, 28, 23);

describe('pctIntervalStart', () => {
  it('finds the hour, the day, the week, the month and the year an instant stands in, in the zone', () => {
    const at = Date.UTC(2026, 9, 28, 13, 45); // Wednesday 14:45 in Warsaw
    expect(pctIntervalStart(at, 'hour', 'Europe/Warsaw')).toBe(
      Date.UTC(2026, 9, 28, 13),
    );
    expect(pctIntervalStart(at, 'day', 'Europe/Warsaw')).toBe(
      Date.UTC(2026, 9, 27, 23),
    );
    expect(pctIntervalStart(at, 'week', 'Europe/Warsaw')).toBe(
      Date.UTC(2026, 9, 25, 23), // Monday 26 October, after the clocks went back
    );
    expect(pctIntervalStart(at, 'month', 'Europe/Warsaw')).toBe(
      Date.UTC(2026, 8, 30, 22), // 1 October, still at summer time
    );
    expect(pctIntervalStart(at, 'year', 'Europe/Warsaw')).toBe(
      Date.UTC(2025, 11, 31, 23),
    );
  });

  it('cuts whole hours of a zone half an hour off UTC', () => {
    const at = Date.UTC(2026, 9, 28, 13, 45); // 19:15 in Kolkata, UTC+5:30
    expect(pctIntervalStart(at, 'hour', 'Asia/Kolkata')).toBe(
      Date.UTC(2026, 9, 28, 13, 30),
    );
    expect(
      pctIntervalNext(Date.UTC(2026, 9, 28, 13, 30), 'hour', 'Asia/Kolkata'),
    ).toBe(Date.UTC(2026, 9, 28, 14, 30));
  });

  it('starts a week on the day asked for', () => {
    const at = Date.UTC(2026, 9, 28, 12);
    expect(pctIntervalStart(at, 'week', 'UTC', 7)).toBe(Date.UTC(2026, 9, 25)); // Sunday
    expect(pctIntervalStart(at, 'week', 'UTC', 3)).toBe(Date.UTC(2026, 9, 28)); // Wednesday, today
    expect(pctIntervalStart(at, 'week', 'UTC', 4)).toBe(Date.UTC(2026, 9, 22)); // Thursday, last week
  });

  it('starts a day the zone skips midnight on at the first moment it shows', () => {
    // Santiago skips midnight on 6 September 2026: the day starts at 01:00
    const at = Date.UTC(2026, 8, 6, 12);
    const start = pctIntervalStart(at, 'day', 'America/Santiago');
    expect(start).toBe(Date.UTC(2026, 8, 6, 4)); // 01:00 at UTC−3
  });

  it('reads the runtime zone when none is given', () => {
    const at = Date.UTC(2026, 9, 28, 13, 45);
    const date = new Date(at);
    const local = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
    expect(pctIntervalStart(at, 'day')).toBe(local);
  });
});

describe('pctIntervalNext', () => {
  it('moves an hour, a day, a week, a month and a year on the wall clock', () => {
    const day = Date.UTC(2026, 9, 27, 23); // 28 October, Warsaw
    expect(
      pctIntervalNext(Date.UTC(2026, 9, 28, 13), 'hour', 'Europe/Warsaw'),
    ).toBe(Date.UTC(2026, 9, 28, 14));
    expect(pctIntervalNext(day, 'day', 'Europe/Warsaw')).toBe(day + D);
    expect(
      pctIntervalNext(Date.UTC(2026, 9, 25, 23), 'week', 'Europe/Warsaw'),
    ).toBe(Date.UTC(2026, 10, 1, 23));
    expect(
      pctIntervalNext(Date.UTC(2026, 8, 30, 22), 'month', 'Europe/Warsaw'),
    ).toBe(Date.UTC(2026, 9, 31, 23));
    expect(
      pctIntervalNext(Date.UTC(2026, 10, 30, 23), 'month', 'Europe/Warsaw'),
    ).toBe(Date.UTC(2026, 11, 31, 23));
    expect(
      pctIntervalNext(Date.UTC(2025, 11, 31, 23), 'year', 'Europe/Warsaw'),
    ).toBe(Date.UTC(2026, 11, 31, 23));
  });

  it('gives the day of twenty-five hours its twenty-five, and the day of twenty-three its twenty-three', () => {
    expect(pctIntervalNext(DST, 'day', 'Europe/Warsaw')).toBe(DST + 25 * H);
    expect(pctIntervalNext(SPRING, 'day', 'Europe/Warsaw')).toBe(
      SPRING + 23 * H,
    );
    // the hour the clocks go back is shown twice: 02:00 CEST, then 02:00 CET an hour later
    const two = DST + 2 * H;
    expect(pctIntervalNext(two, 'hour', 'Europe/Warsaw')).toBe(two + H);
    expect(pctIntervalNext(two + H, 'hour', 'Europe/Warsaw')).toBe(two + 2 * H);
  });

  it('carries an hour across a day and a year', () => {
    expect(pctIntervalNext(Date.UTC(2026, 11, 31, 23), 'hour', 'UTC')).toBe(
      Date.UTC(2027, 0, 1, 0),
    );
  });
});

describe('pctIntervals', () => {
  it('cuts a window into the intervals it touches, the first holding its start and the last its end', () => {
    const spans = pctIntervals(
      { from: Date.UTC(2026, 9, 28, 1, 30), to: Date.UTC(2026, 9, 28, 4, 10) },
      'hour',
      'UTC',
    );
    expect(spans).toEqual([
      { from: Date.UTC(2026, 9, 28, 1), to: Date.UTC(2026, 9, 28, 2) },
      { from: Date.UTC(2026, 9, 28, 2), to: Date.UTC(2026, 9, 28, 3) },
      { from: Date.UTC(2026, 9, 28, 3), to: Date.UTC(2026, 9, 28, 4) },
      { from: Date.UTC(2026, 9, 28, 4), to: Date.UTC(2026, 9, 28, 5) },
    ]);
  });

  it('does not reach into the interval a window ends on the first moment of', () => {
    expect(
      pctIntervals(
        { from: Date.UTC(2026, 9, 28, 1), to: Date.UTC(2026, 9, 28, 3) },
        'hour',
        'UTC',
      ),
    ).toHaveLength(2);
    expect(
      pctIntervals(
        { from: Date.UTC(2026, 9, 28, 1), to: Date.UTC(2026, 9, 28, 3) + 1 },
        'hour',
        'UTC',
      ),
    ).toHaveLength(3);
  });

  it('gives a window of one instant the interval it stands in, and an inverted one nothing', () => {
    const at = Date.UTC(2026, 9, 28, 1, 30);
    expect(pctIntervals({ from: at, to: at }, 'hour', 'UTC')).toEqual([
      { from: Date.UTC(2026, 9, 28, 1), to: Date.UTC(2026, 9, 28, 2) },
    ]);
    const start = Date.UTC(2026, 9, 28, 1);
    expect(pctIntervals({ from: start, to: start }, 'hour', 'UTC')).toEqual([
      { from: start, to: start + H },
    ]);
    expect(pctIntervals({ from: at, to: at - 1 }, 'hour', 'UTC')).toEqual([]);
  });

  it('cuts the days of Warsaw across the change of clocks, twenty-five hours long on the day', () => {
    const spans = pctIntervals(
      { from: DST - 2 * D, to: DST + 25 * H + D },
      'day',
      'Europe/Warsaw',
    );
    expect(spans.map((s) => (s.to - s.from) / H)).toEqual([24, 24, 25, 24]);
    expect(spans[2]).toEqual({ from: DST, to: DST + 25 * H });
  });

  it('cuts months and weeks on the wall clock', () => {
    const months = pctIntervals(
      { from: Date.UTC(2026, 0, 15), to: Date.UTC(2026, 2, 15) },
      'month',
      'UTC',
    );
    expect(
      months.map((m) => new Date(m.from).toISOString().slice(0, 10)),
    ).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    // February has 28 days in 2026 and March 31: the bars that compare them by position say so
    expect(months.map((m) => (m.to - m.from) / D)).toEqual([31, 28, 31]);
    const weeks = pctIntervals(
      { from: Date.UTC(2026, 9, 28), to: Date.UTC(2026, 10, 10) },
      'week',
      'UTC',
    );
    expect(weeks.map((w) => new Date(w.from).getUTCDate())).toEqual([26, 2, 9]);
    expect(
      pctIntervals(
        { from: Date.UTC(2026, 9, 28), to: Date.UTC(2026, 10, 10) },
        'week',
        'UTC',
        7,
      ).map((w) => new Date(w.from).getUTCDate()),
    ).toEqual([25, 1, 8]);
  });
});

describe('pctIntervalText', () => {
  it('writes the hour, the weekday and day, the week by its first date, the month and the year', () => {
    const start = Date.UTC(2026, 9, 25, 23); // Monday 26 October 2026, 00:00 in Warsaw
    expect(pctIntervalText(start, 'hour', 'en-GB', 'Europe/Warsaw')).toBe('00');
    expect(
      pctIntervalText(start + 14 * H, 'hour', 'en-GB', 'Europe/Warsaw'),
    ).toBe('14');
    expect(pctIntervalText(start, 'day', 'en-GB', 'Europe/Warsaw')).toBe(
      'Mon 26',
    );
    expect(pctIntervalText(start, 'week', 'en-GB', 'Europe/Warsaw')).toBe(
      '26/10',
    );
    expect(pctIntervalText(start, 'month', 'en-GB', 'Europe/Warsaw')).toBe(
      'Oct',
    );
    expect(pctIntervalText(start, 'year', 'en-GB', 'Europe/Warsaw')).toBe(
      '2026',
    );
    // the zone decides the date: the same instant is still Sunday in Chicago
    expect(pctIntervalText(start, 'day', 'en-US', 'America/Chicago')).toBe(
      '25 Sun',
    );
  });
});
