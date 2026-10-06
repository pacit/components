import {
  Component,
  EnvironmentInjector,
  input,
  OnDestroy,
  Provider,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { iconFont } from './fonts';
import {
  PCT_ICON_SOURCES,
  PCT_ICONS,
  PctIcon,
  PctIconTemplate,
  providePctIcons,
} from './icon';
import type { PctIconSource } from './source.types';

/**
 * The icon layer under its own name: what a component draws when nobody swapped it, what a
 * set replaces, where the replacement lands — and, since the sources, what a consumer's own
 * icon is and how one line dresses the library (`req-api-icons`).
 *
 * The cases run against the layer itself rather than through `pct-select` and `pct-checkbox`,
 * for `lesson-57`'s reason: those two measure it along one path each — one name, one state —
 * and a partial set, a set nobody reads and a template written outside a set have no place
 * in either.
 */
describe('@pacit/components/icon', () => {
  /** A consumer's set: two names of the three, so the third falls back. */
  @Component({
    selector: 'pct-probe-icons',
    imports: [PctIconTemplate],
    template: `
      <ng-template pctIcon="check"><i data-set="check">✓</i></ng-template>
      <ng-template pctIcon="chevron-down"
        ><i data-set="chevron">▾</i></ng-template
      >
    `,
  })
  class ProbeSet implements OnDestroy {
    static built = 0;
    static destroyed = 0;
    constructor() {
      ProbeSet.built += 1;
    }
    ngOnDestroy(): void {
      ProbeSet.destroyed += 1;
    }
  }

  @Component({
    imports: [PctIcon],
    template: `
      <pct-icon name="check"><svg data-built-in="check"></svg></pct-icon>
      <pct-icon name="indeterminate"><svg data-built-in="dash"></svg></pct-icon>
      <pct-icon><svg data-built-in="loose"></svg></pct-icon>
    `,
  })
  class Icons {}

  const render = async (providers: Provider[]) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture = TestBed.createComponent(Icons);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  /**
   * A component that provides a set, on a page that also draws an icon outside it. Both are
   * declared inside the call rather than beside it: a decorator runs as the class is declared,
   * and one declared while `describe` collects its cases calls `providePctIcons` where the
   * mutation run cannot tell which case it belongs to (`lesson-250`).
   */
  const scoped = async () => {
    @Component({
      selector: 'pct-probe-scope',
      imports: [PctIcon],
      template: `<pct-icon name="check"
        ><svg data-built-in="check"></svg
      ></pct-icon>`,
      providers: [providePctIcons(ProbeSet)],
    })
    class Scoped {}

    @Component({
      imports: [PctIcon, Scoped],
      template: `
        @if (shown()) {
          <pct-probe-scope />
        }
        <pct-icon name="check"><svg data-built-in="check"></svg></pct-icon>
      `,
    })
    class Page {
      readonly shown = signal(true);
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const drawn = (fixture: ComponentFixture<unknown>) =>
    [...fixture.nativeElement.querySelectorAll('pct-icon')].map(
      (icon: Element) => (icon.firstElementChild as HTMLElement).dataset,
    );

  /** Any template, rendered on its own with the providers given. */
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

  const icon = (fixture: ComponentFixture<unknown>, testid: string) =>
    fixture.nativeElement.querySelector(
      `[data-testid="${testid}"]`,
    ) as HTMLElement;

  beforeEach(() => {
    ProbeSet.built = 0;
    ProbeSet.destroyed = 0;
  });

  it('with no set the component draws its own icon', async () => {
    const fixture = await render([]);
    expect(drawn(fixture).map((d) => d['builtIn'])).toEqual([
      'check',
      'dash',
      'loose',
    ]);
  });

  it('a set replaces the names it carries and no others', async () => {
    const fixture = await render(providePctIcons(ProbeSet));
    // WHERE each drawing came from, not merely which drawing it is: the set and the
    // component draw the same NAME, so a comparison of names alone stays green with the
    // lookup taken out — which is what the negative control ran into.
    expect(
      drawn(fixture).map((d) =>
        d['set'] === undefined ? `built-in:${d['builtIn']}` : `set:${d['set']}`,
      ),
    ).toEqual(['set:check', 'built-in:dash', 'built-in:loose']);
  });

  it('the set is built once, however many icons read it', async () => {
    await render(providePctIcons(ProbeSet));
    expect(ProbeSet.built).toBe(1);
  });

  it('a set nobody reads is never built', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ...providePctIcons(ProbeSet),
      ],
    });
    TestBed.inject(EnvironmentInjector);
    expect(ProbeSet.built).toBe(0);
  });

  it("a set in a COMPONENT's providers reaches the icons under it and no others", async () => {
    const fixture = await scoped();
    const icons = [...fixture.nativeElement.querySelectorAll('pct-icon')];

    // The scoped case, and the reason the set is created in an injector of its own: the
    // registry sits in an ELEMENT injector here, so the slots inside the set component
    // cannot reach it by walking up from the application's environment injector.
    expect(icons[0].firstElementChild.dataset['set']).toBe('check');
    // The icon outside that component is untouched: a set scopes like any provider.
    expect(icons[1].firstElementChild.dataset['builtIn']).toBe('check');
  });

  it('the set dies with the injector it was provided in', async () => {
    const fixture = await scoped();
    expect(ProbeSet.built).toBe(1);
    expect(ProbeSet.destroyed).toBe(0);

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // A component created outside the document is attached to nothing, so nothing else
    // would ever take it down: what destroys it is this layer, or nobody.
    expect(ProbeSet.destroyed).toBe(1);
  });

  it('the replacement stands where the built-in stood', async () => {
    const fixture = await render(providePctIcons(ProbeSet));
    const icon = fixture.nativeElement.querySelector('pct-icon');
    // The consumer's element is the icon's own child: nothing of the library sits
    // between the part a stylesheet names and the drawing it sizes.
    expect(icon.firstElementChild.tagName).toBe('I');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('an icon template outside a set says so, under isDevMode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      @Component({
        imports: [PctIconTemplate],
        template: `<ng-template pctIcon="check">a</ng-template>`,
      })
      class Loose {}

      await mount(Loose);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toBe(
        '[pctIcon] The template for `check` stands in no icon set. An icon set is the ' +
          'component handed to `providePctIcons()`, and a template written anywhere ' +
          'else is rendered by nobody.',
      );
    } finally {
      warn.mockRestore();
    }
  });

  // ── sources ──────────────────────────────────────────────────────────────────

  /** A font that keys its glyphs on `x x-<id>`, reads a ligature and carries one axis. */
  const probeFont = (roles?: PctIconSource['roles']) =>
    iconFont({
      class: (id) => `x x-${id}`,
      text: (id) => id,
      style: { 'font-variation-settings': "'FILL' 1" },
      roles,
    });

  it('a font source answers an id with a glyph: the span wears the classes, the text and the style', async () => {
    @Component({
      imports: [PctIcon],
      template: `<pct-icon icon="bell" data-testid="bell" />`,
    })
    class Host {}
    const fixture = await mount(Host, providePctIcons(probeFont()));
    const span = icon(fixture, 'bell').firstElementChild as HTMLElement;

    expect(span.tagName).toBe('SPAN');
    // The box's own class stays beside the font's: the sheet sizes the glyph by it.
    expect([...span.classList].sort()).toEqual([
      'pct-icon__glyph',
      'x',
      'x-bell',
    ]);
    expect(span.textContent).toBe('bell');
    expect(span.style.getPropertyValue('font-variation-settings')).toBe(
      "'FILL' 1",
    );
    // Hidden on its own as well as through the host: a named icon would read the ligature.
    expect(span.getAttribute('aria-hidden')).toBe('true');
  });

  it('a glyph with no text and no style is a bare span', async () => {
    @Component({
      imports: [PctIcon],
      template: `<pct-icon icon="bell" data-testid="bell" />`,
    })
    class Host {}
    const fixture = await mount(
      Host,
      providePctIcons(iconFont({ class: (id) => `fa fa-${id}` })),
    );
    const span = icon(fixture, 'bell').firstElementChild as HTMLElement;
    expect(span.textContent).toBe('');
    expect(span.getAttribute('style')).toBeNull();
    expect([...span.classList].sort()).toEqual([
      'fa',
      'fa-bell',
      'pct-icon__glyph',
    ]);
  });

  it("a source that carries a role dresses the component's icon, and one it does not carry keeps the drawing", async () => {
    const fixture = await render(providePctIcons(probeFont({ check: 'tick' })));
    const [check, dash, loose] = [
      ...fixture.nativeElement.querySelectorAll('pct-icon'),
    ] as HTMLElement[];

    // The role's id in the SOURCE's vocabulary, not the role's own name.
    expect(check.firstElementChild?.className).toBe('pct-icon__glyph x x-tick');
    expect((dash.firstElementChild as HTMLElement).dataset['builtIn']).toBe(
      'dash',
    );
    expect((loose.firstElementChild as HTMLElement).dataset['builtIn']).toBe(
      'loose',
    );
  });

  it("a role set to undefined keeps the library's drawing while the rest take the source's", async () => {
    const fixture = await render(
      providePctIcons(probeFont({ check: undefined, indeterminate: 'dash' })),
    );
    const [check, dash] = [
      ...fixture.nativeElement.querySelectorAll('pct-icon'),
    ] as HTMLElement[];
    expect((check.firstElementChild as HTMLElement).dataset['builtIn']).toBe(
      'check',
    );
    expect(dash.firstElementChild?.className).toBe('pct-icon__glyph x x-dash');
  });

  it('the sources are asked in order, and null hands the id to the next', async () => {
    const few: PctIconSource = {
      resolve: (id) =>
        id === 'a' || id === 'tick'
          ? { kind: 'font', class: `few few-${id}` }
          : null,
      roles: { check: 'tick', indeterminate: 'dash' },
    };
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon icon="a" data-testid="a" />
        <pct-icon icon="b" data-testid="b" />
        <pct-icon name="check" data-testid="check"><svg></svg></pct-icon>
        <pct-icon name="indeterminate" data-testid="dash"><svg></svg></pct-icon>
      `,
    })
    class Host {}
    const fixture = await mount(
      Host,
      providePctIcons(
        few,
        probeFont({ check: 'check', indeterminate: 'minus' }),
      ),
    );
    const glyph = (testid: string) =>
      (icon(fixture, testid).firstElementChild as HTMLElement).className;

    // `a` the first source knows; `b` it answers `null` for, and the font takes it.
    expect(glyph('a')).toBe('pct-icon__glyph few few-a');
    expect(glyph('b')).toBe('pct-icon__glyph x x-b');
    // A role both carry goes to the first; a role the first carries but cannot DRAW
    // (`dash` is not among its ids) goes on to the second under THAT source's id.
    expect(glyph('check')).toBe('pct-icon__glyph few few-tick');
    expect(glyph('dash')).toBe('pct-icon__glyph x x-minus');
  });

  it('a set component and a source stand side by side, and the set answers by id too', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon name="check" data-testid="check"><svg></svg></pct-icon>
        <pct-icon name="indeterminate" data-testid="dash"><svg></svg></pct-icon>
        <pct-icon icon="chevron-down" data-testid="by-id" />
      `,
    })
    class Host {}
    const fixture = await mount(
      Host,
      providePctIcons(
        ProbeSet,
        probeFont({ check: 'x', indeterminate: 'dash' }),
      ),
    );
    // The set carries `check` and stands first, so its template wins over the font's role.
    expect(
      (icon(fixture, 'check').firstElementChild as HTMLElement).dataset['set'],
    ).toBe('check');
    // The set does not carry `indeterminate`, so the font's role is read.
    expect(icon(fixture, 'dash').firstElementChild?.className).toBe(
      'pct-icon__glyph x x-dash',
    );
    // A set's ids are its template names: `icon="chevron-down"` is the set's chevron.
    expect(
      (icon(fixture, 'by-id').firstElementChild as HTMLElement).dataset['set'],
    ).toBe('chevron');
    expect(ProbeSet.built).toBe(1);
  });

  it('a set component answers null for an id it has no template for, and the content stands', async () => {
    @Component({
      imports: [PctIcon],
      template: `<pct-icon icon="nobody-drew-this" data-testid="box"
        ><svg data-built-in="own"></svg
      ></pct-icon>`,
    })
    class Host {}
    const fixture = await mount(Host, providePctIcons(ProbeSet));
    expect(
      (icon(fixture, 'box').firstElementChild as HTMLElement).dataset[
        'builtIn'
      ],
    ).toBe('own');
  });

  it('a source with no roles map leaves every role alone, and answers ids as it can', async () => {
    const bare: PctIconSource = {
      resolve: (id) =>
        id === 'bare' ? { kind: 'font', class: 'bare bare-glyph' } : null,
    };
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon name="check" data-testid="role"
          ><svg data-built-in="check"></svg
        ></pct-icon>
        <pct-icon icon="bare" data-testid="id" />
      `,
    })
    class Host {}
    const fixture = await mount(Host, providePctIcons(bare));
    // `roles` is optional on purpose: a source written as `{ resolve }` is a whole source.
    expect(
      (icon(fixture, 'role').firstElementChild as HTMLElement).dataset[
        'builtIn'
      ],
    ).toBe('check');
    expect(icon(fixture, 'id').firstElementChild?.className).toBe(
      'pct-icon__glyph bare bare-glyph',
    );
  });

  it('a set provided under PCT_ICONS the way 0.1.0 wrote it still draws, and stands first', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon name="check" data-testid="check"><svg></svg></pct-icon>
        <pct-icon name="indeterminate" data-testid="dash"><svg></svg></pct-icon>
      `,
    })
    class Host {}
    // The token keeps its 0.1.0 shape — ONE component type — so a consumer who provided it
    // directly, or reads it, compiles and runs as before; the registry reads it ahead of
    // everything `providePctIcons` carries.
    const fixture = await mount(Host, [
      { provide: PCT_ICONS, useValue: ProbeSet },
      ...providePctIcons(probeFont({ check: 'x', indeterminate: 'dash' })),
    ]);
    expect(
      (icon(fixture, 'check').firstElementChild as HTMLElement).dataset['set'],
    ).toBe('check');
    expect(icon(fixture, 'dash').firstElementChild?.className).toBe(
      'pct-icon__glyph x x-dash',
    );
  });

  it('a component source creates the component in the box, with its inputs', async () => {
    @Component({
      selector: 'pct-probe-glyph',
      template: `{{ glyph() }}`,
    })
    class ProbeGlyph {
      readonly glyph = input.required<string>();
    }
    const source: PctIconSource = {
      resolve: (id) => ({
        kind: 'component',
        component: ProbeGlyph,
        inputs: { glyph: `drawn:${id}` },
      }),
    };
    @Component({
      imports: [PctIcon],
      template: `<pct-icon icon="star" data-testid="star" />`,
    })
    class Host {}
    const fixture = await mount(Host, providePctIcons(source));
    const box = icon(fixture, 'star');
    expect(box.firstElementChild?.tagName).toBe('PCT-PROBE-GLYPH');
    expect(box.textContent).toBe('drawn:star');
  });

  it('a component source with no inputs creates the component as it is', async () => {
    @Component({
      selector: 'pct-probe-mark',
      template: `mark`,
    })
    class ProbeMark {}
    const source: PctIconSource = {
      resolve: () => ({ kind: 'component', component: ProbeMark }),
    };
    @Component({
      imports: [PctIcon],
      template: `<pct-icon icon="any" data-testid="any" />`,
    })
    class Host {}
    const fixture = await mount(Host, providePctIcons(source));
    expect(icon(fixture, 'any').textContent).toBe('mark');
  });

  // ── the box ──────────────────────────────────────────────────────────────────

  it('tone and size are state attributes, and absent when null', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon data-testid="plain"><svg></svg></pct-icon>
        <pct-icon tone="danger" size="lg" data-testid="dressed"
          ><svg></svg
        ></pct-icon>
      `,
    })
    class Host {}
    const fixture = await mount(Host);
    expect(icon(fixture, 'plain').hasAttribute('data-pct-tone')).toBe(false);
    expect(icon(fixture, 'plain').hasAttribute('data-pct-size')).toBe(false);
    expect(icon(fixture, 'dressed').getAttribute('data-pct-tone')).toBe(
      'danger',
    );
    expect(icon(fixture, 'dressed').getAttribute('data-pct-size')).toBe('lg');
  });

  it('a label makes the icon an image under that name, and no label hides it', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon data-testid="quiet"><svg></svg></pct-icon>
        <pct-icon label="Unread messages" data-testid="named"
          ><svg></svg
        ></pct-icon>
      `,
    })
    class Host {}
    const fixture = await mount(Host);
    const quiet = icon(fixture, 'quiet');
    const named = icon(fixture, 'named');

    expect(quiet.getAttribute('aria-hidden')).toBe('true');
    expect(quiet.hasAttribute('role')).toBe(false);
    expect(quiet.hasAttribute('aria-label')).toBe(false);

    // Both halves move together: a name on a hidden element is read by nobody, and an
    // image with no name is a picture of nothing to a reader.
    expect(named.hasAttribute('aria-hidden')).toBe(false);
    expect(named.getAttribute('role')).toBe('img');
    expect(named.getAttribute('aria-label')).toBe('Unread messages');
  });

  it('an empty or blank label is no label: the icon stays hidden, with no empty name', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon label="" data-testid="empty"><svg></svg></pct-icon>
        <pct-icon label="   " data-testid="blank"><svg></svg></pct-icon>
      `,
    })
    class Host {}
    const fixture = await mount(Host);
    for (const id of ['empty', 'blank']) {
      expect(icon(fixture, id).getAttribute('aria-hidden'), id).toBe('true');
      expect(icon(fixture, id).hasAttribute('role'), id).toBe(false);
      expect(icon(fixture, id).hasAttribute('aria-label'), id).toBe(false);
    }
  });

  // ── what is said in dev mode ─────────────────────────────────────────────────

  const warned = async <T>(type: new () => T, providers: Provider[] = []) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await mount(type, providers);
      return warn.mock.calls.map((call) => String(call[0]));
    } finally {
      warn.mockRestore();
    }
  };

  it('an icon asked for by name AND by id says so: the id is read and the role is not', async () => {
    @Component({
      imports: [PctIcon],
      template: `<pct-icon name="check" icon="both-bell"
        ><svg></svg
      ></pct-icon>`,
    })
    class Host {}
    const said = await warned(Host, providePctIcons(probeFont()));
    // What is DRAWN, not only what is said: the id's glyph, and not the role's content.
    const fixture = await mount(Host, providePctIcons(probeFont()));
    expect(
      fixture.nativeElement.querySelector('pct-icon')?.firstElementChild
        ?.className,
    ).toBe('pct-icon__glyph x x-both-bell');
    expect(said).toEqual([
      '[pct-icon] `both-bell` is asked for by `icon` and `check` by `name` on one ' +
        'element. The id is read and the role is not: `name` is for a component of the ' +
        'library, `icon` for an icon of yours.',
    ]);
  });

  it('an id no source answers over an empty box says so, once per id', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon icon="silent-one" />
        <pct-icon icon="silent-one" />
        <pct-icon icon="silent-two" />
      `,
    })
    class Host {}
    const said = await warned(Host);
    expect(said).toEqual([
      '[pct-icon] No source answers for `silent-one`, and the box holds no drawing of its ' +
        'own — it renders as nothing. Register a source with `providePctIcons()`, or ' +
        'write the drawing as content.',
      '[pct-icon] No source answers for `silent-two`, and the box holds no drawing of its ' +
        'own — it renders as nothing. Register a source with `providePctIcons()`, or ' +
        'write the drawing as content.',
    ]);
  });

  it('whitespace is no drawing: an id no source answers over a box of blanks says so', async () => {
    @Component({
      imports: [PctIcon],
      // A non-breaking space, because the compiler strips plain whitespace out of a
      // template before the box ever sees it; `trim()` strips this one as well.
      template: `<pct-icon icon="blank-space">&nbsp;</pct-icon>`,
    })
    class Host {}
    const said = await warned(Host);
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('No source answers for `blank-space`');
  });

  it('an id no source answers is quiet over a box that holds a drawing or a glyph of text', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon icon="quiet-drawn"><svg></svg></pct-icon>
        <pct-icon icon="quiet-text">▾</pct-icon>
      `,
    })
    class Host {}
    expect(await warned(Host)).toEqual([]);
  });

  it('an id a source answers is quiet, and so is a box with no id at all', async () => {
    @Component({
      imports: [PctIcon],
      template: `
        <pct-icon icon="answered" />
        <pct-icon name="check" />
        <pct-icon />
      `,
    })
    class Host {}
    expect(await warned(Host, providePctIcons(probeFont()))).toEqual([]);
  });

  describe('tokens name themselves in the missing-provider message', () => {
    it.each([
      ['PCT_ICONS', PCT_ICONS],
      ['PCT_ICON_SOURCES', PCT_ICON_SOURCES],
    ])('%s', (name, token) => {
      // The same reason as the tokens of `core`: the description is the only name a DI
      // error has for the token, so without it a message cannot say WHICH one.
      expect(String(token)).toContain(name);
    });
  });
});
