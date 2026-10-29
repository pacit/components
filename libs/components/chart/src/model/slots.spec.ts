import { pctAxisFits, pctAxisSlots } from './slots';

const plain = (m: ReadonlyMap<string, string>) => Object.fromEntries(m);

describe('pctAxisSlots', () => {
  it('stands the units left, right, then outside them, in order of appearance', () => {
    expect(
      plain(pctAxisSlots(['°C', 'W', '°C', '%', 'kWh'], new Map())),
    ).toEqual({
      '°C': 'left',
      W: 'right',
      '%': 'left-outer',
      kWh: 'right-outer',
    });
  });

  it('gives a fifth unit no slot', () => {
    const slots = pctAxisSlots(['a', 'b', 'c', 'd', 'e'], new Map());
    expect(slots.size).toBe(4);
    expect(slots.has('e')).toBe(false);
  });

  it('keeps a unit where it stood while it stays, and frees the slot of one that left', () => {
    let slots = pctAxisSlots(['°C', 'W'], new Map());
    slots = pctAxisSlots(['W', '%'], slots);
    expect(plain(slots)).toEqual({ W: 'right', '%': 'left' });
    slots = pctAxisSlots(['%', 'W', 'kWh', 'A'], slots);
    expect(plain(slots)).toEqual({
      W: 'right',
      '%': 'left',
      kWh: 'left-outer',
      A: 'right-outer',
    });
  });

  it('forgets a unit no series carries any more', () => {
    const slots = pctAxisSlots([], new Map([['°C', 'left' as const]]));
    expect(slots.size).toBe(0);
  });
});

describe('pctAxisFits', () => {
  it('fits a unit that has a slot, or while a slot is free', () => {
    const four = pctAxisSlots(['a', 'b', 'c', 'd', 'e'], new Map());
    expect(pctAxisFits(four, 'a')).toBe(true);
    expect(pctAxisFits(four, 'e')).toBe(false);
    expect(pctAxisFits(four, 'f')).toBe(false);
    const three = pctAxisSlots(['a', 'b', 'c'], new Map());
    expect(pctAxisFits(three, 'e')).toBe(true);
    expect(pctAxisFits(new Map(), 'e')).toBe(true);
  });
});
