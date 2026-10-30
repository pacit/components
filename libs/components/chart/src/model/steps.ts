/**
 * Every value from `first` to `last`, both included, `size` apart: an empty list when `last`
 * comes before `first`, and an empty list for more than ten thousand values. No axis has room
 * for ten thousand ticks, nor a window for ten thousand candidates of them, so a request for
 * more is a mistake in what was asked — a step of a microsecond across a day — answered with
 * nothing rather than with a list that fills the memory. The list is counted before it is
 * filled rather than grown by a loop that runs until it passes `last`, so no value of the
 * arguments can make it run on.
 */
export function pctSteps(first: number, last: number, size: number): number[] {
  const count = Math.max(0, Math.floor((last - first) / size + 1e-9) + 1);
  if (count > 10_000) return [];
  return Array.from({ length: count }, (_, j) => first + j * size);
}
