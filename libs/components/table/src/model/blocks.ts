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

/**
 * The source's rows as the table draws them: `total` long, each block's rows at their place
 * and `undefined` — a hole — wherever no block has delivered. A block's rows past `total` are
 * dropped, a count that shrank being the newer word, and so are those past `size`, which are
 * the next block's place.
 */
export function pctBlockRows<T>(
  blocks: ReadonlyMap<number, PctBlock<T>>,
  total: number,
  size: number,
): readonly (T | undefined)[] {
  const rows = new Array<T | undefined>(total).fill(undefined);
  for (const [block, { rows: delivered }] of blocks) {
    if (delivered === null) continue;
    const from = block * size;
    const count = Math.min(delivered.length, size, total - from);
    for (let at = 0; at < count; at++) rows[from + at] = delivered[at];
  }
  return rows;
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
