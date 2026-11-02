import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDescription, PctDescriptionList } from './description';

/**
 * **Host** is a list of two pairs, the second with a control labelled by its term; **LooseHost**
 * is a pair with no `<dl>` above it, the shape the dev-mode warning exists for.
 */
@Component({
  imports: [PctDescriptionList, PctDescription],
  template: `
    <dl pctDescriptionList>
      <div pctDescription>
        <span pctDescriptionTerm>Supply</span>
        21.4 °C
      </div>
      <div pctDescription #heating="pctDescription">
        <span pctDescriptionTerm>Heating</span>
        On
        <input
          pctDescriptionControl
          type="checkbox"
          [attr.aria-labelledby]="heating.termId"
        />
      </div>
    </dl>
  `,
})
class Host {}

@Component({
  imports: [PctDescription],
  template: `<div pctDescription><span pctDescriptionTerm>A</span>B</div>`,
})
class LooseHost {}

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

describe('PctDescriptionList', () => {
  it('dresses the consumer’s dl and writes no role on it', async () => {
    const dl = root(await render(Host)).querySelector('dl')!;
    expect(dl.classList).toContain('pct-description-list');
    expect(dl.getAttribute('role')).toBeNull();
    expect([...dl.children].map((c) => c.localName)).toEqual(['div', 'div']);
  });

  it('writes each pair as a dt and a dd, in the order the platform reads them', async () => {
    const pair = root(await render(Host)).querySelector('div')!;
    expect(pair.classList).toContain('pct-description');
    expect([...pair.children].map((c) => c.localName)).toEqual([
      'dt',
      'dd',
      'dd',
    ]);
    expect(
      [...pair.children].map((c) => c.getAttribute('data-pct-part')),
    ).toEqual(['term', 'value', 'control']);
    expect(pair.querySelector('dt')?.textContent).toBe('Supply');
    expect(pair.querySelector('dd')?.textContent?.trim()).toBe('21.4 °C');
  });

  it('leaves the control’s dd empty when the pair has no control', async () => {
    const pair = root(await render(Host)).querySelector('div')!;
    expect(
      pair.querySelector('[data-pct-part="control"]')?.childNodes.length,
    ).toBe(0);
  });

  it('names the control by its term', async () => {
    const pair = root(await render(Host)).querySelectorAll('div')[1];
    const dt = pair.querySelector('dt')!;
    const input = pair.querySelector('input')!;
    expect(dt.id).toMatch(/^pct-description-term-/);
    expect(input.getAttribute('aria-labelledby')).toBe(dt.id);
    expect(input.parentElement?.getAttribute('data-pct-part')).toBe('control');
  });

  it('gives every term an id of its own', async () => {
    const ids = [...root(await render(Host)).querySelectorAll('dt')].map(
      (dt) => dt.id,
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe('PctDescription — the shape that warns', () => {
  it('a pair in a dl warns nothing', async () => {
    const warn = warnings();
    await render(Host);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a pair with no dl above it warns once, in dev mode', async () => {
    const warn = warnings();
    await render(LooseHost);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pctDescription]');
    expect(warn.mock.calls[0][0]).toContain('<dl pctDescriptionList>');
  });

  it('a host standing in no element at all warns rather than throws', async () => {
    const warn = warnings();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(PctDescription);
    (fixture.nativeElement as HTMLElement).remove();
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pctDescription]');
  });
});
