import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctTopbar, PctTopbarTitle } from './topbar';

/**
 * **Host** fills the three slots; **TitleOnly** writes a title alone, and the regions with
 * nothing in them are its subject.
 */
@Component({
  imports: [PctTopbar, PctTopbarTitle],
  template: `
    <header pctTopbar>
      <button pctTopbarStart type="button">Menu</button>
      <h1 pctTopbarTitle>Living room</h1>
      <span pctTopbarEnd>Ada</span>
      <button pctTopbarEnd type="button">Sign out</button>
    </header>
  `,
})
class Host {}

@Component({
  imports: [PctTopbar, PctTopbarTitle],
  template: `<header pctTopbar><h1 pctTopbarTitle>Rooms</h1></header>`,
})
class TitleOnly {}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

const bar = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector('header') as HTMLElement;
const part = (fixture: ComponentFixture<unknown>, name: string) =>
  bar(fixture).querySelector<HTMLElement>(`[data-pct-part="${name}"]`);

describe('PctTopbar', () => {
  it('projects each slot into its region, in the reading order', async () => {
    const fixture = await render(Host);
    expect(part(fixture, 'start')?.textContent).toBe('Menu');
    expect(part(fixture, 'heading')?.querySelector('h1')?.textContent).toBe(
      'Living room',
    );
    expect(part(fixture, 'end')?.textContent).toBe('AdaSign out');
    const order = [...bar(fixture).children].map((el) =>
      el.getAttribute('data-pct-part'),
    );
    expect(order).toEqual(['start', 'heading', 'end']);
  });

  it('writes no role: the banner is the platform’s, on the consumer’s header', async () => {
    const host = bar(await render(Host));
    expect(host.localName).toBe('header');
    expect(host.classList).toContain('pct-topbar');
    expect(host.getAttribute('role')).toBeNull();
    expect(
      [...host.attributes].filter((a) => a.name.startsWith('aria-')),
    ).toEqual([]);
  });

  it('leaves the start and the end empty when nothing was projected into them', async () => {
    const fixture = await render(TitleOnly);
    expect(part(fixture, 'start')?.childNodes.length).toBe(0);
    expect(part(fixture, 'end')?.childNodes.length).toBe(0);
    expect(part(fixture, 'heading')?.textContent).toBe('Rooms');
  });

  it('dresses the title and leaves it the consumer’s heading', async () => {
    const fixture = await render(Host);
    const h1 = bar(fixture).querySelector('h1')!;
    expect(h1.classList).toContain('pct-topbar-title');
    expect(h1.getAttribute('role')).toBeNull();
  });
});
