import {
  pctDecimal,
  pctForAll,
  pctInt,
  pctOneOf,
  pctRandom,
  pctRecord,
} from './property.testkit';

/**
 * The sweep holding itself. Four specs in this library now state their promises as laws over
 * generated cases, and each of them is green through this file — so an instrument that drew
 * one case and called it two hundred, or reported a failure it could not shrink, would take
 * all four down with it and none of them would say so.
 *
 * What is worth proving about a generator is exactly what a reader assumes without checking:
 * that the same seed draws the same cases, that a broken law is caught rather than swallowed,
 * and that the case in the message is the SMALLEST one — a property test whose failure names
 * the hundredth random case wastes the hour that follows it.
 */
describe('the property sweep', () => {
  /** The invariant every one of these specs rests on, and the reason the seed is a constant. */
  it('draws the same cases from the same seed, and different ones from another', () => {
    const drawn = (seed: number) => {
      const random = pctRandom(seed);
      return Array.from({ length: 20 }, () => pctInt(0, 1000).sample(random));
    };

    expect(drawn(7)).toEqual(drawn(7));
    expect(drawn(7)).not.toEqual(drawn(8));
    // Not one draw in twenty repeats its predecessor — a generator stuck on its seed would
    // pass the equality above and prove nothing at all.
    expect(new Set(drawn(7)).size).toBeGreaterThan(15);
  });

  it('runs the body once per case and lets a law that holds pass in silence', () => {
    let seen = 0;
    expect(() =>
      pctForAll(
        pctInt(-50, 50),
        (n) => {
          seen++;
          expect(Math.abs(n)).toBeLessThanOrEqual(50);
        },
        { runs: 37 },
      ),
    ).not.toThrow();
    expect(seen).toBe(37);
  });

  /**
   * The descent, measured rather than described: the first case to break `n < 40` is wherever
   * the draw happened to land, and what the message has to carry is the boundary itself.
   */
  it('reports the smallest case that still breaks the law, not the one that found it', () => {
    let thrown: Error | null = null;
    try {
      pctForAll(pctInt(0, 1000), (n) => expect(n).toBeLessThan(40), {
        runs: 200,
      });
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBeNull();
    expect(thrown?.message).toContain('smallest case: 40');
    // The seed is in the message because reproducing the run is the first thing anybody does.
    expect(thrown?.message).toContain('seed');
    // And the assertion's own words survive the shrink — the sweep reports, it does not judge.
    expect(thrown?.message).toContain('40');
  });

  it('shrinks a record one field at a time, so a failure names every field it kept', () => {
    let thrown: Error | null = null;
    try {
      pctForAll(
        pctRecord({ a: pctInt(0, 500), b: pctInt(0, 500) }),
        ({ a, b }) => expect(a + b).toBeLessThan(10),
        { runs: 50 },
      );
    } catch (error) {
      thrown = error as Error;
    }

    const smallest = /smallest case: \{ a: (-?\d+), b: (-?\d+) \}/.exec(
      thrown?.message ?? '',
    );
    expect(smallest).not.toBeNull();
    // Neither field can come down any further without the law holding again: their sum is the
    // boundary exactly, and a descent that stopped early would land above it.
    expect(Number(smallest?.[1]) + Number(smallest?.[2])).toBe(10);
  });

  it('shrinks a list towards its first entry, which is where the plainest case is put', () => {
    let thrown: Error | null = null;
    try {
      pctForAll(
        pctOneOf(['ltr', 'rtl', 'auto'] as const),
        (direction) => expect(direction).toBe('nothing'),
        { runs: 30 },
      );
    } catch (error) {
      thrown = error as Error;
    }
    expect(thrown?.message).toContain('smallest case: "ltr"');
  });

  /**
   * A sweep of a formatter whose own cases cannot survive a `toFixed` proves nothing about
   * the formatter, so the decimals are built from an integer count of the smallest place —
   * and the negative zero a scaled draw reaches is folded away, because `toBe` is `Object.is`.
   */
  it('draws decimals that write back unchanged, and never a negative zero', () => {
    pctForAll(
      pctDecimal(-100, 100, 2),
      (value) => {
        expect(Number(value.toFixed(2))).toBe(value);
        expect(Object.is(value, -0)).toBe(false);
      },
      { runs: 300 },
    );
  });

  it('keeps an integer inside the range it was given, both ends included', () => {
    const random = pctRandom(1234);
    const drawn = Array.from({ length: 2000 }, () =>
      pctInt(3, 9).sample(random),
    );
    expect(Math.min(...drawn)).toBe(3);
    expect(Math.max(...drawn)).toBe(9);
    expect(new Set(drawn).size).toBe(7);
  });
});
