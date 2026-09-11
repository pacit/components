/**
 * The property sweep: a generator of cases, an invariant that has to hold over all of them,
 * and — when one breaks it — a walk back down to the smallest case that still does.
 *
 * **Why this is hand-written and not `fast-check`.** For the reason every gate in `tools/` is
 * hand-written: an instrument this repository owns is one it can explain, and the whole of
 * what a sweep needs is a seeded generator, a shrink and a message. What a library would add
 * is a package on the road every spec here takes — installed before a mutation run can start —
 * for machinery that is a hundred lines and that a reader of a failure has to understand
 * anyway.
 *
 * **The seed is fixed, and that is the point** (`req-quality-unit`). A sweep with a fresh
 * seed each run is a suite whose green is a different statement every morning, and — worse
 * here — a mutation run whose score moves without a line changing: a mutant killed by the
 * case a Tuesday seed reached survives on Wednesday, and the snapshot the gate compares
 * against is noise. So a run is a function of `PCT_PROPERTY_SEED` alone, which nothing in CI
 * sets. Hunting a suspicion is what it is for:
 *
 * ```bash
 * PCT_PROPERTY_SEED=7 npx nx test components
 * ```
 *
 * @example
 * pctForAll(pctRecord({ page: pctInt(1, 500), count: pctInt(1, 500) }), ({ page, count }) => {
 *   expect(strip(page, count).at(-1)).toBe(count);
 * });
 */

/**
 * What a sweep draws from: a case, and the simpler cases to try once one has failed.
 *
 * `shrink` returns candidates rather than one answer, because "simpler" is not a total order
 * — `-1000` is simpler than `-1234` in one direction and `0` in another — and the descent
 * takes the first candidate that still breaks the invariant.
 */
export interface PctArbitrary<T> {
  readonly sample: (random: () => number) => T;
  readonly shrink: (value: T) => readonly T[];
  /** How the case is written into the failure message. */
  readonly show: (value: T) => string;
}

/**
 * `mulberry32` — thirty-two bits of state, uniform enough for a case generator and, unlike
 * `Math.random()`, a function of its seed. Nothing here needs a better distribution than
 * this; everything here needs the same draw twice.
 */
export function pctRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distinct, in order, with the value itself never among its own candidates. */
function simpler<T>(value: T, candidates: readonly T[]): readonly T[] {
  const seen = new Set<T>([value]);
  const kept: T[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    kept.push(candidate);
  }
  return kept;
}

/**
 * An integer in `[min, max]`, shrinking towards zero — or towards the end of the range
 * nearest it, for a range that does not contain zero. The candidates are the ones a reader
 * of a failure wants first: the boundary, the halfway point, one step in.
 */
export function pctInt(min: number, max: number): PctArbitrary<number> {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return {
    sample: (random) => min + Math.floor(random() * (max - min + 1)),
    shrink: (value) =>
      simpler(value, [
        clamp(0),
        min,
        max,
        Math.trunc(value / 2),
        value - Math.sign(value),
      ]).filter((c) => c >= min && c <= max && Math.abs(c) < Math.abs(value)),
    show: (value) => String(value),
  };
}

/**
 * A number with up to `places` decimal places in `[min, max]`. Built from an integer count of
 * the smallest place, so the value is one a `toFixed(places)` can write back without a
 * rounding of its own — a sweep whose cases cannot survive their own formatting proves
 * nothing about the formatter.
 */
export function pctDecimal(
  min: number,
  max: number,
  places: number,
): PctArbitrary<number> {
  const scale = 10 ** places;
  const steps = pctInt(Math.ceil(min * scale), Math.floor(max * scale));
  // `+ 0` turns the negative zero a scaled draw can reach into the zero the suite compares
  // against: `Object.is(-0, 0)` is false, and `expect().toBe()` asks exactly that.
  const at = (n: number) => n / scale + 0;
  return {
    sample: (random) => at(steps.sample(random)),
    shrink: (value) => steps.shrink(Math.round(value * scale)).map(at),
    show: (value) => String(value),
  };
}

