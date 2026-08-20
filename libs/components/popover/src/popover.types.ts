/**
 * Why a popover closed. `open` says *that* it is shut and nothing else, and the question an
 * application asks about a panel it did not close itself — did the user answer, or did they
 * walk away from it — is answered by this and by nothing in the boolean.
 *
 * - `trigger` — the control that opened it was pressed again, which is also what the
 *   component's own `toggle()` does;
 * - `escape` — the Escape key, delivered by the closing stack
 *   ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md));
 * - `outside` — a press landed somewhere that is neither the panel nor the trigger;
 * - `away` — Tab walked out of the panel, in either direction. The panel is **not** modal, so
 *   this is an ordinary way out of it rather than an error, and focus goes back to the trigger
 *   so that the page's own order carries on from where the panel came from;
 * - `api` — the value written from the outside, which includes every button a consumer put in
 *   the content. A popover cannot tell one of those from another, and pretending otherwise
 *   would be an invented distinction.
 */
export type PctPopoverCloseReason =
  'trigger' | 'escape' | 'outside' | 'away' | 'api';
