/**
 * Why a dialog closed. A boolean says *that* it closed and nothing else, and the two questions
 * an application asks a modal — "did the user agree" and "did the user get out of it" — are
 * both answered by this and by nothing in `open`.
 *
 * - `escape` — the Escape key, delivered by the closing stack
 *   ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md));
 * - `backdrop` — a press on the surface outside the panel;
 * - `close` — the button the dialog draws for itself;
 * - `api` — the value written from the outside, which includes every button the consumer put
 *   in the content. A dialog cannot tell one of those from another, and pretending otherwise
 *   would be an invented distinction.
 */
export type PctDialogCloseReason = 'escape' | 'backdrop' | 'close' | 'api';
