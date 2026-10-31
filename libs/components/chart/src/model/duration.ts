/** The length of a second, a minute, an hour and a day, in milliseconds. */
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The parts a duration is written in, largest first, and their names in the fallback. */
const UNITS = [
  ['days', DAY, 'd'],
  ['hours', HOUR, 'h'],
  ['minutes', MINUTE, 'min'],
  ['seconds', SECOND, 's'],
] as const;

type Parts = Partial<Record<(typeof UNITS)[number][0], number>>;

interface DurationFormatLike {
  format(parts: Parts): string;
}

/** `Intl.DurationFormat` where the runtime has it: not in TypeScript's `es2022` library. */
const DurationFormat = (
  Intl as {
    DurationFormat?: new (
      locale: string,
      options: { style: 'short'; secondsDisplay?: 'always' },
    ) => DurationFormatLike;
  }
).DurationFormat;

/**
 * A duration written for a tooltip, in the locale's short words: its two largest parts that
 * are not zero, of days, hours, minutes and seconds — `2 hr, 15 min`, `1 day, 3 hr`, `45 min`,
 * `0 sec` for nothing — by `Intl.DurationFormat`, which the three engines have (measured
 * 2026-10-31: Chromium 153, Firefox 155, WebKit 26.6); a runtime without it gets the same
 * parts as `2 h 15 min`. The length is rounded to whole seconds, and a negative one is
 * written as its length.
 *
 * @since next
 */
export function pctWriteDuration(ms: number, locale: string): string {
  // Whole seconds: the tooltip's words have no room for milliseconds.
  let rest = Math.round(Math.abs(ms) / SECOND) * SECOND;
  const counts = UNITS.map(([, length]) => {
    const count = Math.floor(rest / length);
    rest -= count * length;
    return count;
  });
  const first = counts.findIndex((c) => c > 0);
  const second = counts.findIndex((c, i) => i > first && c > 0);
  const parts: Parts = {};
  if (first >= 0) parts[UNITS[first][0]] = counts[first];
  if (second >= 0) parts[UNITS[second][0]] = counts[second];
  if (DurationFormat) {
    return first < 0
      ? new DurationFormat(locale, {
          style: 'short',
          secondsDisplay: 'always',
        }).format({ seconds: 0 })
      : new DurationFormat(locale, { style: 'short' }).format(parts);
  }
  if (first < 0) return '0 s';
  return UNITS.filter(([name]) => parts[name] !== undefined)
    .map(([name, , short]) => `${parts[name]} ${short}`)
    .join(' ');
}
