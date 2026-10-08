import {
  pctLattice,
  pctNearest,
  pctSecondsOf,
  pctUnbounded,
  pctWrite,
} from './lattice';

/** `HH:mm[:ss]` as seconds, so the expectations read as times. */
const at = pctSecondsOf;

describe('the lattice — which times a field offers', () => {
  it('reads a time as seconds since midnight, in either shape', () => {
    expect(pctSecondsOf('00:00')).toBe(0);
    expect(pctSecondsOf('13:05')).toBe(47_100);
    expect(pctSecondsOf('13:05:09')).toBe(47_109);
    expect(pctSecondsOf('23:59:59')).toBe(86_399);
  });

  it('counts the step from min, and from midnight without one', () => {
    expect(pctLattice(900, undefined, undefined).base).toBe(0);
    expect(pctLattice(900, '09:05', undefined).base).toBe(at('09:05'));
    expect(pctLattice(900, undefined, '17:00').base).toBe(0);
  });

  it('has seconds where the step divides a minute, or counts from a time that has them', () => {
    expect(pctLattice(60, undefined, undefined).seconds).toBe(false);
    expect(pctLattice(900, '09:05', undefined).seconds).toBe(false);
    expect(pctLattice(3600, undefined, undefined).seconds).toBe(false);
    expect(pctLattice(1, undefined, undefined).seconds).toBe(true);
    expect(pctLattice(30, undefined, undefined).seconds).toBe(true);
    // A minute step counted from a time with seconds puts those seconds into every time on it.
    expect(pctLattice(60, '09:05:30', undefined).seconds).toBe(true);
    // A bound with seconds that the step is NOT counted from leaves the shape alone.
    expect(pctLattice(60, undefined, '17:00:30').seconds).toBe(false);
  });

  it('lets the whole day through with no bounds, and cuts it with one or both', () => {
    expect(pctLattice(60, undefined, undefined).bounds).toEqual([[0, 86_399]]);
    expect(pctLattice(60, '09:00', undefined).bounds).toEqual([
      [at('09:00'), 86_399],
    ]);
    expect(pctLattice(60, undefined, '17:00').bounds).toEqual([
      [0, at('17:00')],
    ]);
    expect(pctLattice(60, '09:00', '17:00').bounds).toEqual([
      [at('09:00'), at('17:00')],
    ]);
    // Equal bounds are one time, not a window.
    expect(pctLattice(60, '09:00', '09:00').bounds).toEqual([
      [at('09:00'), at('09:00')],
    ]);
  });

  it('reads min later than max as a window across midnight (0086, A12)', () => {
    expect(pctLattice(60, '22:00', '06:00').bounds).toEqual([
      [at('22:00'), 86_399],
      [0, at('06:00')],
    ]);
  });

  it('forgets the bounds and keeps the step when asked which rows exist at all', () => {
    const bounded = pctLattice(900, '09:05', '10:00');
    const all = pctUnbounded(bounded);
    expect(all.bounds).toEqual([[0, 86_399]]);
    expect(all.step).toBe(900);
    expect(all.base).toBe(at('09:05'));
    expect(all.seconds).toBe(false);
  });
});

