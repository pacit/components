/**
 * Where the value axis of a unit stands: the first unit on the left, the second on the right,
 * the third and fourth outside them. Four is the most a plot holds before the axes take more
 * room than the data.
 *
 * @since next
 */
export type PctAxisSlot = 'left' | 'right' | 'left-outer' | 'right-outer';

const ORDER: readonly PctAxisSlot[] = [
  'left',
  'right',
  'left-outer',
  'right-outer',
];

/**
 * The slot of each unit on the chart, given the slots they held before. A unit keeps its slot
 * while it stays on the chart, so adding a series of a new unit moves no axis already drawn; a
 * unit that left frees its slot; a new unit takes the first free slot in the order above, in
 * the order the units appear. A fifth unit gets no slot: `pctAxisFits` says so before it is
 * added.
 *
 * @example
 * let slots = pctAxisSlots(['°C', 'W'], new Map()); // °C left, W right
 * slots = pctAxisSlots(['W', '%'], slots); // W right, % left
 *
 * @since next
 */
export function pctAxisSlots(
  units: readonly string[],
  previous: ReadonlyMap<string, PctAxisSlot>,
): ReadonlyMap<string, PctAxisSlot> {
  const present = new Set(units);
  const slots = new Map<string, PctAxisSlot>();
  for (const [unit, slot] of previous)
    if (present.has(unit)) slots.set(unit, slot);
  const taken = new Set(slots.values());
  for (const unit of present) {
    if (slots.has(unit)) continue;
    const free = ORDER.find((slot) => !taken.has(slot));
    if (free === undefined) continue;
    slots.set(unit, free);
    taken.add(free);
  }
  return slots;
}

/**
 * Whether a series of `unit` fits on a chart whose axes stand as `slots`: it does when its unit
 * already has a slot or one is free.
 *
 * @since next
 */
export function pctAxisFits(
  slots: ReadonlyMap<string, PctAxisSlot>,
  unit: string,
): boolean {
  return slots.has(unit) || slots.size < ORDER.length;
}
