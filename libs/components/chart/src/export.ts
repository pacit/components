/**
 * A chart's picture as a file of its own: its layers drawn again into one standalone `<svg>`
 * with the computed styles written into every element, and that `<svg>` drawn onto a canvas
 * for a PNG. A layer's colours come from the stylesheet and the tokens, which a file opened
 * outside the page does not have; written in, they travel with it
 * ([0120](../../../../docs/decisions/0120-an-export-is-the-picture-drawn-again-and-a-description-is-the-datas-own-words.md)).
 */

/** The presentation an exported element keeps: what an `<svg>` element draws with. */
const KEPT = [
  'display',
  'visibility',
  'opacity',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'paint-order',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
] as const;

const SVG = 'http://www.w3.org/2000/svg';

/** What a picture exported needs besides its layers. */
interface PctExportFrame {
  readonly width: number;
  readonly height: number;
  /** The picture's name, written as its `<title>`. */
  readonly title: string;
  /** The picture's description, written as its `<desc>`. */
  readonly description: string;
  /** A colour laid under the layers, or `''` for none. */
  readonly background: string;
}

/**
 * The layers as one standalone `<svg>` document of the frame's size: each layer copied with
 * the styles the page computed for every element written into it, the page's classes and
 * Angular's attributes dropped, and the name and the description on top.
 */
export function pctSvgOf(
  layers: readonly SVGSVGElement[],
  frame: PctExportFrame,
): string {
  const document = layers[0].ownerDocument;
  const root = document.createElementNS(SVG, 'svg');
  root.setAttribute('width', String(frame.width));
  root.setAttribute('height', String(frame.height));
  root.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
  const title = document.createElementNS(SVG, 'title');
  title.textContent = frame.title;
  root.append(title);
  if (frame.description) {
    const desc = document.createElementNS(SVG, 'desc');
    desc.textContent = frame.description;
    root.append(desc);
  }
  if (frame.background) {
    const ground = document.createElementNS(SVG, 'rect');
    ground.setAttribute('width', '100%');
    ground.setAttribute('height', '100%');
    ground.setAttribute('fill', frame.background);
    root.append(ground);
  }
  const view = document.defaultView!;
  for (const layer of layers) {
    const copy = layer.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('width', String(frame.width));
    copy.setAttribute('height', String(frame.height));
    // The copy and the layer list their elements in one order: the copy is the layer, cloned.
    const from = [layer, ...layer.querySelectorAll('*')];
    const to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((element, i) => {
      const style = view.getComputedStyle(element);
      const written = KEPT.map(
        (name) => [name, style.getPropertyValue(name)] as const,
      )
        .filter(([, value]) => value !== '')
        .map(([name, value]) => `${name}:${value}`)
        .join(';');
      const target = to[i];
      for (const { name } of [...target.attributes]) {
        if (
          name === 'class' ||
          name.startsWith('_ng') ||
          name === 'aria-hidden'
        )
          target.removeAttribute(name);
      }
      if (written) target.setAttribute('style', written);
      else target.removeAttribute('style');
    });
    root.append(copy);
  }
  return new view.XMLSerializer().serializeToString(root);
}

/**
 * A scene's picture as a standalone `<svg>`: the layers of its host's picture, named by its
 * `label` or the text of the elements `labelledby` names, described by `description`, on the
 * theme's surface. `''` while the scene has not drawn.
 */
export function pctPictureOf(
  host: HTMLElement,
  size: { readonly width: number; readonly height: number },
  label: string,
  labelledby: string,
  description: string,
): string {
  const layers = [
    ...host.querySelectorAll<SVGSVGElement>(
      ':scope > .figure > .picture > svg.layer',
    ),
  ];
  if (layers.length === 0 || size.width === 0) return '';
  const document = host.ownerDocument;
  const title =
    label ||
    labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent.trim())
      .filter(Boolean)
      .join(' ');
  const background = document
    .defaultView!.getComputedStyle(host)
    .getPropertyValue('--pct-surface')
    .trim();
  return pctSvgOf(layers, { ...size, title, description, background });
}

/**
 * The `<svg>` document drawn onto a canvas `scale` times its size and read back as a PNG. It
 * rejects where the browser has no canvas to draw on, or cannot read the drawing back.
 */
export async function pctPngOf(
  svg: string,
  width: number,
  height: number,
  scale: number,
  document: Document,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('pct-chart: no canvas to draw the PNG on');
  const image = new document.defaultView!.Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('pct-chart: the canvas gave no PNG back')),
      'image/png',
    ),
  );
}
