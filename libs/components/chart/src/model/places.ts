import type { PctSeriesSpec } from '../scene';

/**
 * The palette place of each series: kept for a series already placed, the lowest free place
 * for a new one, from 1 to 8 and then round again. A series with a place of its own (a number)
 * takes it; a series in a row is painted by its mark's ramp and takes none (0113). The chart's
 * scene and the pie place their series by it, so a series keeps its colour when another leaves
 * ([0102](../../../../../docs/decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)).
 *
 * @since 0.3.1
 */
export function pctPlaces(
  series: readonly PctSeriesSpec[],
  previous: ReadonlyMap<string, number> | undefined,
): ReadonlyMap<string, number> {
  const places = new Map<string, number>();
  // A place the consumer gives wins; a place kept from before stays unless one of those took
  // it; every other series takes the lowest free place, and round again past eight.
  for (const s of series)
    if (typeof s.color === 'number') places.set(s.id, s.color);
  const given = new Set(places.values());
  for (const s of series) {
    const kept = previous?.get(s.id);
    if (!places.has(s.id) && kept !== undefined && !given.has(kept))
      places.set(s.id, kept);
  }
  for (const s of series) {
    if (places.has(s.id) || s.row !== undefined) continue;
    const taken = new Set(places.values());
    const free = [1, 2, 3, 4, 5, 6, 7, 8].find((p) => !taken.has(p));
    places.set(s.id, free ?? (places.size % 8) + 1);
  }
  return places;
}
