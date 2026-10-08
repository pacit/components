import { PctTimeOfDay, pctTimeOfDay, pctTimeOfDayParts } from './time';

/**
 * The times a field offers, as arithmetic: the step counted from its base, cut by the bounds.
 * Private to this entrypoint — the field and its columns read the same answers from it, so the
 * text the field writes and the rows the panel lists cannot disagree about which times exist
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md) §5).
 *
 * Everything is in seconds since midnight. A step this module is handed is one
 * `isPctTimeStep` accepted, so it divides a day and the times on it are the same on both sides
 * of midnight — which is what lets a window across midnight be two plain intervals.
 */

/** The seconds in a day. */
const DAY = 86_400;

/** An interval of seconds, both ends included. */
export type PctSpan = readonly [from: number, to: number];

/** The step, where it is counted from, the shape the value takes and the bounds that cut it. */
export interface PctLattice {
  readonly step: number;
  /** The time the step is counted from — `min` when there is one, as the native element counts. */
  readonly base: number;
  /** Whether a time on this step has seconds in it, so the value is written `HH:mm:ss`. */
  readonly seconds: boolean;
  /** The times the bounds let through: one interval, or two for a window across midnight. */
  readonly bounds: readonly PctSpan[];
}

/** A time as seconds since midnight. */
export function pctSecondsOf(time: PctTimeOfDay): number {
  const { hour, minute, second } = pctTimeOfDayParts(time);
  return (hour * 60 + minute) * 60 + second;
}

/**
 * The lattice of a field: `step` already a valid one, the bounds as the `FormUiControl` contract
 * spells them. `min` later than `max` is a window across midnight (0086, A12).
 */
export function pctLattice(
  step: number,
  min: PctTimeOfDay | undefined,
  max: PctTimeOfDay | undefined,
): PctLattice {
  const base = min === undefined ? 0 : pctSecondsOf(min);
  const from = base;
  const to = max === undefined ? DAY - 1 : pctSecondsOf(max);
  return {
    step,
    base,
    // A step that divides a minute has seconds in every time on it; a longer one has them only
    // when it is counted from a time that has them.
    seconds: step % 60 !== 0 || base % 60 !== 0,
    bounds:
      from <= to
        ? [[from, to]]
        : [
            [from, DAY - 1],
            [0, to],
          ],
  };
}

/** The same step with nothing cut away — which rows a column lists, before the bounds speak. */
export function pctUnbounded(lattice: PctLattice): PctLattice {
  return { ...lattice, bounds: [[0, DAY - 1]] };
}

/** The last time on the step at or before `at`. */
function floorTo(lattice: PctLattice, at: number): number {
  const { step, base } = lattice;
  return at - ((((at - base) % step) + step) % step);
}

/**
 * The time on the step, inside the bounds and inside `[from, to]`, nearest to `at` — or `null`
 * when there is none. Exactly halfway goes to the later of the two, as `Math.round` does.
 *
 * One question answers three: whether a row has a time at all (`at` its own start), where a
 * movement onto a row lands (`at` the time composed from the row and the other columns), and
 * where a walk starts from a time the step does not list or the bounds refuse.
 */
export function pctNearest(
  lattice: PctLattice,
  at: number,
  from: number,
  to: number,
): number | null {
  let best: number | null = null;
  for (const [low, high] of lattice.bounds) {
    const start = Math.max(from, low);
    const end = Math.min(to, high);
    const held = Math.min(Math.max(at, start), end);
    const below = floorTo(lattice, held);
    for (const time of [below, below + lattice.step]) {
      if (time < start || time > end) continue;
      const away = Math.abs(time - at);
      if (
        best === null ||
        away < Math.abs(best - at) ||
        (away === Math.abs(best - at) && time > best)
      )
        best = time;
    }
  }
  return best;
}

/** Seconds since midnight written in the lattice's shape. */
export function pctWrite(lattice: PctLattice, total: number): PctTimeOfDay {
  return pctTimeOfDay(
    Math.floor(total / 3600),
    Math.floor(total / 60) % 60,
    lattice.seconds ? total % 60 : undefined,
  );
}
