import { pctPlaces } from './places';
import type { PctSeriesSpec } from '../scene';

const spec = (
  id: string,
  color?: number | string,
  row?: string,
): PctSeriesSpec => ({
  id,
  name: id,
  unit: '',
  curve: 'linear',
  color,
  fromZero: false,
  row,
});

describe('pctPlaces', () => {
  it('gives each new series the lowest free place, and round again past eight', () => {
    const series = Array.from({ length: 10 }, (_, i) => spec(`s${i}`));
    const places = pctPlaces(series, undefined);
    expect([...places.values()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1, 2]);
  });

  it('keeps a place a series had, so a series that leaves repaints none of the others', () => {
    const before = pctPlaces([spec('a'), spec('b'), spec('c')], undefined);
    const after = pctPlaces([spec('a'), spec('c'), spec('d')], before);
    expect(after.get('a')).toBe(1);
    expect(after.get('c')).toBe(3);
    expect(after.get('d')).toBe(2);
  });

  it('gives a series its own place when it names one, and moves a kept one that it takes', () => {
    const before = pctPlaces([spec('a'), spec('b')], undefined);
    const after = pctPlaces([spec('a'), spec('b'), spec('c', 1)], before);
    expect(after.get('c')).toBe(1);
    expect(after.get('b')).toBe(2);
    expect(after.get('a')).toBe(3);
  });

  it("gives no place to a series in a row, and keeps one for a colour of the consumer's own", () => {
    const places = pctPlaces(
      [spec('a', undefined, 'Night'), spec('b', 'tomato'), spec('c')],
      undefined,
    );
    expect(places.has('a')).toBe(false);
    expect(places.get('b')).toBe(1);
    expect(places.get('c')).toBe(2);
  });
});
