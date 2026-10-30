import { pctSteps } from './steps';

describe('pctSteps', () => {
  it('lists the values from the first to the last, both included, a step apart', () => {
    expect(pctSteps(0, 10, 5)).toEqual([0, 5, 10]);
    expect(pctSteps(2, 9, 3)).toEqual([2, 5, 8]);
    expect(pctSteps(4, 4, 1)).toEqual([4]);
  });

  it('keeps the last value although the division lands a hair under it', () => {
    expect(pctSteps(0, 0.3, 0.1)).toHaveLength(4);
  });

  it('lists nothing when the last comes before the first', () => {
    expect(pctSteps(5, 4, 1)).toEqual([]);
  });

  it('lists ten thousand values and not one more', () => {
    expect(pctSteps(1, 10_000, 1)).toHaveLength(10_000);
    expect(pctSteps(1, 10_001, 1)).toEqual([]);
  });
});
