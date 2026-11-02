import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PctCard,
  PctCardControl,
  PctCardLink,
  PctCardSubtitle,
  PctCardTitle,
} from './card';

/**
 * **Host** fills every region and drives the three states through signals, the body holding
 * a button whose instance is the witness that a state coming and going rebuilds nothing.
 * **BareHost** writes a body alone: the regions with nothing in them are its subject.
 * **LinkHost** is the card that is one link, with a control in its body.
 */
@Component({
  imports: [PctCard, PctCardTitle, PctCardSubtitle],
  template: `
    <pct-card [loading]="loading()" [error]="error()" [muted]="muted()">
      <span pctCardIcon data-testid="icon">♨</span>
      <h3 pctCardTitle>Heat pump</h3>
      <p pctCardSubtitle>Utility room</p>
      <button pctCardActions type="button">Menu</button>
      <button type="button" data-testid="inside">Inside</button>
      <span pctCardFooter>Updated a moment ago</span>
      <button pctCardFooterActions type="button">Open</button>
    </pct-card>
  `,
})
class Host {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly muted = signal(false);
}

@Component({
  imports: [PctCard],
  template: `<pct-card><p>Only a body</p></pct-card>`,
})
class BareHost {}

@Component({
  imports: [PctCard, PctCardTitle, PctCardLink, PctCardControl],
  template: `
    <pct-card>
      <h3 pctCardTitle><a pctCardLink href="#details">Heat pump</a></h3>
      <label pctCardControl><input type="checkbox" /> Enabled</label>
    </pct-card>
  `,
})
class LinkHost {}

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

const card = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector(
    'pct-card',
  ) as HTMLElement;
const part = (fixture: ComponentFixture<unknown>, name: string) =>
  card(fixture).querySelector<HTMLElement>(`[data-pct-part="${name}"]`);

describe('PctCard', () => {
  it('projects each slot into its region', async () => {
    const fixture = await render(Host);
    expect(part(fixture, 'icon')?.textContent).toBe('♨');
    const heading = part(fixture, 'heading')!;
    expect(heading.querySelector('h3')?.textContent).toBe('Heat pump');
    expect(heading.querySelector('p')?.textContent).toBe('Utility room');
    expect(part(fixture, 'actions')?.textContent).toBe('Menu');
    expect(part(fixture, 'body')?.textContent).toBe('Inside');
    expect(part(fixture, 'note')?.textContent).toBe('Updated a moment ago');
    expect(part(fixture, 'footer-actions')?.textContent).toBe('Open');
  });

  it('writes no role and no state while the body is the body', async () => {
    const fixture = await render(Host);
    const host = card(fixture);
    expect(host.classList).toContain('pct-card');
    expect(host.getAttribute('role')).toBeNull();
    expect(host.getAttribute('aria-busy')).toBeNull();
    expect(host.hasAttribute('data-pct-state')).toBe(false);
    expect(host.hasAttribute('data-pct-muted')).toBe(false);
    expect(host.hasAttribute('data-pct-link')).toBe(false);
  });

  it('leaves the regions nothing was projected into empty', async () => {
    const fixture = await render(BareHost);
    for (const name of [
      'icon',
      'heading',
      'actions',
      'note',
      'footer-actions',
    ]) {
      expect(part(fixture, name)?.childElementCount).toBe(0);
    }
    expect(part(fixture, 'body')?.textContent).toBe('Only a body');
  });

  it('reads every state off by default, none of them set', async () => {
    const host = card(await render(BareHost));
    expect(host.hasAttribute('data-pct-muted')).toBe(false);
    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(host.hasAttribute('data-pct-state')).toBe(false);
  });

  it('draws the skeleton in place of the body while loading, and marks the card busy', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    const host = card(fixture);
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.getAttribute('data-pct-state')).toBe('loading');
    expect(part(fixture, 'body')?.querySelector('pct-skeleton')).not.toBeNull();
    expect(host.querySelector('[data-testid="inside"]')).toBeNull();
    // The header and the footer stay.
    expect(part(fixture, 'heading')?.textContent).toContain('Heat pump');
    expect(part(fixture, 'note')?.textContent).toBe('Updated a moment ago');
  });

  it('draws the message in place of the body, with the danger icon', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.error.set('The device does not answer.');
    await settle(fixture);
    const host = card(fixture);
    expect(host.getAttribute('data-pct-state')).toBe('error');
    expect(host.getAttribute('aria-busy')).toBeNull();
    expect(part(fixture, 'body')).toBeNull();
    const error = part(fixture, 'message')!;
    expect(error.textContent?.trim()).toBe('The device does not answer.');
    expect(error.querySelector('pct-icon')?.getAttribute('name')).toBe(
      'danger',
    );
  });

  it('takes an empty message for none', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.error.set('');
    await settle(fixture);
    expect(card(fixture).hasAttribute('data-pct-state')).toBe(false);
    expect(part(fixture, 'message')).toBeNull();
    expect(part(fixture, 'body')?.textContent).toBe('Inside');
  });

  it('shows the skeleton while both are set: the answer is not in yet', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.error.set('Lost');
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    expect(card(fixture).getAttribute('data-pct-state')).toBe('loading');
    expect(part(fixture, 'message')).toBeNull();
  });

  it('gives the same body back when a state goes, not a new one', async () => {
    const fixture = await render(Host);
    const before = card(fixture).querySelector('[data-testid="inside"]');
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    fixture.componentInstance.loading.set(false);
    await settle(fixture);
    expect(card(fixture).querySelector('[data-testid="inside"]')).toBe(before);
  });

  it('marks a muted card and leaves its controls enabled', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.muted.set(true);
    await settle(fixture);
    const host = card(fixture);
    expect(host.getAttribute('data-pct-muted')).toBe('');
    expect(host.hasAttribute('inert')).toBe(false);
    expect(
      host.querySelector<HTMLButtonElement>('[data-testid="inside"]')?.disabled,
    ).toBe(false);
  });

  it('marks a card whose title holds a link, and dresses the link and the control', async () => {
    const fixture = await render(LinkHost);
    const host = card(fixture);
    expect(host.getAttribute('data-pct-link')).toBe('');
    expect(host.querySelector('a')?.classList).toContain('pct-card-link');
    expect(host.querySelector('label')?.classList).toContain(
      'pct-card-control',
    );
    expect(host.querySelector('h3')?.classList).toContain('pct-card-title');
  });

  it('dresses the subtitle', async () => {
    const fixture = await render(Host);
    expect(card(fixture).querySelector('p')?.classList).toContain(
      'pct-card-subtitle',
    );
  });
});
