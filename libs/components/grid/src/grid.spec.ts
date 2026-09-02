import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PctGrid } from './grid';

/**
 * The grid has no inputs and no state — its whole behaviour is one CSS declaration whose
 * column arithmetic only a layout engine can perform, so the column counts at three widths
 * live in the e2e suite (`layout.spec.ts`). What a unit proves is the contract's frame:
 * projection, the class hook, and the absence of any ARIA.
 */
@Component({
  imports: [PctGrid],
  template: `
    <pct-grid>
      <article>A</article>
      <article>B</article>
      <article>C</article>
    </pct-grid>
  `,
})
class Host {}

describe('PctGrid', () => {
  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    TestBed.createComponent(Host).detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('projects its cards and wears only a class', async () => {
    await render();

    const host = document.querySelector('pct-grid') as HTMLElement;
    expect(host.querySelectorAll('article')).toHaveLength(3);
    expect(host.classList.contains('pct-grid')).toBe(true);
  });

  it('carries no ARIA at all — layout is presentational (0057)', async () => {
    await render();

    const host = document.querySelector('pct-grid') as HTMLElement;
    expect(host.hasAttribute('role')).toBe(false);
    expect([...host.attributes].some((a) => a.name.startsWith('aria-'))).toBe(
      false,
    );
  });
});