/** One of a list, shrinking towards its first entry — so put the plainest case there. */
export function pctOneOf<const T>(values: readonly T[]): PctArbitrary<T> {
  return {
    sample: (random) => values[Math.floor(random() * values.length)],
    shrink: (value) => values.slice(0, Math.max(0, values.indexOf(value))),
    show: (value) => JSON.stringify(value) ?? String(value),
  };
}

/**
 * A record of arbitraries into an arbitrary of records — the shape a case is written in here,
 * because a failure message that names its fields is one somebody can act on.
 *
 * The shrink walks one field at a time and leaves the others where they are: a case with four
 * fields has four roads down from it, and the descent takes whichever still fails.
 */
export function pctRecord<T extends object>(shape: {
  readonly [K in keyof T]: PctArbitrary<T[K]>;
}): PctArbitrary<T> {
  const keys = Object.keys(shape) as (keyof T)[];
  return {
    sample: (random) =>
      Object.fromEntries(
        keys.map((key) => [key, shape[key].sample(random)]),
      ) as T,
    shrink: (value) =>
      keys.flatMap((key) =>
        shape[key]
          .shrink(value[key])
          .map((candidate) => ({ ...value, [key]: candidate })),
      ),
    show: (value) =>
      `{ ${keys.map((key) => `${String(key)}: ${shape[key].show(value[key])}`).join(', ')} }`,
  };
}

/** The seed, and the one way to change it — read once, so every sweep of a run agrees. */
const SEED = Number(
  // Through `globalThis` rather than a bare `process`: the spec program declares only
  // `vitest/globals`, and a `declare const process` here would be this file telling the
  // compiler about a runtime it has no business promising.
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.['PCT_PROPERTY_SEED'] ?? 20260911,
);

/** How far the descent is allowed to walk before it reports what it has. */
const SHRINK_STEPS = 400;

function failureOf(body: () => void): Error | null {
  try {
    body();
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Runs the invariant over `runs` generated cases and throws on the first that breaks it —
 * with the case shrunk, the seed named, and the original assertion's own message kept.
 *
 * The count is a floor on confidence and a cost in a mutation run at once: every sweep here
 * is executed once per mutant that its file covers, so the number is chosen per surface
 * rather than taken from a default.
 *
 * **The shrink assumes the body is a function of its case, and a body driving a fixture is
 * not.** The descent replays candidates against whatever state the run has already left in
 * that fixture, so the case it finally reports is the smallest one that fails THERE — not
 * necessarily one that fails on its own. Measured: disabling the number parser's bidi strip
 * turns the rounding sweep red and the descent walks to `en-US`, a locale the strip cannot
 * reach. The counterexample is a lead, and for a stateful sweep it is a lead and not a
 * verdict; which sweeps went red is the part that holds.
 */
export function pctForAll<T>(
  arbitrary: PctArbitrary<T>,
  body: (value: T) => void,
  options?: { readonly runs?: number; readonly seed?: number },
): void {
  const runs = options?.runs ?? 200;
  const seed = options?.seed ?? SEED;
  const random = pctRandom(seed);

  for (let run = 1; run <= runs; run++) {
    const value = arbitrary.sample(random);
    const failure = failureOf(() => body(value));
    if (failure === null) continue;

    let smallest = value;
    let reported = failure;
    for (let step = 0; step < SHRINK_STEPS; step++) {
      const next = arbitrary
        .shrink(smallest)
        .map((candidate) => ({
          candidate,
          failure: failureOf(() => body(candidate)),
        }))
        .find((attempt) => attempt.failure !== null);
      if (next === undefined) break;
      smallest = next.candidate;
      reported = next.failure as Error;
    }

    throw new Error(
      `property broken on run ${run} of ${runs} (seed ${seed})\n` +
        `  smallest case: ${arbitrary.show(smallest)}\n` +
        `  ${reported.message}`,
    );
  }
}
