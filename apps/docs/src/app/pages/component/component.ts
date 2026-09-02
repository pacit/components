import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  PendingTasks,
  Type,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  PctBreadcrumb,
  PctCrumb,
  PctCrumbLink,
} from '@pacit/components/breadcrumb';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { PctTab, PctTabs } from '@pacit/components/tabs';
import { PctToaster } from '@pacit/components/toast';
import { CARD_HTML } from '../../../generated/cards-html';
import { DOCS_CARDS } from '../../../generated/content';
import { DEMO_CODE } from '../../../generated/demo-code';
import { DEMOS } from '../../demos';

/**
 * One component's page (site.md: "demo first, code beside it, inventory below it").
 * Everything rendered here left the content pass as data: the card's sections arrive as
 * built HTML, the code tab is the demo's OWN source file highlighted at build time, and
 * the parts and tokens chips are the snapshots' rows. The `[innerHTML]` payloads are
 * this repository's build output — trusted by construction, so the sanitizer is told so.
 *
 * The demo itself lazy-loads per id inside a `PendingTasks` span: the prerender waits
 * for it, so the static HTML ships with the demo's first frame already drawn.
 */
@Component({
  selector: 'docs-component',
  imports: [
    NgComponentOutlet,
    RouterLink,
    PctBreadcrumb,
    PctButton,
    PctContainer,
    PctCrumb,
    PctCrumbLink,
    PctStack,
    PctTab,
    PctTabs,
  ],
  templateUrl: './component.html',
  styleUrl: './component.scss',
})
export class ComponentPage {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toaster = inject(PctToaster);
  private readonly tasks = inject(PendingTasks);

  readonly id = input.required<string>();

  protected readonly card = computed(
    () => DOCS_CARDS.find((card) => card.id === this.id()) ?? null,
  );

  protected readonly html = computed(() => {
    const rendered = CARD_HTML[this.id()];
    if (!rendered) return null;
    const trust = (value: string): SafeHtml =>
      this.sanitizer.bypassSecurityTrustHtml(value);
    return {
      pattern: rendered.pattern ? trust(rendered.pattern) : null,
      intro: trust(rendered.intro),
      body: trust(rendered.body),
    };
  });

  protected readonly code = computed(() => {
    const source = DEMO_CODE[this.id()];
    return source ? this.sanitizer.bypassSecurityTrustHtml(source) : null;
  });

  protected readonly tab = signal('demo');
  protected readonly demo = signal<Type<unknown> | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      this.demo.set(null);
      this.tab.set('demo');
      const load = DEMOS[id];
      if (!load) return;
      const done = this.tasks.add();
      load().then((type) => {
        if (this.id() === id) this.demo.set(type);
        done();
      });
    });
  }

  protected async copy(name: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(name);
      this.toaster.show({ text: `Copied ${name}`, duration: 1500 });
    } catch {
      this.toaster.show({ text: name, duration: 3000 });
    }
  }
}
