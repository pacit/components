/** One canvas context for every scene of a document: the measure needs no drawing. */
const contexts = new WeakMap<Document, CanvasRenderingContext2D | null>();

/** The document's context, made once; `null` where the document has no canvas to draw on. */
function contextOf(document: Document): CanvasRenderingContext2D | null {
  let context = contexts.get(document);
  if (context === undefined) {
    try {
      context = document.createElement('canvas').getContext?.('2d') ?? null;
    } catch {
      // The server's DOM has the element and not the drawing (domino: `NotYetImplemented`).
      context = null;
    }
    contexts.set(document, context);
  }
  return context;
}

/**
 * The width of a text in a font, in pixels: `measureText` on a canvas, which matches the SVG's
 * own width (0100, P3). Without a canvas — on the server, in a test — a letter is six tenths of
 * the font's size, so a layout still has a number to thin by.
 *
 * @since 0.3.1
 */
export function pctMeasureText(
  document: Document,
  font: { readonly family: string; readonly px: number },
  text: string,
): number {
  const context = contextOf(document);
  if (!context) return text.length * font.px * 0.6;
  context.font = `${font.px}px ${font.family}`;
  return context.measureText(text).width;
}
