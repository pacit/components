import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PctAccordion, PctAccordionItem } from '@pacit/components/accordion';
import { PctBadge } from '@pacit/components/badge';
import { PctButton } from '@pacit/components/button';
import { PctSelect, PctSelectOption } from '@pacit/components/select';

import { PctHarness } from './harness';
import * as declared from './harnesses';
import {
  PctAccordionItemHarness,
  PctBadgeHarness,
  PctButtonHarness,
  PctSelectHarness,
} from './harnesses';

// Two buttons, one of them able to load — the parts a harness reads and the one it does not.
@Component({
  imports: [PctButton],
  template: `<button pctButton class="first" [loading]="loading()">Save</button>
    <button pctButton class="second" variant="ghost">Cancel</button>`,
})
class ButtonsHost {
  loading = signal(false);
}

// A group of two sections — the host of each item IS its `item` part.
@Component({
  imports: [PctAccordion, PctAccordionItem],
  template: `<pct-accordion>
    <pct-accordion-item label="One">First</pct-accordion-item>
    <pct-accordion-item label="Two">Second</pct-accordion-item>
  </pct-accordion>`,
})
class AccordionHost {}

// A select — its panel and options are drawn in a CDK overlay, outside the host's subtree.
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" [(value)]="value" />`,
})
class SelectHost {
  options: readonly PctSelectOption[] = [
    { value: 'pl', label: 'Poland' },
    { value: 'de', label: 'Germany' },
    { value: 'sk', label: 'Slovakia' },
  ];
  value = signal<string | null>(null);
}

// A badge — no parts at all; the harness gives the host and its state.
@Component({
  imports: [PctBadge],
  template: `<pct-badge tone="danger">New</pct-badge>`,
})
class BadgeHost {}

async function mount<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
}

describe('PctHarness', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('finds the host by the component’s own selector and a part by its inventory name', async () => {
    const { loader } = await mount(ButtonsHost);
    const buttons = await loader.getAllHarnesses(PctButtonHarness);
    expect(buttons).toHaveLength(2);

    const [save] = buttons;
    expect(await save.text('label')).toBe('Save');
    expect(
      await (
        await save.part('label')
      ).matchesSelector('[data-pct-part="label"]'),
    ).toBe(true);
    expect(await save.parts('label')).toHaveLength(1);
  });

  it('a part that is not drawn: `has` says so, `part` throws naming what is drawn', async () => {
    const { fixture, loader } = await mount(ButtonsHost);
    const save = await loader.getHarness(PctButtonHarness);

    expect(await save.has('spinner')).toBe(false);
    await expect(save.part('spinner')).rejects.toThrow(
      /PctButtonHarness: no part "spinner" is drawn\. Parts drawn: label\./,
    );
    expect(await save.parts('spinner')).toEqual([]);

    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    expect(await save.has('spinner')).toBe(true);
  });

  it('`state` reads a data-pct-* attribute off the host, and nothing for one not written', async () => {
    const { loader } = await mount(ButtonsHost);
    const save = await loader.getHarness(PctButtonHarness);
    expect(await save.state('variant')).toBe('solid');
    expect(await save.state('size')).toBe('md');
    expect(await save.state('nothing')).toBeNull();
  });

  it('`with` narrows by the CDK’s own filters', async () => {
    const { loader } = await mount(ButtonsHost);
    const cancel = await loader.getHarness(
      PctButtonHarness.with({ selector: '.second' }),
    );
    expect(await cancel.text('label')).toBe('Cancel');
    expect(await cancel.state('variant')).toBe('ghost');
  });

  it('the host is the part when the component writes the part on itself', async () => {
    const { loader } = await mount(AccordionHost);
    const items = await loader.getAllHarnesses(PctAccordionItemHarness);
    expect(items).toHaveLength(2);

    const item = await items[1].part('item');
    expect(await item.matchesSelector('pct-accordion-item')).toBe(true);
    expect(await items[1].parts('item')).toHaveLength(1);
    expect(await items[1].text('heading')).toBe('Two');
  });

  it('a part drawn in an overlay is found in the document once it is open', async () => {
    const { fixture, loader } = await mount(SelectHost);
    const select = await loader.getHarness(PctSelectHarness);

    expect(await select.has('panel')).toBe(false);
    expect(await select.parts('option')).toEqual([]);

    await (await select.part('trigger')).click();
    await fixture.whenStable();

    expect(await select.has('panel')).toBe(true);
    expect(await (await select.part('panel')).getAttribute('role')).toBe(
      'listbox',
    );
    expect(await select.parts('option')).toHaveLength(3);
  });

  it('a component with no parts still gives the host and its state', async () => {
    const { loader } = await mount(BadgeHost);
    const badge = await loader.getHarness(PctBadgeHarness);
    expect(await (await badge.host()).text()).toBe('New');
    expect(await badge.state('tone')).toBe('danger');
    expect(PctBadgeHarness.parts).toEqual([]);
  });

  it('every harness is a declaration over the base: a host selector and a list of parts', () => {
    const classes = Object.values(declared).filter(
      (v): v is typeof PctButtonHarness => typeof v === 'function',
    );
    expect(classes.length).toBeGreaterThan(40);
    for (const H of classes) {
      expect(H.prototype).toBeInstanceOf(PctHarness);
      expect(typeof H.hostSelector).toBe('string');
      expect(H.hostSelector.length).toBeGreaterThan(0);
      expect(Array.isArray(H.parts)).toBe(true);
    }
  });
});
