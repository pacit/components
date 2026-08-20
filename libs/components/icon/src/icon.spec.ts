import {
  Component,
  EnvironmentInjector,
  OnDestroy,
  Provider,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctIcon, PctIconTemplate, providePctIcons } from './icon';

/**
 * The icon layer under its own name: what a component draws when nobody swapped it, what a
 * set replaces, and where the replacement lands (`req-api-icons`).
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

  /** A component that provides a set, on a page that also draws an icon outside it. */
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

  const scoped = async () => {
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

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Loose);
      fixture.detectChanges();
      await fixture.whenStable();
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
});
