import { pctInstantOf, pctWallClockOf } from './instant';
import {
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../testing/src/property.testkit';

/**
 * The road between an instant and a wall clock, swept.
 *
 * `instant.spec.ts` names the changes of clocks a person thought to write down. This file
 * says what holds of every instant from 1950 to 2050 in zones chosen for their trouble: a
 * change of an hour each way, of half an hour, an offset of a quarter hour, a day skipped
 * whole, a hemisphere whose summer straddles the new year.
 */
const ZONES = [
  'UTC',
  'Europe/Warsaw',
  'America/New_York',
  'Australia/Sydney',
  'Australia/Lord_Howe',
  'Asia/Kathmandu',
  'Pacific/Apia',
] as const;

const instants = pctRecord({
  at: pctInt(Date.UTC(1950, 0, 1), Date.UTC(2050, 0, 1)),
  zone: pctOneOf(ZONES),
});

describe('the wall clock and the instant', () => {
  it('reads every instant back from its wall clock, the earlier and the later reading around it', () => {
    pctForAll(instants, ({ at, zone }) => {
      const clock = pctWallClockOf(at, zone);
      const earlier = pctInstantOf(clock, zone, 'earlier');
      const later = pctInstantOf(clock, zone, 'later');
      expect(earlier).toBeLessThanOrEqual(at);
      expect(later).toBeGreaterThanOrEqual(at);
      expect([earlier, later]).toContain(at);
      expect(pctWallClockOf(earlier, zone)).toEqual(clock);
      expect(pctWallClockOf(later, zone)).toEqual(clock);
      expect(pctInstantOf(clock, zone)).toBe(earlier);
    });
  });

  it('resolves every wall clock, shown or skipped, to one that moves on from it by less than a day', () => {
    const clocks = pctRecord({
      year: pctInt(1950, 2049),
      month: pctInt(1, 12),
      day: pctInt(1, 28),
      hour: pctInt(0, 23),
      minute: pctOneOf([0, 15, 30, 45] as const),
      zone: pctOneOf(ZONES),
    });
    pctForAll(clocks, ({ zone, ...clock }) => {
      const asked = Date.UTC(
        clock.year,
        clock.month - 1,
        clock.day,
        clock.hour,
        clock.minute,
      );
      const earlier = pctInstantOf(clock, zone, 'earlier');
      const later = pctInstantOf(clock, zone, 'later');
      expect(earlier).toBeLessThanOrEqual(later);
      const shown = pctWallClockOf(pctInstantOf(clock, zone), zone);
      const moved =
        Date.UTC(
          shown.year,
          shown.month - 1,
          shown.day,
          shown.hour,
          shown.minute,
        ) - asked;
      expect(moved).toBeGreaterThanOrEqual(0);
      expect(moved).toBeLessThan(86_400_000);
    });
  });
});
