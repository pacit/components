/**
 * Which axis the strip runs along. It is `aria-orientation` on the tablist and the axis the
 * arrow keys walk — one input for both, because a strip drawn down the side and walked with
 * `ArrowRight` is the defect the attribute exists to describe.
 *
 * @since 0.1.0
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
 *
 * @since 0.1.0
 */
export type PctTabsActivation = 'automatic' | 'manual';

/**
 * Which face the strip wears.
 *
 * `underline` is the default and the quiet one: labels on a rail, the chosen one marked by an
 * edge. `segmented` is the control the platform's own settings screens use — the strip becomes
 * a recessed track and the chosen tab a raised segment filled with the page's own surface.
 *
 * It is a variant and not a stylesheet in the consumer's application for the reason
 * [0058](../../../../docs/decisions/0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md)
 * gives about the button's five faces: paint goes where paint goes. Reaching the same look
 * from outside took a dozen token overrides to UNDO the rail and two rules through the parts,
 * because two of the values a segmented control needs had no token at all.
 *
 * @since 0.1.0
 */
export type PctTabsVariant = 'underline' | 'segmented';
