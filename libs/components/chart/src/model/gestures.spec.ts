import {
  PCT_GESTURE_IDLE,
  PCT_GESTURE_RULES,
  pctGestureStep,
  type PctGestureAction,
  type PctGestureState,
  type PctPointerInput,
} from './gestures';

type Step = Partial<PctPointerInput> & Pick<PctPointerInput, 'type'>;

/** Plays the inputs from no gesture, and gives every action and the state at the end. */
function play(
  steps: readonly Step[],
  from: PctGestureState = PCT_GESTURE_IDLE,
): { actions: (PctGestureAction | null)[]; state: PctGestureState } {
  let state = from;
  const actions: (PctGestureAction | null)[] = [];
  for (const s of steps) {
    const result = pctGestureStep(state, {
      id: 1,
      x: 100,
      y: 100,
      mouse: false,
      at: 0,
      ...s,
    });
    state = result.state;
    actions.push(result.action);
  }
  return { actions, state };
}

describe('pctGestureStep', () => {
  it('keeps the thresholds of the chart', () => {
    expect(PCT_GESTURE_RULES).toEqual({
      slop: 8,
      doubleTime: 300,
      doubleDistance: 24,
    });
    expect(PCT_GESTURE_IDLE.mode).toBe('idle');
    expect(PCT_GESTURE_IDLE.pointers.size).toBe(0);
    expect(PCT_GESTURE_IDLE.tap).toBeNull();
    expect(PCT_GESTURE_IDLE.mouse).toBe(false);
  });

  it('reads a press let go within the slop as a tap', () => {
    const { actions, state } = play([
      { type: 'down' },
      { type: 'move', x: 108, y: 92 },
      { type: 'up', x: 108 },
    ]);
    expect(actions).toEqual([null, null, { type: 'tap', x: 108, y: 100 }]);
    expect(state.mode).toBe('idle');
    expect(state.tap).toEqual({ x: 108, at: 0 });
  });

  it('pans a finger dragged across the plot past the slop, the whole way from the press', () => {
    const { actions, state } = play([
      { type: 'down' },
      { type: 'move', x: 109, y: 100 },
      { type: 'move', x: 120, y: 105 },
      { type: 'up', x: 120 },
    ]);
    expect(actions).toEqual([
      null,
      { type: 'pan', dx: 9, shiftY: 0 },
      { type: 'pan', dx: 11, shiftY: 5 },
      null,
    ]);
    expect(state.mode).toBe('idle');
    expect(state.tap).toBeNull();
  });

  it('gives a finger dragged along the page to the page', () => {
    const { actions, state } = play([
      { type: 'down' },
      { type: 'move', x: 104, y: 109 },
      { type: 'move', x: 160, y: 120 },
    ]);
    expect(actions).toEqual([null, null, null]);
    expect(state.mode).toBe('page');
  });

  it('pans a mouse dragged any way', () => {
    const { actions } = play([
      { type: 'down', mouse: true },
      { type: 'move', x: 104, y: 112, mouse: true },
    ]);
    expect(actions[1]).toEqual({ type: 'pan', dx: 4, shiftY: 12 });
  });

  it('decides the direction of an even drag for the plot', () => {
    expect(
      play([{ type: 'down' }, { type: 'move', x: 110, y: 110 }]).actions[1],
    ).toEqual({ type: 'pan', dx: 10, shiftY: 10 });
  });

  it('carries the cursor under a finger held still, and not under a mouse', () => {
    const held = play([
      { type: 'down' },
      { type: 'hold' },
      { type: 'move', x: 150, y: 140 },
      { type: 'up', x: 150 },
    ]);
    expect(held.actions).toEqual([
      null,
      { type: 'hold', x: 100, y: 100 },
      { type: 'drag', x: 150, y: 140 },
      null,
    ]);
    expect(
      play([{ type: 'down', mouse: true }, { type: 'hold' }]).actions[1],
    ).toBeNull();
    // a finger that already moved is not held
    expect(
      play([{ type: 'down' }, { type: 'move', x: 120 }, { type: 'hold' }])
        .actions[2],
    ).toBeNull();
  });

  it('pinches two fingers about their middle, and pans with it', () => {
    const { actions, state } = play([
      { type: 'down', id: 1, x: 100, y: 100 },
      { type: 'down', id: 2, x: 200, y: 100 },
      { type: 'move', id: 2, x: 300, y: 100 },
      { type: 'move', id: 1, x: 120, y: 140 },
    ]);
    expect(state.mode).toBe('pinch');
    expect(actions[2]).toEqual({
      type: 'pinch',
      factor: 2,
      about: 150,
      dx: 50,
      aboutY: 100,
      shiftY: 0,
    });
    // the second axis: the middle moved down by half the finger's way, the distance is the diagonal
    expect(actions[3]).toEqual({
      type: 'pinch',
      factor: Math.hypot(180, 40) / 200,
      about: 200,
      dx: 10,
      aboutY: 100,
      shiftY: 20,
    });
  });

  it('gives a pinch whose fingers met a factor of one', () => {
    const { actions } = play([
      { type: 'down', id: 1, x: 100, y: 100 },
      { type: 'down', id: 2, x: 100, y: 100 },
      { type: 'move', id: 2, x: 140, y: 100 },
    ]);
    expect(actions[2]).toEqual({
      type: 'pinch',
      factor: 1,
      about: 100,
      dx: 20,
      aboutY: 100,
      shiftY: 0,
    });
  });

  it('ends a pinch when a finger lifts, and lets the other do nothing', () => {
    const { actions, state } = play([
      { type: 'down', id: 1 },
      { type: 'down', id: 2, x: 200 },
      { type: 'up', id: 2, x: 200 },
      { type: 'move', id: 1, x: 150 },
      { type: 'up', id: 1, x: 150 },
    ]);
    expect(actions).toEqual([null, null, null, null, null]);
    expect(state.mode).toBe('idle');
  });

  it('reads a second tap close in time and place as a double tap', () => {
    const first = play([
      { type: 'down', at: 1000 },
      { type: 'up', at: 1050 },
    ]);
    const second = play(
      [
        { type: 'down', at: 1300, x: 124 },
        { type: 'up', at: 1350, x: 124 },
      ],
      first.state,
    );
    expect(second.actions[1]).toEqual({ type: 'double', x: 124, y: 100 });
    expect(second.state.tap).toBeNull();
    // a third tap is a tap again
    expect(
      play(
        [
          { type: 'down', at: 1400 },
          { type: 'up', at: 1400 },
        ],
        second.state,
      ).actions[1],
    ).toEqual({ type: 'tap', x: 100, y: 100 });
  });

  it('keeps two taps too far apart in time or place apart', () => {
    const first = play([
      { type: 'down', at: 0 },
      { type: 'up', at: 0 },
    ]).state;
    expect(
      play(
        [
          { type: 'down', at: 301 },
          { type: 'up', at: 301 },
        ],
        first,
      ).actions[1],
    ).toEqual({ type: 'tap', x: 100, y: 100 });
    expect(
      play(
        [
          { type: 'down', at: 100, x: 125 },
          { type: 'up', at: 100, x: 125 },
        ],
        first,
      ).actions[1],
    ).toEqual({ type: 'tap', x: 125, y: 100 });
  });

  it('reads nothing of a pointer it never saw pressed, nor of one the page took back', () => {
    expect(play([{ type: 'move' }]).actions).toEqual([null]);
    expect(play([{ type: 'up' }]).actions).toEqual([null]);
    expect(play([{ type: 'hold' }]).actions).toEqual([null]);
    const taken = play([{ type: 'down' }, { type: 'cancel' }, { type: 'up' }]);
    expect(taken.actions).toEqual([null, null, null]);
    expect(taken.state.mode).toBe('idle');
  });

  it('leaves the state it was given as it was', () => {
    const before = play([{ type: 'down' }]).state;
    const size = before.pointers.size;
    pctGestureStep(before, {
      type: 'move',
      id: 1,
      x: 200,
      y: 100,
      mouse: false,
      at: 0,
    });
    expect(before.pointers.size).toBe(size);
    expect(before.pointers.get(1)!.x).toBe(100);
  });
  it('gives the rest to the page when one of three fingers lifts, and keeps it so when a third presses again', () => {
    const { actions, state } = play([
      { type: 'down', id: 1, x: 100 },
      { type: 'down', id: 2, x: 200 },
      { type: 'down', id: 3, x: 300 },
      { type: 'up', id: 3, x: 300 },
    ]);
    expect(actions).toEqual([null, null, null, null]);
    expect(state.mode).toBe('page');
    expect(state.pointers.size).toBe(2);
    const again = play([{ type: 'down', id: 3, x: 300 }], state);
    expect(again.state.mode).toBe('page');
    expect(again.state.pointers.size).toBe(3);
  });

  it('leaves the state as it was for a pointer it never saw move', () => {
    const { state } = play([{ type: 'move', id: 7 }]);
    expect(state).toBe(PCT_GESTURE_IDLE);
  });

  it('reads no pinch of a pinch left with one finger', () => {
    const lone: PctGestureState = {
      mode: 'pinch',
      pointers: new Map([[1, { x: 100, y: 100, startX: 100, startY: 100 }]]),
      tap: null,
      mouse: false,
    };
    const { state, action } = pctGestureStep(lone, {
      type: 'move',
      id: 1,
      x: 140,
      y: 100,
      mouse: false,
      at: 0,
    });
    expect(action).toBeNull();
    expect(state.mode).toBe('pinch');
    expect(state.pointers.get(1)!.x).toBe(140);
  });
});
