/**
 * Which surface of the element takes the brand gradient. One face per element and not three
 * switches: gradient text on a gradient fill is the one combination nobody can read, and a
 * single input refuses it by construction rather than by documentation
 * ([0065](../../../../docs/decisions/0065-a-treatment-that-paints-is-a-component.md)).
 *
 * @since 0.1.0
 */
export type PctHeroFace = 'edge' | 'text' | 'fill';

/**
 * When the face paints: always, or only while the element is under attention.
 *
 * @since 0.1.0
 */
export type PctHeroShow = 'always' | 'interact';
