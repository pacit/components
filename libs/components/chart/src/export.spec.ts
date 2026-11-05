import { pctPictureOf, pctPngOf, pctSvgOf } from './export';

const SVG = 'http://www.w3.org/2000/svg';
const frame = {
  width: 300,
  height: 150,
  title: 'Supply air',
  description: 'From noon to one.',
  background: 'rgb(1, 2, 3)',
};

/** A layer as the scene draws it: classes, Angular's attributes and `aria-hidden` on it. */
function layer(part: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'layer');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-pct-part', part);
  svg.setAttribute('_ngcontent-ng-c1', '');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('class', 'series');
  path.setAttribute('d', 'M0 0L10 10');
  path.setAttribute('style', 'stale: 1');
  svg.append(path);
  document.body.append(svg);
  return svg;
}

const parse = (text: string) =>
  new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;

describe('pctSvgOf', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('writes one standalone document of the frame, named, described and on its ground', () => {
    const root = parse(pctSvgOf([layer('data'), layer('axis')], frame));
    expect(root.namespaceURI).toBe(SVG);
    expect(root.getAttribute('xmlns')).toBe(SVG);
    expect(root.getAttribute('width')).toBe('300');
    expect(root.getAttribute('height')).toBe('150');
    expect(root.getAttribute('viewBox')).toBe('0 0 300 150');
    const [title, desc, ground, data, axis] = [...root.children];
    expect(title.localName).toBe('title');
    expect(title.textContent).toBe('Supply air');
    expect(desc.localName).toBe('desc');
    expect(desc.textContent).toBe('From noon to one.');
    expect(ground.localName).toBe('rect');
    expect(ground.getAttribute('width')).toBe('100%');
    expect(ground.getAttribute('height')).toBe('100%');
    expect(ground.getAttribute('fill')).toBe('rgb(1, 2, 3)');
    expect(data.getAttribute('data-pct-part')).toBe('data');
    expect(axis.getAttribute('data-pct-part')).toBe('axis');
    for (const copy of [data, axis]) {
      expect(copy.getAttribute('width')).toBe('300');
      expect(copy.getAttribute('height')).toBe('150');
      expect(copy.querySelector('path')?.getAttribute('d')).toBe('M0 0L10 10');
    }
  });

  it('drops the page’s classes, Angular’s attributes and aria-hidden, and leaves the page alone', () => {
    const data = layer('data');
    const root = parse(pctSvgOf([data], frame));
    for (const element of [root, ...root.querySelectorAll('*')]) {
      for (const { name } of element.attributes) {
        expect(name).not.toBe('class');
        expect(name).not.toBe('aria-hidden');
        expect(name.startsWith('_ng')).toBe(false);
      }
    }
    expect(data.getAttribute('class')).toBe('layer');
    expect(data.querySelector('path')?.getAttribute('class')).toBe('series');
  });

  it('writes no description and no ground where there are none', () => {
    const root = parse(
      pctSvgOf([layer('data')], { ...frame, description: '', background: '' }),
    );
    expect([...root.children].map((c) => c.localName)).toEqual([
      'title',
      'svg',
    ]);
  });

  it('writes the computed styles into each element, and only what has a value', () => {
    const data = layer('data');
    const path = data.querySelector('path')!;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) =>
        ({
          getPropertyValue: (name: string) =>
            element === path
              ? ({
                  fill: 'none',
                  stroke: 'rgb(9, 9, 9)',
                  'stroke-width': '2px',
                }[name] ?? '')
              : '',
        }) as CSSStyleDeclaration,
    );
    data.setAttribute('style', 'stale: 2');
    const root = parse(pctSvgOf([data], frame));
    const copy = root.querySelector('svg')!;
    expect(copy.querySelector('path')?.getAttribute('style')).toBe(
      'fill:none;stroke:rgb(9, 9, 9);stroke-width:2px',
    );
    // an element with nothing computed keeps no style, not even the one it had
    expect(copy.hasAttribute('style')).toBe(false);
  });
});

