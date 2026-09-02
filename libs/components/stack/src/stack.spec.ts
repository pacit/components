import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctSize } from '@pacit/components/core';
import { PctStack } from './stack';

/**
 * The stack's one moving part is the `gap` input reflected as `data-pct-gap` — the hook
 * the stylesheet's size selectors read. The distances themselves are CSS `gap`, measured
 * in the e2e suite (`layout.spec.ts`); what belongs here is the reflection, its default,
 * and that it follows its signal.
 */
@Component({
  imports: [PctStack],
  template: `
    <pct-stack [gap]="gap()">
      <section>One</section>
      <section>Two</section>
    </pct-stack>
  `,
})
class Host {
  readonly gap = signal<PctSize>('md');
}

@Component({
  imports: [PctStack],
  template: `<pct-stack><p>Alone</p></pct-stack>`,
})
class BareHost {}

async function render<T>(type: new () => T): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

const stack = () => document.querySelector('pct-stack') as HTMLElement;

describe('PctStack', () => {
  it('projects its blocks in order and wears the class', async () => {
    await render(Host);

    expect(
      [...stack().querySelectorAll('section')].map((s) => s.textContent),
    ).toEqual(['One', 'Two']);
    expect(stack().classList.contains('pct-stack')).toBe(true);
  });

  it('defaults to the middle step without asking the config for a control size', async () => {
    await render(BareHost);

    expect(stack().getAttribute('data-pct-gap')).toBe('md');
  });

  it('reflects the gap and follows its signal', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.gap.set('lg');
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(stack().getAttribute('data-pct-gap')).toBe('lg');

    fixture.componentInstance.gap.set('sm');
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(stack().getAttribute('data-pct-gap')).toBe('sm');
  });

  it('carries no ARIA at all — layout is presentational (0057)', async () => {
    await render(Host);

    expect(stack().hasAttribute('role')).toBe(false);
    expect(
      [...stack().attributes].some((a) => a.name.startsWith('aria-')),
    ).toBe(false);
  });
});
