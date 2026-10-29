// P4 — a mark's SVG lives in an <ng-template> of its own component and the scene stamps it
// into its one <svg> through NgTemplateOutlet. Does the element keep the SVG namespace in the
// browser's DOM and in the server's HTML, in declaration order, and do two marks of one class
// stay apart? Temporary: a copy stands in probes/chart/ on the probe branch.
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChildren,
  input,
  provideZonelessChangeDetection,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';

abstract class Mark {
  abstract readonly template: () => TemplateRef<unknown>;
}

@Component({
  selector: 'probe-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: Mark, useExisting: ProbeLine }],
  template: `<ng-template #t><svg:g data-mark="line" [attr.data-name]="name()"><svg:path [attr.d]="d()" /></svg:g></ng-template>`,
})
class ProbeLine extends Mark {
  readonly name = input('');
  readonly d = input('M0 0L10 10');
  readonly template = viewChild.required<TemplateRef<unknown>>('t');
}

@Component({
  selector: 'probe-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: Mark, useExisting: ProbeBand }],
  template: `<ng-template #t><svg:rect data-mark="band" x="0" y="0" width="5" height="5" /></ng-template>`,
})
class ProbeBand extends Mark {
  readonly template = viewChild.required<TemplateRef<unknown>>('t');
}

@Component({
  selector: 'probe-scene',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `<svg width="100" height="50"><svg:defs><svg:clipPath id="c"><svg:rect width="100" height="50" /></svg:clipPath></svg:defs><svg:g clip-path="url(#c)">@for (m of marks(); track $index) {<ng-container [ngTemplateOutlet]="m.template()" />}</svg:g></svg>`,
})
class ProbeScene {
  readonly marks = contentChildren(Mark);
}

@Component({
  selector: 'probe-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProbeScene, ProbeLine, ProbeBand],
  template: `<probe-scene><probe-band /><probe-line name="a" /><probe-line name="b" d="M0 5L10 5" /></probe-scene>`,
})
class ProbeHost {}

const SVG = 'http://www.w3.org/2000/svg';

describe('P4 marks stamped into one svg', () => {
  it('CSR: namespace, order, two instances apart', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeHost);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const marks = [...root.querySelectorAll('[data-mark]')];
    const report = {
      count: marks.length,
      order: marks.map((m) => `${m.getAttribute('data-mark')}:${m.getAttribute('data-name') ?? ''}`),
      namespaces: [...new Set(marks.map((m) => m.namespaceURI))],
      pathNamespace: root.querySelector('path')?.namespaceURI,
      parentIsClipped: marks.every((m) => m.parentElement?.getAttribute('clip-path') === 'url(#c)'),
      hostsOutsideSvg: [...root.querySelectorAll('probe-line, probe-band')].map((h) => h.namespaceURI),
    };
    console.log('P4-CSR', JSON.stringify(report));
    expect(report.namespaces).toEqual([SVG]);
    expect(report.pathNamespace).toBe(SVG);
    expect(report.order).toEqual(['band:', 'line:a', 'line:b']);
  });

  it('SSR: the server writes the marks inside the svg', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(ProbeHost, { providers: [provideZonelessChangeDetection(), provideServerRendering()] }, context),
      { document: '<html><head></head><body><probe-host></probe-host></body></html>', url: '/' },
    );
    const svg = html.slice(html.indexOf('<svg'), html.indexOf('</svg>') + 6);
    const inside = (svg.match(/data-mark="[a-z]+"/g) ?? []).length;
    console.log('P4-SSR', JSON.stringify({ inside, svg: svg.replace(/ _ng[a-z]+-[a-z0-9-]+=""/g, '').slice(0, 600) }));
    expect(inside).toBe(3);
    expect(svg).toContain('<path d="M0 5L10 5"');
  });
});
