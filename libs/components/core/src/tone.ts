/**
 * What a message says about itself besides what it says — and the same four words everywhere.
 *
 * A tone is a **pair of channels, never one**: the colour a skin gives it, and a drawing the
 * component ships under the matching name in `PctIconName`. That is not decoration doubled up.
 * A state painted in colour alone is a state carried by colour alone
 * ([`req-a11y-forced-colors`](../../../../docs/requirements/a11y.md#req-a11y-forced-colors)):
 * it is gone for a reader who cannot separate red from green, and gone again in forced-colours
 * mode, where the palette is the user's and the author's greens are not invited.
 *
 * **Four names, decided once, for every component that will ever want them.** The toast asked
 * first and the progress bar asked second, both refusing to answer alone — a set of tones is a
 * shared property, and a shared property settled by whoever needed it first is an accident of
 * that one case ([0011](../../../../docs/decisions/0011-icons.md),
 * [0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)). The field's
 * error, the dialog's confirm and whatever the banner turns out to be inherit this list rather
 * than starting another.
 *
 * There is no `neutral` member: a component with no tone takes no `tone` at all, and the
 * absence is the neutral. A union with a member meaning "none of the above" would make every
 * consumer write it.
 *
 * @since 0.1.0
 */
export type PctTone = 'success' | 'warning' | 'danger' | 'info';
