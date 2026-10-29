import { pctThinLabels, pctTooltipPlace } from './layout';

describe('pctTooltipPlace', () => {
  it('stands right of the cursor when it fits, the gap away', () => {
    expect(pctTooltipPlace(100, 50, 0, 400)).toEqual({
      left: 108,
      side: 'end',
    });
    expect(pctTooltipPlace(100, 50, 0, 400, 12)).toEqual({
      left: 112,
      side: 'end',
    });
    // exactly fitting
    expect(pctTooltipPlace(342, 50, 0, 400)).toEqual({
      left: 350,
      side: 'end',
    });
  });

  it('stands left of it when the right is too narrow', () => {
    expect(pctTooltipPlace(343, 50, 0, 400)).toEqual({
      left: 285,
      side: 'start',
    });
    expect(pctTooltipPlace(58, 50, 0, 60)).toEqual({ left: 0, side: 'start' });
  });

  it('takes the roomier side and stays inside when it fits on neither', () => {
    expect(pctTooltipPlace(100, 300, 0, 400)).toEqual({
      left: 100,
      side: 'end',
    });
    expect(pctTooltipPlace(300, 300, 0, 400)).toEqual({
      left: 0,
      side: 'start',
    });
    expect(pctTooltipPlace(200, 300, 0, 400)).toEqual({
      left: 100,
      side: 'end',
    });
    expect(pctTooltipPlace(100, 500, 0, 400)).toEqual({ left: 0, side: 'end' });
  });
});

describe('pctThinLabels', () => {
  const at = (n: number, step: number) =>
    Array.from({ length: n }, (_, i) => i * step);

  it('shows every label that has room', () => {
    expect(pctThinLabels(at(4, 30), [20, 20, 20, 20], 4)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    // exactly the gap between them
    expect(pctThinLabels(at(3, 24), [20, 20, 20], 4)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('shows every second, third… label, the fewest skipped that leave room', () => {
    expect(pctThinLabels(at(6, 20), [20, 20, 20, 20, 20, 20], 4)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(pctThinLabels(at(7, 10), Array(7).fill(20), 4)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it('counts from the label it must keep', () => {
    expect(pctThinLabels(at(6, 20), Array(6).fill(20), 4, 3)).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it('counts from the first when the label to keep is one past the row', () => {
    expect(pctThinLabels(at(7, 10), Array(7).fill(20), 4, 7)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it('counts from the first when the label to keep is not in the row', () => {
    expect(pctThinLabels(at(4, 20), Array(4).fill(20), 4, 9)).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(pctThinLabels(at(4, 20), Array(4).fill(20), 4, -1)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it('reads the widths of both neighbours', () => {
    expect(pctThinLabels([0, 30, 60], [10, 50, 10], 4)).toEqual([
      true,
      false,
      true,
    ]);
    expect(pctThinLabels([0, 30, 60], [10, 30, 10], 4)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('shows one label when no two fit, and none of none', () => {
    expect(pctThinLabels([0, 1, 2], [50, 50, 50], 4)).toEqual([
      true,
      false,
      false,
    ]);
    expect(pctThinLabels([], [], 4)).toEqual([]);
  });

  it('measures along a row that runs backwards', () => {
    expect(pctThinLabels([60, 30, 0], [20, 20, 20], 4)).toEqual([
      true,
      true,
      true,
    ]);
  });
});
