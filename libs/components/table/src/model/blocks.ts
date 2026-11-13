/**
 * A block of a remote source's rows: `size` of them from `block * size`, asked for once, and
 * what came of it. A block asked again — retried, or refreshed — keeps the rows it had until
 * the new answer, so a refresh draws no holes where rows stood.
 */
export type PctBlock<T> =
  | { readonly state: 'loading'; readonly rows: readonly T[] | null }
  | {
      readonly state: 'failed';
      readonly error: unknown;
      readonly rows: readonly T[] | null;
    }
  | { readonly state: 'loaded'; readonly rows: readonly T[] };

/**
 * The blocks the rows `[start, end)` need, in order: the blocks they stand in, and half a
 * block more on each side, so the next scroll finds its rows asked for. Clamped to the blocks
 * `total` rows fill; `null` is a total not known yet, and then the first block is the one to
 * ask, where the count comes from.
 */
export function pctBlocksFor(
  range: { readonly start: number; readonly end: number },
  total: number | null,
  size: number,
): readonly number[] {
  if (total === null) return [0];
  const slack = Math.ceil(size / 2);
  const first = Math.max(0, Math.floor((range.start - slack) / size));
  const last = Math.min(
    Math.ceil(total / size),
    Math.ceil((range.end + slack) / size),
  );
  const blocks: number[] = [];
  for (let block = first; block < last; block++) blocks.push(block);
  return blocks;
}

/** The rows a list of blocks was drawn as, and what they were drawn from. */
export interface PctBlockRows<T> {
  readonly blocks: ReadonlyMap<number, PctBlock<T>>;
  readonly total: number;
  readonly size: number;
  readonly rows: readonly (T | undefined)[];
}

/**
 * The source's rows as the table draws them: `total` long, each block's rows at their place
 * and `undefined` — a hole — wherever no block has delivered. A block's rows past `total` are
 * dropped, a count that shrank being the newer word, and so are those past `size`, which are
 * the next block's place.
 *
 * Given the rows drawn `before` at the same total and size, only the blocks whose rows changed
 * are written again, into a copy; and when none did — a block asked for, or let go with no
 * rows — the rows before are the answer, the same list, so nothing that reads them is made
 * again. A block of a list of a million is a copy, not a million writes.
 */
export function pctBlockRows<T>(
  blocks: ReadonlyMap<number, PctBlock<T>>,
  total: number,
  size: number,
  before?: PctBlockRows<T>,
): readonly (T | undefined)[] {
  if (before?.total === total && before.size === size) {
    let rows: (T | undefined)[] | null = null;
    for (const block of new Set([...before.blocks.keys(), ...blocks.keys()])) {
      const delivered = blocks.get(block)?.rows ?? null;
      if (delivered === (before.blocks.get(block)?.rows ?? null)) continue;
      rows ??= before.rows.slice();
      place(rows, block, delivered, total, size);
    }
    return rows ?? before.rows;
  }
  const rows = new Array<T | undefined>(total).fill(undefined);
  for (const [block, { rows: delivered }] of blocks)
    place(rows, block, delivered, total, size);
  return rows;
}

/** Writes a block's rows at its place, and a hole wherever it delivered none. */
function place<T>(
  rows: (T | undefined)[],
  block: number,
  delivered: readonly T[] | null,
  total: number,
  size: number,
): void {
  const from = block * size;
  const to = Math.min(from + size, total);
  for (let at = from; at < to; at++) rows[at] = delivered?.[at - from];
}

/**
 * The block a hole at `index` belongs to, when that block failed: the block a retry asks
 * again. `null` for a hole still loading. A hole in a failed block that kept rows is past
 * their end, so it failed too.
 */
export function pctFailedBlock<T>(
  blocks: ReadonlyMap<number, PctBlock<T>>,
  index: number,
  size: number,
): number | null {
  const block = Math.floor(index / size);
  const state = blocks.get(block);
  return state?.state === 'failed' ? block : null;
}
