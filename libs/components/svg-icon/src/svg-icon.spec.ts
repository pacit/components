import {
  Component,
  Provider,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PctSvgIconData, PctSvgNode } from '@pacit/components/icon';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { PctSvgIcon, svgIconData, svgIcons, svgSprite } from './svg-icon';

/**
 * The SVG renderer and its two sources: a drawing from data, element by element, through a
 * list of tags and a list of attributes and through nothing else — and a sprite's `<use>`.
 * Measured here is the half that keeps a drawing from anybody's data as safe as a drawing
 * from nobody's: what is dropped, and that the browser never saw it (`req-api-icons`).
 */
describe('@pacit/components/svg-icon', () => {
  const mount = async <T>(type: new () => T, providers: Provider[] = []) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const svgOf = (fixture: ComponentFixture<unknown>) =>
    fixture.nativeElement.querySelector('svg') as SVGSVGElement;

  /** A drawing holding one of every tag the renderer knows, and one it does not. */
  const EVERY: PctSvgIconData = {
    viewBox: '0 0 10 10',
    attributes: { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 },
    nodes: [
      ['path', { d: 'M1 1h8' }],
      ['circle', { cx: 5, cy: 5, r: 2 }],
      ['ellipse', { cx: 5, cy: 5, rx: 3, ry: 2 }],
      ['rect', { x: 1, y: 1, width: 8, height: 8, rx: 1 }],
      ['line', { x1: 0, y1: 0, x2: 10, y2: 10 }],
      ['polyline', { points: '0,0 5,5 10,0' }],
      ['polygon', { points: '0,0 5,5 10,0' }],
      ['script', { d: 'M0 0' }],
    ],
  };

  describe('svgIconData', () => {
    it('reads a node list as a 24-grid drawing with the stroke conventions lucide and tabler draw with', () => {
      const nodes: PctSvgNode[] = [['path', { d: 'M3 9l9-7 9 7' }]];
      expect(svgIconData(nodes)).toEqual({
        viewBox: '0 0 24 24',
        attributes: {
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        nodes,
      });
    });

    it('reads a FontAwesome definition: the box from its width and height, the path filled', () => {
      expect(
        svgIconData({
          icon: [576, 512, [], 'f015', 'M575.8 255.5c0 18-15 32.1-32 32.1'],
        }),
      ).toEqual({
        viewBox: '0 0 576 512',
        attributes: { fill: 'currentColor' },
        nodes: [['path', { d: 'M575.8 255.5c0 18-15 32.1-32 32.1' }]],
      });
    });

    it('reads a two-path definition as two paths, in order', () => {
      expect(
        svgIconData({ icon: [512, 512, [], 'f1e3', ['M1 1', 'M2 2']] }).nodes,
      ).toEqual([
        ['path', { d: 'M1 1' }],
        ['path', { d: 'M2 2' }],
      ]);
    });

    it('takes a drawing written out as it is', () => {
      expect(svgIconData(EVERY)).toBe(EVERY);
    });
  });

  describe('svgIcons', () => {
    it('answers the ids it was given with the renderer and the drawing, and null for the rest', () => {
      const source = svgIcons({ every: EVERY }, { roles: { close: 'every' } });
      expect(source.resolve('every')).toEqual({
        kind: 'component',
        component: PctSvgIcon,
        inputs: { data: EVERY },
      });
      expect(source.resolve('other')).toBeNull();
      expect(source.roles).toEqual({ close: 'every' });
      expect(svgIcons({}).roles).toEqual({});
    });

    it('normalises each drawing once, when the source is made', () => {
      const nodes: PctSvgNode[] = [['path', { d: 'M0 0' }]];
      const source = svgIcons({ a: nodes });
      const first = source.resolve('a');
      expect(first).toEqual({
        kind: 'component',
        component: PctSvgIcon,
        inputs: { data: svgIconData(nodes) },
      });
      // The same object twice: the drawing is made once, not per icon drawn.
      const dataOf = (rendering: unknown) =>
        (rendering as { inputs: { data: unknown } }).inputs.data;
      expect(dataOf(source.resolve('a'))).toBe(dataOf(first));
    });
  });

  describe('svgSprite', () => {
    it('answers every id with the symbol at that address', () => {
      const source = svgSprite('/assets/icons.svg', { roles: { close: 'x' } });
      expect(source.resolve('house')).toEqual({
        kind: 'component',
        component: PctSvgIcon,
        inputs: { href: '/assets/icons.svg#house' },
      });
      expect(source.roles).toEqual({ close: 'x' });
      expect(svgSprite('/i.svg').roles).toEqual({});
    });

    it('spells the symbol the way the sprite does when told to', () => {
      const source = svgSprite('/i.svg', { symbol: (id) => `i-${id}` });
      expect(source.resolve('house')).toEqual({
        kind: 'component',
        component: PctSvgIcon,
        inputs: { href: '/i.svg#i-house' },
      });
    });
  });

  describe('the renderer', () => {
    it('draws every tag it knows, in order, and nothing for a tag it does not', async () => {
      @Component({
        imports: [PctIcon],
        template: `<pct-icon icon="every" />`,
      })
      class Host {}
      const fixture = await mount(
        Host,
        providePctIcons(svgIcons({ every: EVERY })),
      );
      const svg = svgOf(fixture);

      expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');
      expect(svg.getAttribute('width')).toBe('100%');
      expect(svg.getAttribute('height')).toBe('100%');
      expect(svg.getAttribute('focusable')).toBe('false');
      // The root's paint, a number written as its text.
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.getAttribute('stroke-width')).toBe('1.5');
      expect([...svg.children].map((e) => e.tagName)).toEqual([
        'path',
        'circle',
        'ellipse',
        'rect',
        'line',
        'polyline',
        'polygon',
      ]);
      // Every element is in the SVG namespace — the one thing `<svg:…>` buys in a block.
      for (const child of svg.children)
        expect(child.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(svg.querySelector('circle')?.getAttribute('r')).toBe('2');
      expect(svg.querySelector('rect')?.getAttribute('rx')).toBe('1');
      expect(svg.querySelector('polygon')?.getAttribute('points')).toBe(
        '0,0 5,5 10,0',
      );
      // No `<use>`: a drawing is not a sprite.
      expect(svg.querySelector('use')).toBeNull();
    });

    it('paints geometry and paint, and drops an attribute that names a script, an address or a stylesheet — saying so once', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const hostile: PctSvgIconData = {
          viewBox: '0 0 1 1',
          attributes: { onload: 'alert(1)', fill: 'currentColor' },
          nodes: [
            [
              'path',
              {
                d: 'M0 0',
                onclick: 'alert(2)',
                href: 'javascript:alert(3)',
                style: 'fill: red',
                class: 'x',
                id: 'y',
                onload: 'alert(4)',
              },
            ],
          ],
        };
        @Component({
          imports: [PctIcon],
          template: `<pct-icon icon="hostile" />`,
        })
        class Host {}
        const fixture = await mount(
          Host,
          providePctIcons(svgIcons({ hostile })),
        );
        const svg = svgOf(fixture);
        const path = svg.querySelector('path') as SVGPathElement;

        expect(svg.getAttribute('fill')).toBe('currentColor');
        expect(svg.hasAttribute('onload')).toBe(false);
        expect(path.getAttribute('d')).toBe('M0 0');
        for (const name of [
          'onclick',
          'href',
          'style',
          'class',
          'id',
          'onload',
        ])
          expect(path.hasAttribute(name), name).toBe(false);

        // One word per NAME, not per element: `onload` stood on two elements and is said
        // once, and the message carries the list a consumer can check their data against.
        const said = warn.mock.calls.map((call) => String(call[0]));
        expect(
          said.filter((s) => s.startsWith('[pct-svg-icon] `onload`')),
        ).toHaveLength(1);
        expect(said).toHaveLength(6);
        expect(said[0]).toBe(
          '[pct-svg-icon] `onload` is not an attribute the renderer paints and was dropped. ' +
            'A drawing from data carries geometry and paint — d, cx, cy, r, rx, ry, x, y, ' +
            'x1, x2, y1, y2, width, height, points, transform, fill, fill-rule, ' +
            'fill-opacity, clip-rule, stroke, stroke-width, stroke-linecap, ' +
            'stroke-linejoin, stroke-dasharray, stroke-dashoffset, stroke-miterlimit, ' +
            'stroke-opacity, opacity, vector-effect — and nothing that names a script, an ' +
            'address or a stylesheet.',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('an undefined value is an attribute left out, with no word about it', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        @Component({
          imports: [PctSvgIcon],
          template: `<pct-svg-icon [data]="data" />`,
        })
        class Host {
          // The shape a typed icon package exports: every known attribute, most of them unset.
          readonly data: PctSvgIconData = {
            viewBox: '0 0 1 1',
            attributes: { fill: 'none', stroke: undefined },
            nodes: [
              [
                'path',
                { d: 'M0 0', 'stroke-width': undefined, onload: undefined },
              ],
            ],
          };
        }
        const fixture = await mount(Host);
        const svg = svgOf(fixture);
        expect(svg.getAttribute('fill')).toBe('none');
        expect(svg.hasAttribute('stroke')).toBe(false);
        expect(svg.querySelector('path')?.hasAttribute('stroke-width')).toBe(
          false,
        );
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('takes an attribute off again when the drawing stops naming it', async () => {
      @Component({
        imports: [PctSvgIcon],
        template: `<pct-svg-icon [data]="data()" />`,
      })
      class Host {
        readonly data = signal<PctSvgIconData>({
          viewBox: '0 0 1 1',
          attributes: { fill: 'none', stroke: 'currentColor' },
          nodes: [['path', { d: 'M0 0', 'stroke-width': 2 }]],
        });
      }
      const fixture = await mount(Host);
      const svg = svgOf(fixture);
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.querySelector('path')?.getAttribute('stroke-width')).toBe('2');

      fixture.componentInstance.data.set({
        viewBox: '0 0 1 1',
        attributes: { fill: 'currentColor' },
        nodes: [['path', { d: 'M1 1' }]],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(svg.hasAttribute('stroke')).toBe(false);
      expect(svg.getAttribute('fill')).toBe('currentColor');
      expect(svg.querySelector('path')?.hasAttribute('stroke-width')).toBe(
        false,
      );
      expect(svg.querySelector('path')?.getAttribute('d')).toBe('M1 1');
    });

    it('a sprite is one <use> at the address, with no box of its own', async () => {
      @Component({
        imports: [PctIcon],
        template: `<pct-icon icon="house" />`,
      })
      class Host {}
      const fixture = await mount(
        Host,
        providePctIcons(svgSprite('/assets/icons.svg')),
      );
      const svg = svgOf(fixture);
      expect(svg.hasAttribute('viewBox')).toBe(false);
      expect(svg.children).toHaveLength(1);
      expect(svg.firstElementChild?.tagName).toBe('use');
      expect(svg.firstElementChild?.getAttribute('href')).toBe(
        '/assets/icons.svg#house',
      );
    });

    it("a sprite's address names a path or http(s), and any other scheme is refused with a word", async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        @Component({
          imports: [PctIcon],
          template: `
            <pct-icon icon="x" data-testid="script" />
            <pct-icon icon="y" data-testid="data" />
          `,
          providers: [providePctIcons(svgSprite('javascript:alert(1)'))],
        })
        class Host {}
        const fixture = await mount(Host);
        // Angular's URL sanitizer does NOT read `href` on `<use>` — measured: the first cut
        // of this case expected `unsafe:javascript:…` and got the address verbatim. So the
        // element is not written at all, which is the one outcome that cannot run a script.
        expect(fixture.nativeElement.querySelectorAll('use')).toHaveLength(0);
        expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
          '[pct-svg-icon] `javascript:alert(1)#x` names a scheme a sprite cannot come from ' +
            "and was dropped. A sprite's address is a relative path or `http(s):`.",
          '[pct-svg-icon] `javascript:alert(1)#y` names a scheme a sprite cannot come from ' +
            "and was dropped. A sprite's address is a relative path or `http(s):`.",
        ]);
      } finally {
        warn.mockRestore();
      }
    });

    it('a paint value naming an address is dropped, a reference into the document is kept', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        @Component({
          imports: [PctSvgIcon],
          template: `<pct-svg-icon [data]="data" />`,
        })
        class Host {
          readonly data: PctSvgIconData = {
            viewBox: '0 0 1 1',
            attributes: {
              fill: 'url(https://evil.example/paint.svg#g)',
              stroke: 'url(#local-gradient)',
            },
            nodes: [
              ['path', { d: 'M0 0', fill: 'URL( //evil.example/p.svg#g )' }],
              [
                'rect',
                {
                  x: 0,
                  fill: 'url(data:image/svg+xml,x)',
                  stroke: 'currentColor',
                },
              ],
            ],
          };
        }
        const fixture = await mount(Host);
        const svg = svgOf(fixture);
        // A browser fetches a paint server from wherever `fill` points — measured in
        // chromium across origins — so an address in a value is as refused as `href`.
        expect(svg.hasAttribute('fill')).toBe(false);
        expect(svg.getAttribute('stroke')).toBe('url(#local-gradient)');
        expect(svg.querySelector('path')?.hasAttribute('fill')).toBe(false);
        expect(svg.querySelector('rect')?.hasAttribute('fill')).toBe(false);
        expect(svg.querySelector('rect')?.getAttribute('stroke')).toBe(
          'currentColor',
        );
        // Once per attribute name, and the message carries the value a consumer can find.
        const said = warn.mock.calls.map((c) => String(c[0]));
        expect(said).toHaveLength(1);
        expect(said[0]).toBe(
          '[pct-svg-icon] `fill` names an address (`url(https://evil.example/paint.svg#g)`) ' +
            'and was dropped. A paint value may reference the document itself — `url(#id)` ' +
            '— and nothing beyond it.',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('an address is read the way a URL parser reads it: blanks and controls around a scheme hide nothing', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        @Component({
          imports: [PctSvgIcon],
          template: `
            <pct-svg-icon [href]="' javascript:alert(1)#a'" />
            <pct-svg-icon [href]="'java\\tscript:alert(1)#b'" />
            <pct-svg-icon [href]="'java\\nscript:alert(1)#c'" />
            <pct-svg-icon [href]="'\\u0001data:text/html,x#d'" />
            <pct-svg-icon [href]="'  ./icons.svg#e\\t'" />
          `,
        })
        class Host {}
        const fixture = await mount(Host);
        // Four refused outright — the element is not written — and the one path kept, as
        // the parser would read it, with the blanks gone.
        expect(
          [...fixture.nativeElement.querySelectorAll('use')].map((u: Element) =>
            u.getAttribute('href'),
          ),
        ).toEqual(['./icons.svg#e']);
        expect(warn).toHaveBeenCalledTimes(4);
      } finally {
        warn.mockRestore();
      }
    });

    it('a scheme is any name with a digit, a plus, a dot or a dash in it, and only http(s) passes', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        @Component({
          imports: [PctSvgIcon],
          template: `
            <pct-svg-icon href="x-custom+1.0:thing#a" />
            <pct-svg-icon href="ms-word:open#b" />
            <pct-svg-icon href="ftp://host/icons.svg#c" />
            <pct-svg-icon href="icons.svg#d" />
          `,
        })
        class Host {}
        const fixture = await mount(Host);
        expect(
          [...fixture.nativeElement.querySelectorAll('use')].map((u: Element) =>
            u.getAttribute('href'),
          ),
        ).toEqual(['icons.svg#d']);
        expect(warn).toHaveBeenCalledTimes(3);
      } finally {
        warn.mockRestore();
      }
    });

    it('data that is not a drawing — from a manifest, past the types — draws nothing and throws nothing', async () => {
      @Component({
        imports: [PctSvgIcon],
        template: `
          <pct-svg-icon [data]="noNodes" />
          <pct-svg-icon [data]="nullNode" />
          <pct-svg-icon [data]="nullAttributes" />
        `,
      })
      class Host {
        readonly noNodes = { viewBox: '0 0 1 1' } as unknown as PctSvgIconData;
        readonly nullNode = {
          viewBox: '0 0 1 1',
          nodes: [null, ['path', null], 'path'],
        } as unknown as PctSvgIconData;
        readonly nullAttributes = {
          viewBox: '0 0 1 1',
          attributes: null,
          nodes: [],
        } as unknown as PctSvgIconData;
      }
      const fixture = await mount(Host);
      const svgs = [
        ...fixture.nativeElement.querySelectorAll('svg'),
      ] as SVGSVGElement[];
      expect(svgs).toHaveLength(3);
      for (const svg of svgs) expect(svg.children).toHaveLength(0);
      expect(svgs[0].getAttribute('viewBox')).toBe('0 0 1 1');
    });

    it('an absolute http(s) address and a relative one are kept as they are', async () => {
      @Component({
        imports: [PctSvgIcon],
        template: `
          <pct-svg-icon href="https://cdn.example/icons.svg#a" />
          <pct-svg-icon href="HTTP://cdn.example/icons.svg#b" />
          <pct-svg-icon href="./icons.svg#c" />
          <pct-svg-icon href="data:image/svg+xml,<svg/>#d" />
        `,
      })
      class Host {}
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await mount(Host);
        expect(
          [...fixture.nativeElement.querySelectorAll('use')].map((u: Element) =>
            u.getAttribute('href'),
          ),
        ).toEqual([
          'https://cdn.example/icons.svg#a',
          'HTTP://cdn.example/icons.svg#b',
          './icons.svg#c',
        ]);
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    });

    it('a renderer with neither a drawing nor an address is an empty <svg>', async () => {
      @Component({
        imports: [PctSvgIcon],
        template: `<pct-svg-icon />`,
      })
      class Host {}
      const fixture = await mount(Host);
      const svg = svgOf(fixture);
      expect(svg.children).toHaveLength(0);
      expect(svg.hasAttribute('viewBox')).toBe(false);
    });
  });
});
