/**
 * Which axis the strip runs along. It is `aria-orientation` on the tablist and the axis the
 * arrow keys walk — one input for both, because a strip drawn down the side and walked with
 * `ArrowRight` is the defect the attribute exists to describe.
 */
export type PctTabsOrientation = 'horizontal' | 'vertical';

/**
 * Whether moving the keyboard over the strip also chooses.
 *
 * The ARIA APG names both and recommends `automatic` **when showing a panel is free** — which
 * is a fact about the consumer's content and not about this component, so it is an input
 * rather than a decision taken here. `manual` is the answer for a panel that fetches
 * something: with `automatic` a walk from the first tab to the fourth would start three
 * requests nobody asked for.
 */
export type PctTabsActivation = 'automatic' | 'manual';