describe('pctNearest — where a walk lands', () => {
  const day = (lattice: ReturnType<typeof pctLattice>, time: string) =>
    pctNearest(lattice, at(time), 0, 86_399);

  it('answers a time on the step and inside the bounds with itself', () => {
    const q = pctLattice(900, undefined, undefined);
    expect(day(q, '13:15')).toBe(at('13:15'));
    expect(day(q, '00:00')).toBe(0);
    expect(day(q, '23:45')).toBe(at('23:45'));
  });

  it('goes to the nearer time on the step, and halfway to the later one', () => {
    const q = pctLattice(900, undefined, undefined);
    expect(day(q, '13:07')).toBe(at('13:00'));
    expect(day(q, '13:08')).toBe(at('13:15'));
    // 13:07:30 is exactly halfway — up, as `Math.round` goes.
    expect(day(pctLattice(900, undefined, undefined), '13:07:30')).toBe(
      at('13:15'),
    );
    expect(day(q, '13:07:29')).toBe(at('13:00'));
  });

  it('counts the step from its base', () => {
    const q = pctLattice(900, '09:05', undefined);
    expect(day(q, '13:05')).toBe(at('13:05'));
    expect(day(q, '13:12')).toBe(at('13:05'));
    expect(day(q, '13:13')).toBe(at('13:20'));
  });

  it('keeps inside the day: the last time on the step before midnight, not the next day', () => {
    const q = pctLattice(3600, undefined, undefined);
    expect(day(q, '23:59:50')).toBe(at('23:00'));
  });

  it('is pulled to the nearer bound from outside them, on the step', () => {
    const q = pctLattice(900, '09:00', '17:50');
    expect(day(q, '08:00')).toBe(at('09:00'));
    // `max` is off the step, so the last time on it at or before `max` is the edge.
    expect(day(q, '18:00')).toBe(at('17:45'));
    expect(day(q, '17:50')).toBe(at('17:45'));
  });

  it('from the gap of a window, goes to the nearer end of it', () => {
    const q = pctLattice(1800, '22:00', '06:00');
    expect(day(q, '07:00')).toBe(at('06:00'));
    expect(day(q, '21:00')).toBe(at('22:00'));
    // Exactly halfway between 06:00 and 22:00 — the later.
    expect(day(q, '14:00')).toBe(at('22:00'));
    expect(day(q, '23:30')).toBe(at('23:30'));
    expect(day(q, '00:30')).toBe(at('00:30'));
  });

  it('answers only inside the span it is given', () => {
    const q = pctLattice(900, undefined, undefined);
    // The hour of 13: the nearest to 14:10 inside it is its last quarter.
    expect(pctNearest(q, at('14:10'), at('13:00'), at('13:59:59'))).toBe(
      at('13:45'),
    );
    expect(pctNearest(q, at('12:10'), at('13:00'), at('13:59:59'))).toBe(
      at('13:00'),
    );
  });

  it('answers null where no time on the step is inside both the span and the bounds', () => {
    const q = pctLattice(900, '09:30', '17:00');
    // The hour of 8 is before `min`; the minute 13:05 has no quarter in it.
    expect(pctNearest(q, at('08:00'), at('08:00'), at('08:59:59'))).toBeNull();
    expect(pctNearest(q, at('13:05'), at('13:05'), at('13:05:59'))).toBeNull();
    // The hour of 9 has 09:30 and 09:45.
    expect(pctNearest(q, at('09:00'), at('09:00'), at('09:59:59'))).toBe(
      at('09:30'),
    );
    // A span exactly one time wide, on the step and inside.
    expect(pctNearest(q, at('13:15'), at('13:15'), at('13:15'))).toBe(
      at('13:15'),
    );
  });

  it('a span may meet the bounds on its very edge', () => {
    const q = pctLattice(60, '09:00', '17:00');
    expect(pctNearest(q, at('17:00'), at('17:00'), at('17:59'))).toBe(
      at('17:00'),
    );
    expect(pctNearest(q, at('08:59'), at('08:00'), at('09:00'))).toBe(
      at('09:00'),
    );
  });
});

describe('pctWrite — the shape the value takes', () => {
  it('writes minutes where the step has no seconds', () => {
    expect(pctWrite(pctLattice(60, undefined, undefined), at('13:05'))).toBe(
      '13:05',
    );
    expect(pctWrite(pctLattice(900, undefined, undefined), 0)).toBe('00:00');
  });

  it('writes seconds where it has them — a second of zero included', () => {
    const q = pctLattice(30, undefined, undefined);
    expect(pctWrite(q, at('13:05'))).toBe('13:05:00');
    expect(pctWrite(q, at('13:05:30'))).toBe('13:05:30');
    expect(pctWrite(q, 86_399)).toBe('23:59:59');
  });
});
