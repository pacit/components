/**
 * One entry in the strip the component draws: either a page number to offer, or a gap where
 * a run of pages has been folded away.
 *
 * `'ellipsis'` is a value and not `null` on purpose — the template renders it, gives it a
 * `data-pct-part` and an `aria-hidden`, and the folding logic that produces it
 * ([0048](../../../../docs/decisions/0048-a-pagination-owns-its-page-number.md)) is the whole
 * of what this component computes. A consumer never supplies these; `PctPagination` derives
 * the list from `page`, `count`, `siblingCount` and `boundaryCount`.
 *
 * @since 0.1.0
 */
export type PctPaginationItem = number | 'ellipsis';
