/**
 * Which edge of the viewport the drawer is docked to.
 *
 * `start` and `end` are logical and not `left` / `right`: a drawer docked to the start edge
 * comes from the left in an English page and from the right in an Arabic one, and that is one
 * value rather than two components ([`req-token-logical`](../../../../docs/requirements/tokens.md#req-token-logical)).
 * The block pair is spelled out for the same reason — `top` and `bottom` are the block axis's
 * own words in a horizontal writing mode, and a page written vertically gets them mirrored by
 * the same rule that mirrors the inline pair.
 *
 * @since 0.1.0
 */
export type PctDrawerSide = 'start' | 'end' | 'top' | 'bottom';

/**
 * Why the drawer closed.
 *
 * The reason is what an application acts on and `open` carries none of it: `escape` and
 * `trigger` are a withdrawal, `close` is an answer given to the panel's own cross, and `api`
 * is every value written from outside — including a control the consumer put in the content.
 *
 * @since 0.1.0
 */
export type PctDrawerCloseReason = 'escape' | 'close' | 'trigger' | 'api';
