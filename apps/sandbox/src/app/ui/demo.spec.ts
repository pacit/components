import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SbxDemo } from './demo';
import { SbxSettings } from './settings';

@Component({
  imports: [SbxDemo],
  template: `
    <sbx-demo heading="Default" data-testid="follows">
      <span class="content">content</span>
    </sbx-demo>
    <sbx-demo heading="Fixed" scheme="dark" [controls]="[]" data-testid="fixed">
      <span class="content">content</span>
    </sbx-demo>
  `,
})
class Host {}

describe('SbxDemo (the demo card)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const stage = (testid: string) =>
      el.querySelector(`[data-testid="${testid}"] [data-testid="demo-stage"]`);
    return { fixture, el, stage };
  }

  it('projects the content onto the stage', async () => {
    const { stage } = await render();
    expect(stage('follows')?.querySelector('.content')).toBeTruthy();
  });

  /** The theme is in force on the stage, not on the whole card — the bar is page chrome. */
  it('follows the global setting until it has one of its own', async () => {
    const { fixture, stage } = await render();
    expect(stage('follows')?.getAttribute('data-theme')).toBe('light');

    TestBed.inject(SbxSettings).scheme.set('dark');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(stage('follows')?.getAttribute('data-theme')).toBe('dark');
  });

  it('a theme set on the card wins over the global one', async () => {
    const { fixture, stage } = await render();
    TestBed.inject(SbxSettings).scheme.set('light');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(stage('fixed')?.getAttribute('data-theme')).toBe('dark');
  });

  it('an empty list of switches hides the bar', async () => {
    const { el } = await render();
    const fixed = el.querySelector('[data-testid="fixed"]');
    expect(fixed?.querySelector('sbx-controls')).toBeNull();
    expect(
      el.querySelector('[data-testid="follows"] sbx-controls'),
    ).toBeTruthy();
  });
});
