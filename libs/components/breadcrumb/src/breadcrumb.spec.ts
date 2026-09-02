import {
  ApplicationRef,
  Component,
  Provider,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
import { PctBreadcrumb, PctCrumb, PctCrumbLink } from './breadcrumb';

/**
 * Five arrangements. **Host** is the pattern as 0054 drew it — three steps, the last one a
 * link the consumer marked current. **TextHost** spells the current step the other legal
 * way: bare text, no anchor, no `aria-current` anywhere — the arrangement that proves the
 * component writes none of its own. The last three are the shapes the dev-mode warnings
 * exist for: a crumb with no trail, a crumb wrapped away from the list, a link with no
 * crumb.
 */
@Component({
  imports: [PctBreadcrumb, PctCrumb, PctCrumbLink],
  template: `
    <pct-breadcrumb [ariaLabel]="label()">
      <pct-crumb><a pctCrumbLink href="/">Home</a></pct-crumb>
      <pct-crumb><a pctCrumbLink href="/library">Library</a></pct-crumb>
      <pct-crumb>
        <a pctCrumbLink href="/library/data" aria-current="page">Data</a>
      </pct-crumb>
    </pct-breadcrumb>
  `,
})
class Host {
  readonly label = signal('');
}

@Component({
  imports: [PctBreadcrumb, PctCrumb, PctCrumbLink],
  template: `
    <pct-breadcrumb>
      <pct-crumb><a pctCrumbLink href="/">Home</a></pct-crumb>
      <pct-crumb>Data</pct-crumb>
    </pct-breadcrumb>
  `,
})
class TextHost {}

@Component({
  imports: [PctCrumb, PctCrumbLink],
  template: `<pct-crumb><a pctCrumbLink href="/">Solo</a></pct-crumb>`,
})
class LooseCrumbHost {}

@Component({
  imports: [PctBreadcrumb, PctCrumb, PctCrumbLink],
  template: `
    <pct-breadcrumb>
      <div>
        <pct-crumb><a pctCrumbLink href="/">Boxed</a></pct-crumb>
      </div>
    </pct-breadcrumb>
  `,
})
class WrappedCrumbHost {}

@Component({
  imports: [PctCrumbLink],
  template: `<a pctCrumbLink href="/">Free</a>`,
})
class LooseLinkHost {}

async function render<T>(
  type: Type<T>,
  providers: Provider[] = [],
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const breadcrumb = () =>
  document.querySelector('pct-breadcrumb') as HTMLElement;
const crumbs = () => document.querySelectorAll('pct-crumb');

/** A spy that keeps the dev-mode sentence out of the run's output and readable in a case. */
const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctBreadcrumb — the landmark and the list', () => {
  it('is a navigation landmark named by the library text', async () => {
    await render(Host);

    expect(breadcrumb().getAttribute('role')).toBe('navigation');
    expect(breadcrumb().getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('the ariaLabel input overrides the default and follows its signal', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.label.set('Where you are');
    await settle(fixture);
    expect(breadcrumb().getAttribute('aria-label')).toBe('Where you are');
    fixture.componentInstance.label.set('');
    await settle(fixture);
    expect(breadcrumb().getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('the landmark name is a text, swapped by providePctTexts', async () => {
    await render(Host, [providePctTexts({ breadcrumbLabel: 'You are here' })]);

    expect(breadcrumb().getAttribute('aria-label')).toBe('You are here');
  });

  it('holds one list, and every crumb is a listitem directly in it', async () => {
    await render(Host);

    const list = breadcrumb().querySelector('[data-pct-part="list"]');
    expect(list?.getAttribute('role')).toBe('list');
    expect(crumbs()).toHaveLength(3);
    for (const crumb of crumbs()) {
      expect(crumb.getAttribute('role')).toBe('listitem');
      expect(crumb.parentElement).toBe(list);
    }
  });
});

describe('PctBreadcrumb — the separator', () => {
  it('is drawn in every crumb, outside every anchor, and silent', async () => {
    await render(Host);

    const separators = document.querySelectorAll('[data-pct-part="separator"]');
    expect(separators).toHaveLength(3);
    for (const separator of separators) {
      expect(separator.getAttribute('aria-hidden')).toBe('true');
      expect(separator.closest('a')).toBeNull();
    }
  });
});

describe('PctBreadcrumb — the current step is not ours to write', () => {
  it('writes no aria-current of its own', async () => {
    await render(TextHost);

    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('leaves the consumer’s aria-current standing where they put it', async () => {
    await render(Host);

    const current = document.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent?.trim()).toBe('Data');
    expect(current[0].classList.contains('pct-breadcrumb__link')).toBe(true);
  });

  it('dresses every anchor that asked, and only those', async () => {
    await render(TextHost);

    const dressed = document.querySelectorAll('.pct-breadcrumb__link');
    expect(dressed).toHaveLength(1);
    expect(dressed[0].textContent?.trim()).toBe('Home');
  });
});

describe('PctBreadcrumb — the shapes that warn', () => {
  it('a crumb with no trail around it warns once, in dev mode', async () => {
    const warn = warnings();
    await render(LooseCrumbHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-crumb]');
    expect(warn.mock.calls[0][0]).toContain('pct-breadcrumb');
  });

  it('a crumb wrapped away from the list warns the same warning', async () => {
    const warn = warnings();
    await render(WrappedCrumbHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-crumb]');
  });

  it('a link with no crumb around it warns and names the fix', async () => {
    const warn = warnings();
    await render(LooseLinkHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('pct-crumb');
  });

  it('the pattern as drawn warns nothing', async () => {
    const warn = warnings();
    await render(Host);

    expect(warn).not.toHaveBeenCalled();
  });
});
