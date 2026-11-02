import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctNav, PctNavItem, PctNavLink } from './nav';

/**
 * **Host** is a navigation of three screens whose current one is a signal, the way
 * `routerLinkActive` writes it; **LooseHost** and **WrappedHost** are the two shapes the
 * dev-mode warning exists for.
 */
@Component({
  imports: [PctNav, PctNavItem, PctNavLink],
  template: `
    <nav pctNav aria-label="Screens">
      @for (screen of screens; track screen) {
        <pct-nav-item>
          <a
            pctNavLink
            [href]="'#' + screen"
            [attr.aria-current]="current() === screen ? 'page' : null"
          >
            <span pctNavIcon aria-hidden="true">●</span>{{ screen }}
          </a>
        </pct-nav-item>
      }
    </nav>
  `,
})
class Host {
  readonly screens = ['rooms', 'devices', 'settings'];
  readonly current = signal('rooms');
}

@Component({
  imports: [PctNavItem, PctNavLink],
  template: `<pct-nav-item><a pctNavLink href="#a">A</a></pct-nav-item>`,
})
class LooseHost {}

@Component({
  imports: [PctNav, PctNavItem, PctNavLink],
  template: `
    <nav pctNav>
      <div>
        <pct-nav-item><a pctNavLink href="#a">A</a></pct-nav-item>
      </div>
    </nav>
  `,
})
class WrappedHost {}

@Component({
  imports: [PctNavLink],
  template: `<a pctNavLink href="#a">Bare</a>`,
})
class BareLink {}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

const root = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement as HTMLElement;

const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => vi.restoreAllMocks());

describe('PctNav', () => {
  it('leaves the landmark and its name to the consumer’s nav', async () => {
    const nav = root(await render(Host)).querySelector('nav')!;
    expect(nav.classList).toContain('pct-nav');
    expect(nav.getAttribute('role')).toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Screens');
  });

  it('writes the list inside the landmark, and an item of it around every link', async () => {
    const fixture = await render(Host);
    const list = root(fixture).querySelector('[data-pct-part="list"]')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.parentElement?.localName).toBe('nav');
    const items = [...list.children];
    expect(items.map((i) => i.localName)).toEqual([
      'pct-nav-item',
      'pct-nav-item',
      'pct-nav-item',
    ]);
    expect(items.map((i) => i.getAttribute('role'))).toEqual([
      'listitem',
      'listitem',
      'listitem',
    ]);
    expect(items[0].classList).toContain('pct-nav__item');
  });

  it('puts the icon and the name of a link into their regions', async () => {
    const link = root(await render(Host)).querySelector('a')!;
    expect(link.classList).toContain('pct-nav__link');
    expect(link.querySelector('[data-pct-part="icon"]')?.textContent).toBe('●');
    expect(
      link.querySelector('[data-pct-part="label"]')?.textContent?.trim(),
    ).toBe('rooms');
  });

  it('leaves a link with no icon an empty icon region', async () => {
    const link = root(await render(BareLink)).querySelector('a')!;
    expect(
      link.querySelector('[data-pct-part="icon"]')?.childNodes.length,
    ).toBe(0);
    expect(link.querySelector('[data-pct-part="label"]')?.textContent).toBe(
      'Bare',
    );
  });

  it('writes no aria-current of its own: the mark follows the attribute the consumer writes', async () => {
    const fixture = await render(Host);
    const current = () =>
      [...root(fixture).querySelectorAll('a')].map((a) =>
        a.getAttribute('aria-current'),
      );
    expect(current()).toEqual(['page', null, null]);
    fixture.componentInstance.current.set('settings');
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(current()).toEqual([null, null, 'page']);
  });
});

describe('PctNav — the shapes that warn', () => {
  it('a navigation in the list’s shape warns nothing', async () => {
    const warn = warnings();
    await render(Host);
    expect(warn).not.toHaveBeenCalled();
  });

  it('an item with no navigation around it warns once, in dev mode', async () => {
    const warn = warnings();
    await render(LooseHost);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-nav-item]');
    expect(warn.mock.calls[0][0]).toContain('<nav pctNav>');
  });

  it('an item wrapped away from the list warns the same warning', async () => {
    const warn = warnings();
    await render(WrappedHost);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-nav-item]');
  });

  it('a host standing in no element at all warns rather than throws', async () => {
    const warn = warnings();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(PctNavItem);
    (fixture.nativeElement as HTMLElement).remove();
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-nav-item]');
  });
});
