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

  /**
   * What the measurement asked for. Until 2026-09-11 this entrypoint was struck out of the
   * mutation run, so every case above was written against nothing able to disagree with it —
   * and the first run that could disagree scored this file at 71.68% with 31 mutants alive
   * (`lesson-195`). The cases below are aimed at those, and they land where a reader assumes
   * hardest: that the draw is a FUNCTION of its arithmetic and not merely repeatable, that
   * the descent offers candidates inside the range and strictly nearer zero, and that a
   * failure carries the words of the assertion that produced it.
   */
  it('is the same arithmetic, not merely the same twice: a seed draws a fixed stream', () => {
    // A golden vector, and the only honest statement of `mulberry32`. "Same seed, same
    // cases" is satisfied by ANY deterministic function, so a changed shift or addend inside
    // the generator leaves every other case in this file green while the whole library draws
    // a different population — 9 484 cases a run, all of them somewhere else. Measured: with
    // the stream unpinned, six arithmetic mutants survived here.
    const random = pctRandom(7);
    const stream = Array.from({ length: 4 }, () =>
      Number(random().toFixed(10)),
    );

    expect(stream).toEqual([
      0.0117047532, 0.0619582576, 0.9769076328, 0.6990287057,
    ]);
  });

  it('offers the candidates it promises: inside the range, and nearer zero than the case', () => {
    // The exact list rather than a property of it. The descent is where a failing sweep
    // spends the reader's attention, and every clause of the filter is a way for it to go
    // wrong quietly: dropped, the range clause offers a candidate the generator could never
    // have drawn; dropped, the dedup offers the same one twice and the walk wastes a step.
    expect(pctInt(3, 9).shrink(7)).toEqual([3, 6]);
    // A range that does not contain zero: the first candidate is the end NEAREST zero, which
    // is what `clamp` is for and the one reading that tells `min` from `max`.
    expect(pctInt(20, 40).shrink(33)).toEqual([20, 32]);
    // And one that does: zero itself leads, then the halfway point, then one step in.
    expect(pctInt(-10, 10).shrink(-8)).toEqual([0, -4, -7]);
    // Nothing is simpler than the smallest case in the range, so the descent ends.
    expect(pctInt(3, 9).shrink(3)).toEqual([]);
    // The two ends of the filter, each in the only shape that can tell it from its neighbour.
    // A range entirely below zero is where `max` ITSELF is a candidate worth offering — it is
    // the value nearest zero — so `c <= max` and `c < max` part company here and nowhere else.
    expect(pctInt(-40, -20).shrink(-33)).toEqual([-20, -32]);
    // And a case sitting on its own range's edge is where `<` parts company with `<=`: the
    // opposite end has the same distance from zero, so offering it would send the descent
    // sideways for ever rather than down.
    expect(pctInt(-10, 10).shrink(10)).toEqual([0, 5, 9]);
  });

  it('shrinks a decimal on its own scale, not on the one it was built from', () => {
    expect(pctDecimal(0, 1, 2).shrink(0.5)).toEqual([0, 0.25, 0.49]);
    // The floor is carried through the scaling: a minimum of 0.1 may not shrink to 0, and
    // reading the scale the wrong way round is exactly how it would.
    expect(pctDecimal(0.1, 1, 2).shrink(0.5)).toEqual([0.1, 0.25, 0.49]);
  });

  it('writes a decimal into the failure it throws, not the word `undefined`', () => {
    // `show` earns its place only in a message nobody reads until something is wrong, which
    // is exactly the kind of code that rots unwatched: every sweep stays green while the
    // failure it would one day print says `smallest case: undefined`.
    expect(() =>
      pctForAll(
        pctDecimal(0.5, 0.5, 2),
        () => {
          throw new Error('boom');
        },
        { runs: 1, seed: 3 },
      ),
    ).toThrowError(/smallest case: 0\.5/);
  });

  it('draws every entry of a list, not only the one at index zero', () => {
    const random = pctRandom(99);
    const drawn = new Set(
      Array.from({ length: 300 }, () =>
        pctOneOf(['a', 'b', 'c']).sample(random),
      ),
    );

    expect([...drawn].sort()).toEqual(['a', 'b', 'c']);
  });

  it('runs without being handed options at all, and an explicit seed outranks the default', () => {
    // The options argument is optional in the signature, and four sweeps in this library call
    // it both ways. A reading that assumed the object would crash the first caller who left
    // it out — and no case here had left it out.
    let cases = 0;
    pctForAll(pctInt(0, 10), () => {
      cases++;
    });
    expect(cases).toBe(200);

    const drawnWith = (seed: number) => {
      const seen: number[] = [];
      pctForAll(
        pctInt(0, 1000),
        (n) => {
          seen.push(n);
        },
        { runs: 3, seed },
      );
      return seen;
    };
    // Two explicit seeds, two populations — and neither of them the constant this module
    // falls back to, which is what a seed being READ rather than merely present means.
    expect(drawnWith(11)).not.toEqual(drawnWith(12));
    expect(drawnWith(11)).toEqual(drawnWith(11));
  });

  it('keeps the broken assertion’s own words in the failure it throws', () => {
    // The sweep's message is three lines and the third is somebody else's: without it a
    // reader gets the case that failed and no statement of what it failed.
    expect(() =>
      pctForAll(
        pctInt(0, 10),
        (n) => {
          expect(n, 'the digit outgrew the hand').toBeLessThan(0);
        },
        { runs: 1, seed: 5 },
      ),
    ).toThrowError(/the digit outgrew the hand/);
  });
});
