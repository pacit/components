import { InjectionToken, Provider, Signal } from '@angular/core';
import { PctTone } from '@pacit/components/core';

/**
 * The one thing a toast can offer besides going away: a label and what pressing it does.
 *
 * A toast carrying one **does not expire** — that is not politeness but arithmetic. The
 * control sits at the very end of the page's tab order (an element appended to `body` is
 * last in DOM order, measured in three engines), so a user reaching it by keyboard passes
 * every control on the page first; a clock running underneath that walk is a promise the
 * library cannot keep (WCAG 2.2.1). The type says so rather than a runtime rule:
 * {@link PctToastStanding} has no `duration` at all.
 *
 * @since 0.1.0
 */
export interface PctToastAction {
  readonly label: string;
  /** Run on press. The toast goes away afterwards — the thing it offered has been done. */
  readonly run: () => void;
}

/**
 * A message that says something happened and then goes away by itself.
 *
 * `duration` is milliseconds; `null` keeps it up until it is dismissed, and anything at or
 * below zero reads the same way. Left out, it is the configured default
 * ({@link PctToastConfig}).
 *
 * @since 0.1.0
 */
export interface PctToastNotice {
  readonly text: string;
  readonly duration?: number | null;
  /**
   * What the message is about, drawn as an icon beside the sentence and as the colour of the
   * card's edge. Left out, the message carries no tone and no icon at all — see {@link PctTone}
   * for why the union has no `neutral` in it.
   */
  readonly tone?: PctTone;
  readonly urgent?: never;
  readonly action?: never;
}

/**
 * A message that stays until somebody deals with it: one that can be acted on, or one urgent
 * enough to interrupt what a screen reader is saying.
 *
 * There is no `duration` here, and its absence is the gate for the rule above — a standing
 * message with a clock is refused by the compiler rather than by a line in a service.
 *
 * @since 0.1.0
 */
export interface PctToastStanding {
  readonly text: string;
  /**
   * Whether this interrupts. It decides what the message is announced as and nothing about
   * how it is drawn: an urgent toast is `role="alert"` inside the region, which the engines
   * publish as `live=assertive` with `atomic=true` for that message alone, while the region
   * around it stays polite
   * ([0044](../../../../docs/decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)).
   *
   * It is deliberately **not** a colour, and it is not {@link PctToastStanding.tone} either:
   * urgency is about INTERRUPTING, tone is about what happened. A failure a user can deal with
   * later is `tone: 'danger'` and not urgent; a session about to expire is urgent whatever its
   * tone. The two are drawn by different halves of the component and read by different people.
   */
  readonly urgent?: boolean;
  /**
   * What the message is about — the icon beside the sentence and the colour of the edge.
   * The icon is the half that survives a forced palette and a reader who does not separate
   * red from green, which is why a tone is never only a colour here ({@link PctTone}).
   */
  readonly tone?: PctTone;
  readonly action?: PctToastAction;
  readonly duration?: never;
}

/**
 * What {@link PctToaster.show} takes: a bare sentence, or one of the two shapes above.
 *
 * @since 0.1.0
 */
export type PctToastSpec = PctToastNotice | PctToastStanding;

/**
 * The handle a caller keeps — enough to take back a message that has stopped being true.
 *
 * @since 0.1.0
 */
export interface PctToastRef {
  readonly id: number;
  /** Takes the message down. Dismissing one that has already gone is a no-op. */
  dismiss(): void;
}

/**
 * A message as the viewport draws it: what is on the screen and nothing else. The clock, the
 * action's callback and the politeness the region was opened with stay with the service —
 * a view that cannot reach them cannot get them wrong.
 *
 * @since 0.1.0
 */
export interface PctToastState {
  readonly id: number;
  readonly text: string;
  readonly urgent: boolean;
  /** The tone, or `null` for a message that named none — the view then draws no icon. */
  readonly tone: PctTone | null;
  /** The action's label, `''` when there is none — the view draws no button for an empty one. */
  readonly actionLabel: string;
}

/**
 * Which edge of the block axis the stack stands at — `start` is the top of a Latin page.
 *
 * @since 0.1.0
 */
export type PctToastBlock = 'start' | 'end';
/**
 * Where on the inline axis: `start`/`end` mirror with the writing direction, `center` does not.
 *
 * @since 0.1.0
 */
export type PctToastInline = 'start' | 'center' | 'end';

/**
 * The application's answers to the four questions a toast cannot ask per message.
 *
 * @since 0.1.0
 */
export interface PctToastConfig {
  readonly block: PctToastBlock;
  readonly inline: PctToastInline;
  /** How long a {@link PctToastNotice} with no `duration` of its own stays, in milliseconds. */
  readonly duration: number;
  /**
   * How many messages may stand at once. Over the limit the **oldest** goes, and that is the
   * honest half of a cost rather than a feature: a burst of messages taller than the window
   * covers the page it is reporting on, and something has to give. The number is the
   * application's because only it knows how tall its window is.
   */
  readonly limit: number;
}

/**
 * The toast configuration a page gets without asking: bottom right, six seconds, four at a time.
 *
 * @since 0.1.0
 */
export const PCT_DEFAULT_TOAST_CONFIG: PctToastConfig = {
  block: 'end',
  inline: 'end',
  duration: 6000,
  limit: 4,
};

/**
 * The token the toast configuration is read from; unprovided, it falls back to the default above.
 *
 * @since 0.1.0
 */
export const PCT_TOAST_CONFIG = new InjectionToken<PctToastConfig>(
  'PCT_TOAST_CONFIG',
  { factory: () => PCT_DEFAULT_TOAST_CONFIG },
);

/**
 * Registers the toast configuration (the provideX pattern, `req-api-config`). It is its own
 * token rather than four fields of `PctConfig`, for the reason that keeps the texts apart as
 * well: an application that never raises a toast should not carry the answers to questions it
 * never asks.
 *
 * @example
 * bootstrapApplication(App, {
 *   providers: [providePctToastConfig({ block: 'start', inline: 'center' })],
 * });
 *
 * @since 0.1.0
 */
export function providePctToastConfig(
  config: Partial<PctToastConfig>,
): Provider {
  return {
    provide: PCT_TOAST_CONFIG,
    useValue: { ...PCT_DEFAULT_TOAST_CONFIG, ...config },
  };
}

/**
 * What the viewport is given, and the whole of it. The view is created by a service rather
 * than written into somebody's template, so the two are joined by a token instead of by an
 * import — which is also what keeps the two files from importing each other.
 *
 * @since 0.1.0
 */
export interface PctToastHost {
  /** What is on the screen, in the order it arrived. */
  readonly toasts: Signal<readonly PctToastState[]>;
  /** Where the stack stands. Read once: a viewport is created once and outlives the messages. */
  readonly placement: {
    readonly block: PctToastBlock;
    readonly inline: PctToastInline;
  };
  /** The user took the message down. */
  dismiss(id: number): void;
  /** The user pressed the action. */
  run(id: number): void;
  /** A pointer or the keyboard is inside the stack: nothing expires until it leaves. */
  hold(): void;
  /** It has left. */
  release(): void;
}

/**
 * The token a toaster registers itself under, so the service reaches the region that draws the messages.
 *
 * @since 0.1.0
 */
export const PCT_TOAST_HOST = new InjectionToken<PctToastHost>(
  'PCT_TOAST_HOST',
);
