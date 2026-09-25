import type { PctSize } from '@pacit/components/core';

/**
 * How much of the page's colour a button takes: solid, outline, ghost, soft, or `hero` — the
 * one loud face, with the gradient that drifts.
 *
 * @since 0.1.0
 */
export type PctButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft' | 'hero';
/**
 * The size of a button: the library's own scale.
 *
 * @since 0.1.0
 */
export type PctButtonSize = PctSize;
