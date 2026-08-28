/**
 * The heading level an item's title is drawn at — a real `<h2>`…`<h6>`, because the whole
 * reason the title is a heading is that a screen-reader user jumps between sections with the
 * `H` key, and that navigation reads the document's outline rather than an attribute.
 *
 * There is no `1`: a page has one first-level heading and it is not a section of an
 * accordion. The level is an input rather than a decision taken here for the reason every
 * heading level is a fact about the page and not about the widget — an accordion under an
 * `<h2>` wants `3`, one under an `<h3>` wants `4`, and only the consumer knows which.
 */
export type PctAccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;
