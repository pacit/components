import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctSize } from '@pacit/components/core';
import { PctAvatar } from './avatar';

/**
 * Three arrangements. **Host** binds everything through signals — the chain (image →
 * initials → silhouette) can only be watched moving, and it moves on input changes and on
 * the platform's `error`. **BareHost** binds nothing: the defaults — silhouette, `md`,
 * hidden — are observable nowhere else. **WrittenHost** passes `name` as an attribute,
 * which is the string path a template without bindings takes.
 */
@Component({
  imports: [PctAvatar],
  template: `<pct-avatar [name]="name()" [src]="src()" [size]="size()" />`,
})
class Host {
  readonly name = signal('Ada Lovelace');
  readonly src = signal('');
  readonly size = signal<PctSize>('sm');
}

@Component({
  imports: [PctAvatar],
  template: `<pct-avatar />`,
})
class BareHost {}

@Component({
  imports: [PctAvatar],
  template: `<pct-avatar name="Grace Hopper" />`,
})
class WrittenHost {}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
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

const avatar = () => document.querySelector('pct-avatar') as HTMLElement;
const part = (name: string) =>
  avatar().querySelector<HTMLElement>(`[data-pct-part="${name}"]`);
const standing = () => [
  ...avatar().querySelectorAll<HTMLElement>('[data-pct-part]'),
];

/** Break the image the way the platform reports it: the error event on the element. */
async function breakImage(fixture: ComponentFixture<unknown>): Promise<void> {
  part('image')?.dispatchEvent(new Event('error'));
  await settle(fixture);
}

describe('PctAvatar — what it is', () => {
  it('is hidden decoration, whole', async () => {
    await render(Host);

    expect(avatar().getAttribute('aria-hidden')).toBe('true');
  });

  it('stands at the configured default size with nothing bound', async () => {
    await render(BareHost);

    expect(avatar().getAttribute('data-pct-size')).toBe('md');
  });

  it('carries the bound size on the host', async () => {
    const fixture = await render(Host);

    expect(avatar().getAttribute('data-pct-size')).toBe('sm');
    fixture.componentInstance.size.set('lg');
    await settle(fixture);
    expect(avatar().getAttribute('data-pct-size')).toBe('lg');
  });

  it('shows exactly one link of the chain at a time', async () => {
    const fixture = await render(Host);
    expect(standing()).toHaveLength(1);

    fixture.componentInstance.src.set('/photo.png');
    await settle(fixture);
    expect(standing()).toHaveLength(1);

    fixture.componentInstance.name.set('');
    fixture.componentInstance.src.set('');
    await settle(fixture);
    expect(standing()).toHaveLength(1);
  });
});

describe('PctAvatar — the chain', () => {
  it('draws the picture while src is given, decoratively', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.src.set('/photo.png');
    await settle(fixture);

    const image = part('image');
    expect(image?.tagName).toBe('IMG');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('src')).toBe('/photo.png');
  });

  it('never binds an empty src — an empty string is a request, not an absence', async () => {
    await render(Host);

    // Measured (0052): `src=""` FIRES `error` in all three engines, because it resolves to
    // the page's own URL. The chain therefore skips the image element entirely rather than
    // mounting one that is born broken.
    expect(part('image')).toBeNull();
    expect(part('initials')).not.toBeNull();
  });

  it('falls to the initials the moment the platform says the picture failed', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.src.set('/dead.png');
    await settle(fixture);
    expect(part('image')).not.toBeNull();

    await breakImage(fixture);

    expect(part('image')).toBeNull();
    expect(part('initials')?.textContent).toBe('AL');
  });

  it('re-arms on a new src instead of remembering the failure', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.src.set('/dead.png');
    await settle(fixture);
    await breakImage(fixture);
    expect(part('image')).toBeNull();

    fixture.componentInstance.src.set('/alive.png');
    await settle(fixture);

    expect(part('image')?.getAttribute('src')).toBe('/alive.png');
  });

  it('falls past the initials to the silhouette when there is no name either', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.name.set('');
    fixture.componentInstance.src.set('/dead.png');
    await settle(fixture);

    await breakImage(fixture);

    expect(part('silhouette')?.tagName).toBe('PCT-ICON');
    expect(part('initials')).toBeNull();
  });

  it('is the silhouette with nothing bound at all', async () => {
    await render(BareHost);

    expect(part('silhouette')).not.toBeNull();
  });
});

describe('PctAvatar — the initials', () => {
  // The five scripts of the probe (0052), as fixtures: every one of these is a value
  // `charAt` would cut into a broken half or a bare consonant.
  const CASES: readonly [string, string][] = [
    ['Ada Lovelace', 'AL'],
    ['Øyvind', 'Ø'],
    ['👩‍👩‍👧 Team', '👩‍👩‍👧T'],
    ['आर्या शर्मा', 'आश'],
    ['李小龙', '李'],
    ['🇳🇴 Norge', '🇳🇴N'],
    ['Mary Jane Watson', 'MW'],
  ];

  for (const [name, expected] of CASES)
    it(`draws ${expected} for ${name}`, async () => {
      const fixture = await render(Host);
      fixture.componentInstance.name.set(name);
      await settle(fixture);

      expect(part('initials')?.textContent).toBe(expected);
    });

  it('draws what was written, uncased — a transform would need a locale nobody knows', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.name.set('ada lovelace');
    await settle(fixture);

    expect(part('initials')?.textContent).toBe('al');
  });

  it('keeps both initials of a name padded with whitespace', async () => {
    // The case that tells "words are the non-empty pieces" apart from "split and hope":
    // without the filter the leading space is a first word of its own, and the initials
    // read as the last name's letter alone.
    const fixture = await render(Host);
    fixture.componentInstance.name.set('  Ada   Lovelace  ');
    await settle(fixture);

    expect(part('initials')?.textContent).toBe('AL');
  });

  it('treats whitespace as no name', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.name.set('   ');
    await settle(fixture);

    expect(part('silhouette')).not.toBeNull();
  });

  it('reads a name written as an attribute', async () => {
    await render(WrittenHost);

    expect(part('initials')?.textContent).toBe('GH');
  });
});
