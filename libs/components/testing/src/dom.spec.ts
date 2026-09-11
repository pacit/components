import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { allParts, part, query } from './dom';

/**
 * The negative control of the helpers a consumer's own tests reach for.
 *
 * These three functions exist for ONE reason — a failed query that says what was looked for
 * and what was there, instead of `Cannot read properties of null` four frames away from the
 * cause. So the half of them worth testing is the half that throws, and the message is the
 * product rather than a decoration on it: a test asserting only that "it throws" would leave
 * every word of it free to rot ([`req-quality-unit`](../../../../docs/requirements/quality.md#req-quality-unit)).
 *
 * They are also published code (`@pacit/components/testing`), which is the argument plan item
 * 4.49 settled: an instrument a consumer's suite leans on cannot be held to a lower standard
 * than the components it measures, because a defect here makes somebody else's tests lie.
 */
@Component({
  template: `<div data-pct-part="root">
    <span data-pct-part="label">{{ text() }}</span>
    <span data-pct-part="item">one</span>
    <span data-pct-part="item">two</span>
    <b class="plain">plain</b>
  </div>`,
})
class Host {
  readonly text = signal('Label');
}

@Component({ template: `<b class="bare">nothing here</b>` })
class Bare {}

describe('the DOM helpers', () => {
  function render<T>(type: new () => T): ComponentFixture<T> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    return fixture;
  }

  describe('part', () => {
    it('reads a part off a fixture, and off a plain node', () => {
      const fixture = render(Host);

      expect(part(fixture, 'label').textContent).toBe('Label');
      // The other branch of the root: a CDK panel renders outside the host tree, so the
      // helpers take any `ParentNode` as well as a fixture. Both roads, one assertion apart.
      expect(
        part(fixture.nativeElement as ParentNode, 'label').textContent,
      ).toBe('Label');
    });

    it('names the part it wanted and lists the ones that were there', () => {
      const fixture = render(Host);

      // Every clause of the message is pinned: the missing name, the wording, and the
      // inventory — which is the sentence that turns a red test into a fixed one.
      expect(() => part(fixture, 'footer')).toThrowError(
        'No part [data-pct-part="footer"]. Parts available: root, label, item, item.',
      );
    });

    it('says `(none)` rather than nothing when the tree carries no parts at all', () => {
      const fixture = render(Bare);

      // The empty-inventory road is its own case: a plain join would end the sentence on a
      // colon and a full stop, and the reader would be left wondering what was cut off.
      expect(() => part(fixture, 'root')).toThrowError(
        'No part [data-pct-part="root"]. Parts available: (none).',
      );
    });
  });

  describe('allParts', () => {
    it('returns every element of the name, in document order', () => {
      const fixture = render(Host);

      expect(allParts(fixture, 'item').map((el) => el.textContent)).toEqual([
        'one',
        'two',
      ]);
    });

    it('returns an empty array instead of throwing — absence is a valid answer here', () => {
      const fixture = render(Host);

      expect(allParts(fixture, 'footer')).toEqual([]);
    });
  });

  describe('query', () => {
    it('returns the first match of a selector', () => {
      const fixture = render(Host);

      expect(query(fixture, '[data-pct-part="item"]').textContent).toBe('one');
      expect(query<HTMLElement>(fixture, '.plain').textContent).toBe('plain');
    });

    it('names the selector it was given', () => {
      const fixture = render(Host);

      expect(() => query(fixture, '.missing')).toThrowError(
        'No element matching the selector ".missing".',
      );
    });
  });
});
