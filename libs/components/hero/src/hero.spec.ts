import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctHero } from './hero';
import { PctHeroFace, PctHeroShow } from './hero.types';

/**
 * What a unit case can hold of a treatment that is entirely paint: the state attributes the
 * stylesheet keys on, the content that must survive the component's own template, and the
 * one reading of the input that is not the union — `null`, which has to leave the element as
 * it was found. What the paint LOOKS like is measured in a browser
 * (`apps/sandbox-e2e/src/hero.spec.ts`), because a stylesheet is not a thing jsdom paints.
 */
@Component({
  imports: [PctHero],
  template: `<h3 [pctHero]="face()" [show]="show()" [paused]="paused()">
    Tabs
  </h3>`,
})
class Host {
  readonly face = signal<PctHeroFace | null>('text');
  readonly show = signal<PctHeroShow>('always');
  readonly paused = signal(false);
}

const heading = () => document.querySelector('h3') as HTMLElement;

async function render<T>(type: new () => T): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

describe('PctHero — the brand gradient as equipment', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('dresses the consumer element and keeps its content', async () => {
    await render(Host);
    expect(heading().tagName).toBe('H3');
    expect(heading().textContent?.trim()).toBe('Tabs');
    expect(heading().classList.contains('pct-hero')).toBe(true);
  });

  it('reflects the face and the trigger as state attributes', async () => {
    const fixture = await render(Host);
    expect(heading().getAttribute('data-pct-hero')).toBe('text');
    expect(heading().getAttribute('data-pct-show')).toBe('always');

    fixture.componentInstance.face.set('edge');
    fixture.componentInstance.show.set('interact');
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(heading().getAttribute('data-pct-hero')).toBe('edge');
    expect(heading().getAttribute('data-pct-show')).toBe('interact');
  });

  it('every face of the union reflects — the stylesheet hooks have a real value to match', async () => {
    const fixture = await render(Host);
    for (const face of ['edge', 'text', 'fill'] as const) {
      fixture.componentInstance.face.set(face);
      fixture.detectChanges();
      await TestBed.inject(ApplicationRef).whenStable();
      expect(heading().getAttribute('data-pct-hero')).toBe(face);
    }
  });

  it('no face is no attribute at all, and the trigger goes with it', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.show.set('interact');
    fixture.componentInstance.face.set(null);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();

    // A condition needs no API of its own: `[pctHero]="featured() ? 'edge' : null"` is the
    // whole mechanism, so `null` has to leave the element as it found it — including the
    // trigger, which without a face names nothing (0065).
    expect(heading().hasAttribute('data-pct-hero')).toBe(false);
    expect(heading().hasAttribute('data-pct-show')).toBe(false);
  });
  it('the page\u2019s own stop is a state attribute, and it is written only when asked', async () => {
    // What the attribute reaches is one declaration in the stylesheet
    // (`animation-play-state`), so the case that matters is in a browser
    // (`apps/sandbox-e2e/src/hero.spec.ts`). Here: the flag is a flag, and an unpressed stop
    // writes nothing at all — the element of a consumer who never asked is left as it was.
    const fixture = await render(Host);
    expect(heading().hasAttribute('data-pct-paused')).toBe(false);

    fixture.componentInstance.paused.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(heading().getAttribute('data-pct-paused')).toBe('');

    fixture.componentInstance.paused.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(heading().hasAttribute('data-pct-paused')).toBe(false);
  });
});
