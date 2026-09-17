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
 *
 * **Inline leaves two of the five**, and the three that go are the three the overlay was
 * delivering: `escape` and `outside` come from the closing stack, which has no entry for a
 * panel that was never attached
 * ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)), and
 * `away` is the Tab splice of
 * [0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md), which
 * a panel standing in the page's own order has no use for. A popover drawn in the page closes
 * from its trigger or from the application, and the type says so rather than the boolean:
 * `trigger` and `api` are all an inline close can carry.
 *
 * @since 0.1.0
 */
export type PctPopoverCloseReason =
  'trigger' | 'escape' | 'outside' | 'away' | 'api';