describe('pctPictureOf', () => {
  afterEach(() => document.body.replaceChildren());

  /** A host as a scene lays it: figure, picture, the layers, and an icon's svg elsewhere. */
  function host(): HTMLElement {
    const element = document.createElement('div');
    element.innerHTML = `<figure class="figure"><div class="picture"></div></figure><button><svg class="layer"></svg></button>`;
    const picture = element.querySelector('.picture')!;
    picture.append(layer('data'), layer('axis'));
    // a layer that is not the picture's own is no layer of the export
    const inner = document.createElementNS(SVG, 'svg');
    inner.setAttribute('class', 'layer');
    picture.querySelector('svg')!.append(inner);
    document.body.append(element);
    element.style.setProperty('--pct-surface', ' rgb(4, 5, 6) ');
    return element;
  }

  it('exports the picture’s own layers, on the surface of the theme', () => {
    const root = parse(
      pctPictureOf(host(), { width: 200, height: 100 }, 'Fan', '', 'Words'),
    );
    expect(root.getAttribute('width')).toBe('200');
    expect(root.querySelector('title')?.textContent).toBe('Fan');
    expect(root.querySelector('desc')?.textContent).toBe('Words');
    expect(root.querySelector('rect')?.getAttribute('fill')).toBe(
      'rgb(4, 5, 6)',
    );
    expect(
      [...root.children]
        .filter((c) => c.localName === 'svg')
        .map((c) => c.getAttribute('data-pct-part')),
    ).toEqual(['data', 'axis']);
  });

  it('names the picture by the elements that label it, when it has no label', () => {
    const element = host();
    document.body.insertAdjacentHTML(
      'beforeend',
      '<h2 id="a"> Heat </h2><span id="b">recovery</span>',
    );
    const root = parse(
      pctPictureOf(element, { width: 1, height: 1 }, '', 'a  missing b', ''),
    );
    expect(root.querySelector('title')?.textContent).toBe('Heat recovery');
    const named = parse(
      pctPictureOf(element, { width: 1, height: 1 }, 'Own', 'a', ''),
    );
    expect(named.querySelector('title')?.textContent).toBe('Own');
  });

  it('exports nothing before the scene has drawn or has a size', () => {
    const empty = document.createElement('div');
    expect(pctPictureOf(empty, { width: 200, height: 100 }, 'x', '', '')).toBe(
      '',
    );
    expect(pctPictureOf(host(), { width: 0, height: 100 }, 'x', '', '')).toBe(
      '',
    );
  });
});

describe('pctPngOf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
  });

  function stubCanvas(blob: Blob | null) {
    const drawImage = vi.fn();
    const canvases: HTMLCanvasElement[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      function (this: HTMLCanvasElement, type: string) {
        expect(type).toBe('2d');
        canvases.push(this);
        return { drawImage } as unknown as CanvasRenderingContext2D;
      } as never,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback, type) => {
        expect(type).toBe('image/png');
        callback(blob);
      },
    );
    const sources: string[] = [];
    // jsdom decodes no images: the method is the browser's, stood in for here
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value(this: HTMLImageElement) {
        sources.push(this.src);
        return Promise.resolve();
      },
    });
    return { drawImage, canvases, sources };
  }

  it('draws the document onto a canvas its size times the scale, and reads a PNG back', async () => {
    const png = new Blob(['png'], { type: 'image/png' });
    const { drawImage, canvases, sources } = stubCanvas(png);
    await expect(pctPngOf('<svg a="1"/>', 300, 150, 2, document)).resolves.toBe(
      png,
    );
    expect(canvases[0].width).toBe(600);
    expect(canvases[0].height).toBe(300);
    expect(sources[0]).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg a="1"/>')}`,
    );
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 600, 300);
  });

  it('rounds the canvas to whole pixels, and to one at the least', async () => {
    const { canvases } = stubCanvas(new Blob());
    await pctPngOf('<svg/>', 100.4, 0.2, 1.5, document);
    expect(canvases[0].width).toBe(151);
    expect(canvases[0].height).toBe(1);
  });

  it('rejects with no canvas to draw on, and with no PNG read back', async () => {
    stubCanvas(null);
    await expect(pctPngOf('<svg/>', 1, 1, 1, document)).rejects.toThrow(
      'pct-chart: the canvas gave no PNG back',
    );
    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(pctPngOf('<svg/>', 1, 1, 1, document)).rejects.toThrow(
      'pct-chart: no canvas to draw the PNG on',
    );
  });
});
