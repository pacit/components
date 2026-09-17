/**
 * What the tooltip's text IS to the control it hangs on — the distinction this component
 * exists to force, and the one a `title` attribute never makes.
 *
 * - `description` — the control has a name of its own and the tooltip says something more
 *   about it ("Delete" → "removes the project and everything in it"). It reaches assistive
 *   technology as `aria-describedby`, and only while the panel is on the screen: a
 *   description nobody can see is a description nobody is missing.
 * - `name` — the control has NO name of its own, which is the icon-only button, and the
 *   tooltip is the only thing that says what it does. It reaches assistive technology as
 *   `aria-label`, permanently: a name that came and went with the pointer would leave the
 *   button unnamed for everyone who never hovers, and that is a violation an audit sees
 *   (`req-a11y-axe`).
 *
 * The default is `description`, because it is the one that adds and the other one replaces.
 *
 * @since 0.1.0
 */
export type PctTooltipAs = 'description' | 'name';
