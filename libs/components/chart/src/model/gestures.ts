/**
 * What a pointer did, as the gesture machine reads it: a press, a move, a lift, the page taking
 * it back, or a press held still long enough (`hold`, which the caller raises on a timer).
 *
 * @since next
 */
export interface PctPointerInput {
  readonly type: 'down' | 'move' | 'up' | 'cancel' | 'hold';
  readonly id: number;
  /** Where the pointer is, in the plot's pixels. */
  readonly x: number;
  readonly y: number;
  /** A mouse: no hold, and a drag in any direction pans. */
  readonly mouse: boolean;
  /** When, in milliseconds: two taps close in time and place are a double tap. */
  readonly at: number;
}

/**
 * What a gesture asks of the chart. `pan` moves the window by `dx` pixels; `pinch` zooms it by
 * `factor` about the pixel `about` and moves it by `dx`; `tap` and `double` are a press let go
 * where it began, once or twice; `hold` places the cursor under a finger held still, and
 * `drag` moves it there.
 *
 * @since next
 */
export type PctGestureAction =
  | { readonly type: 'pan'; readonly dx: number; readonly shiftY: number }
  | {
      readonly type: 'pinch';
      readonly factor: number;
      readonly about: number;
      readonly dx: number;
      /** The middle across the plot, and how far it moved: for a zoom on both axes. */
      readonly aboutY: number;
      readonly shiftY: number;
    }
  | {
      readonly type: 'tap' | 'double' | 'hold' | 'drag';
      readonly x: number;
      readonly y: number;
    };

/**
 * Where a gesture stands: the pointers down, and what they are doing — nothing yet
 * (`pending`), moving the window (`pan`, `pinch`), carrying the cursor (`hold`), or given to the
 * page (`page`, a vertical drag the page scrolls with).
 *
 * @since next
 */
export interface PctGestureState {
  readonly mode: 'idle' | 'pending' | 'pan' | 'pinch' | 'hold' | 'page';
  readonly pointers: ReadonlyMap<
    number,
    {
      readonly x: number;
      readonly y: number;
      readonly startX: number;
      readonly startY: number;
    }
  >;
  /** The last tap, for a double tap. */
  readonly tap: { readonly x: number; readonly at: number } | null;
  /** Whether a mouse made the gesture. */
  readonly mouse: boolean;
}

/**
 * The thresholds of the gestures, in pixels and milliseconds.
 *
 * @since next
 */
export interface PctGestureRules {
  /** How far a press moves before it is a drag, not a tap. */
  readonly slop: number;
  /** How close in time two taps are to be a double tap. */
  readonly doubleTime: number;
  /** How close in place two taps are to be a double tap. */
  readonly doubleDistance: number;
}

/**
 * The thresholds the chart uses: 8 px of slop, a double tap within 300 ms and 24 px (0101).
 *
 * @since next
 */
export const PCT_GESTURE_RULES: PctGestureRules = {
  slop: 8,
  doubleTime: 300,
  doubleDistance: 24,
};

/**
 * No gesture.
 *
 * @since next
 */
export const PCT_GESTURE_IDLE: PctGestureState = {
  mode: 'idle',
  pointers: new Map(),
  tap: null,
  mouse: false,
};

/** The middle of two pointers and the distance between them. */
function spread(
  pointers: PctGestureState['pointers'],
): { middle: number; middleY: number; distance: number } | null {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return null;
  return {
    middle: (a.x + b.x) / 2,
    middleY: (a.y + b.y) / 2,
    distance: Math.hypot(a.x - b.x, a.y - b.y),
  };
}

/**
 * One step of the gestures of a plot
 * ([0101](../../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)):
 * the state after `input`, and what the chart is to do. Pure, so the gestures are tested
 * without a browser; the caller keeps the state, raises `hold` on a timer, and acts.
 *
 * A finger's drag decides its direction past the slop: across the plot it pans, along the page
 * it is the page's, and nothing the chart does in between keeps the page from scrolling. A
 * mouse's drag pans whichever way it goes. Two fingers pinch about their middle and pan with
 * it. A press let go within the slop is a tap, and a second close to the first a double tap.
 *
 * @example
 * const { state, action } = pctGestureStep(state, { type: 'move', id, x, y, mouse, at });
 *
 * @since next
 */
export function pctGestureStep(
  state: PctGestureState,
  input: PctPointerInput,
  rules: PctGestureRules = PCT_GESTURE_RULES,
): {
  readonly state: PctGestureState;
  readonly action: PctGestureAction | null;
} {
  const pointers = new Map(state.pointers);
  const own = pointers.get(input.id);
  switch (input.type) {
    case 'down': {
      pointers.set(input.id, {
        x: input.x,
        y: input.y,
        startX: input.x,
        startY: input.y,
      });
      const mode =
        pointers.size === 1
          ? 'pending'
          : pointers.size === 2
            ? 'pinch'
            : state.mode;
      return {
        state: { ...state, mode, pointers, mouse: input.mouse },
        action: null,
      };
    }
    case 'hold': {
      if (state.mode !== 'pending' || state.mouse || !own) break;
      return {
        state: { ...state, mode: 'hold' },
        action: { type: 'hold', x: own.x, y: own.y },
      };
    }
    case 'move': {
      if (!own) break;
      const before = spread(pointers);
      pointers.set(input.id, { ...own, x: input.x, y: input.y });
      const next = { ...state, pointers };
      if (state.mode === 'pinch') {
        const after = spread(pointers);
        if (!before || !after) return { state: next, action: null };
        return {
          state: next,
          action: {
            type: 'pinch',
            factor: before.distance > 0 ? after.distance / before.distance : 1,
            about: before.middle,
            dx: after.middle - before.middle,
            aboutY: before.middleY,
            shiftY: after.middleY - before.middleY,
          },
        };
      }
      if (state.mode === 'pan')
        return {
          state: next,
          action: { type: 'pan', dx: input.x - own.x, shiftY: input.y - own.y },
        };
      if (state.mode === 'hold')
        return {
          state: next,
          action: { type: 'drag', x: input.x, y: input.y },
        };
      if (state.mode !== 'pending') return { state: next, action: null };
      const across = Math.abs(input.x - own.startX);
      const along = Math.abs(input.y - own.startY);
      if (Math.max(across, along) <= rules.slop)
        return { state: next, action: null };
      if (!state.mouse && along > across)
        return { state: { ...next, mode: 'page' }, action: null };
      // Past the slop the window takes the whole way from the press, so nothing is lost.
      return {
        state: { ...next, mode: 'pan' },
        action: {
          type: 'pan',
          dx: input.x - own.startX,
          shiftY: input.y - own.startY,
        },
      };
    }
    case 'up':
    case 'cancel': {
      if (!own) break;
      pointers.delete(input.id);
      const rest: PctGestureState = {
        ...state,
        pointers,
        mode: pointers.size === 0 ? 'idle' : 'page',
      };
      if (input.type === 'cancel' || state.mode !== 'pending')
        return { state: rest, action: null };
      const tap = state.tap;
      const double =
        tap !== null &&
        input.at - tap.at <= rules.doubleTime &&
        Math.abs(input.x - tap.x) <= rules.doubleDistance;
      return {
        state: { ...rest, tap: double ? null : { x: input.x, at: input.at } },
        action: { type: double ? 'double' : 'tap', x: input.x, y: input.y },
      };
    }
  }
  return { state, action: null };
}
