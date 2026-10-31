import { pctWriteDuration } from './duration';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('pctWriteDuration', () => {
  it('writes the two largest parts that are not zero, in the locale’s short words', () => {
    expect(pctWriteDuration(2 * HOUR + 15 * MINUTE, 'en-US')).toBe(
      '2 hr, 15 min',
    );
    expect(pctWriteDuration(45 * MINUTE, 'en-US')).toBe('45 min');
    expect(pctWriteDuration(DAY + 3 * HOUR + 20 * MINUTE, 'en-US')).toBe(
      '1 day, 3 hr',
    );
    expect(pctWriteDuration(DAY + 20 * MINUTE, 'en-US')).toBe('1 day, 20 min');
    expect(pctWriteDuration(HOUR, 'en-US')).toBe('1 hr');
    expect(pctWriteDuration(90 * 1000, 'en-US')).toBe('1 min, 30 sec');
    expect(pctWriteDuration(2 * HOUR + 15 * MINUTE, 'pl')).toBe(
      '2 godz. i 15 min',
    );
  });

  it('rounds to the second, writes nothing as zero seconds, and a negative length as its length', () => {
    expect(pctWriteDuration(0, 'en-US')).toBe('0 sec');
    expect(pctWriteDuration(400, 'en-US')).toBe('0 sec');
    expect(pctWriteDuration(600, 'en-US')).toBe('1 sec');
    expect(pctWriteDuration(-(3 * HOUR), 'en-US')).toBe('3 hr');
  });

  it('writes the same parts as `2 h 15 min` where the runtime has no `Intl.DurationFormat`', async () => {
    const own = (Intl as { DurationFormat?: unknown }).DurationFormat;
    vi.resetModules();
    Object.defineProperty(Intl, 'DurationFormat', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const { pctWriteDuration: fallback } = await import('./duration');
      expect(fallback(2 * HOUR + 15 * MINUTE, 'en-US')).toBe('2 h 15 min');
      expect(fallback(DAY + 3 * HOUR, 'en-US')).toBe('1 d 3 h');
      expect(fallback(90 * 1000, 'en-US')).toBe('1 min 30 s');
      expect(fallback(0, 'en-US')).toBe('0 s');
    } finally {
      Object.defineProperty(Intl, 'DurationFormat', {
        value: own,
        configurable: true,
        writable: true,
      });
      vi.resetModules();
    }
  });
});
