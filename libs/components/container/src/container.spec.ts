import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PctContainer } from './container';

/**
 * Two claims, both structural — the geometry itself (the cap, the centring, the container
 * context) is CSS the unit environment cannot measure, so it is proven in the e2e suite
 * (`apps/sandbox-e2e/src/layout.spec.ts`) with a ruler, not here with a selector.
 */
@Component({
  imports: [PctContainer],
  template: `<pct-container><p>Column</p></pct-container>`,
})
class Host {}

describe('PctContainer', () => {
  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    TestBed.createComponent(Host).detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('projects its content and wears only a class', async () => {
    await render();

    const host = document.querySelector('pct-container') as HTMLElement;
    expect(host.querySelector('p')?.textContent).toBe('Column');
    expect(host.classList.contains('pct-container')).toBe(true);
  });

  it('carries no ARIA at all — layout is presentational (0057)', async () => {
    await render();

    const host = document.querySelector('pct-container') as HTMLElement;
    expect(host.hasAttribute('role')).toBe(false);
    expect([...host.attributes].some((a) => a.name.startsWith('aria-'))).toBe(
      false,
    );
  });
});
