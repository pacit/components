import { DOCUMENT, NgComponentOutlet, ViewportScroller } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  PendingTasks,
  Type,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PctBadge } from '@pacit/components/badge';
import {
  PctBreadcrumb,
  PctCrumb,
  PctCrumbLink,
} from '@pacit/components/breadcrumb';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import { PctTab, PctTabs } from '@pacit/components/tabs';
import { PctToaster } from '@pacit/components/toast';
import {
  COMPONENT_PAGES,
  ComponentPage,
} from '../../../generated/component-pages';
import { DEMOS, EXAMPLES } from '../../demos';
import { describePage } from '../../seo';
import { spyOnSections } from '../../spy';
import { DocsIndex } from './docs-index';
import { DocsToc, TocItem } from '../../docs-toc';

const STATE_LABEL = {
  measured: 'Measured',
  gap: 'Gap',
  deliberate: 'By design',
  na: 'n/a',
} as const;

/**
 * One component's page (plan 2.7.3; site.md "The component page, drawn in words").
 * Everything rendered here left the content pass as data: the API read from the library's
 * own source, the tokens with their meaning and both themes' defaults, the card's sections
 * as a form, the examples with their own code. The `[innerHTML]` payloads are this
 * repository's build output — trusted by construction, so the sanitizer is told so.
 *
 * The preview and the examples lazy-load per id inside one `PendingTasks` span: the
 * prerender waits for them, so the static HTML ships with every stage's first frame drawn.
 */
@Component({
  selector: 'docs-component',
  imports: [
    NgComponentOutlet,
    RouterLink,
    PctBadge,
    PctBreadcrumb,
    PctButton,
    PctContainer,
    PctCrumb,
    PctCrumbLink,
    PctTab,
    PctTabs,
    DocsIndex,
    DocsToc,
  ],
  templateUrl: './component.html',
  styleUrl: './component.scss',
})
export class ComponentPageView {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toaster = inject(PctToaster);
  private readonly tasks = inject(PendingTasks);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly scroller = inject(ViewportScroller);
  private readonly injector = inject(Injector);

  readonly id = input.required<string>();

  protected readonly page = computed<ComponentPage | null>(
    () => COMPONENT_PAGES[this.id()] ?? null,
  );

  protected readonly title = computed(() => {
    const id = this.id();
    return id.charAt(0).toUpperCase() + id.slice(1);
  });

  /**
   * The line the copy button hands over, and it names what the fence below it USES — the
   * content pass reads that off the usage fence, because `classes` is what the card
   * documents and the two are not the same list: `toast` documents `PctToaster` and mounts
   * `<pct-toast-viewport />`.
   */
  protected readonly importLine = computed(() => {
    const page = this.page();
    return page
      ? `import { ${page.imports.join(', ')} } from '${page.entrypoint}';`
      : '';
  });

  protected readonly sourceUrl = computed(
    () =>
      `https://github.com/pacit/components/blob/main/${this.page()?.api[0]?.file ?? 'libs/components'}`,
  );

  /** The page's HTML payloads, each marked trusted once. */
  protected readonly html = computed(() => {
    const page = this.page();
    if (!page) return null;
    const trust = (value: string): SafeHtml =>
      this.sanitizer.bypassSecurityTrustHtml(value);
    return {
      summary: trust(page.summary),
      notes: page.notes ? trust(page.notes) : null,
      pattern: page.pattern ? trust(page.pattern) : null,
      usage: page.usage ? trust(page.usage.code) : null,
      preview: page.preview
        ? {
            code: trust(page.preview.code),
            caption: trust(page.preview.caption),
          }
        : null,
      examples: Object.fromEntries(
        page.examples.map((e) => [
          e.key,
          { prose: trust(e.prose), code: trust(e.code) },
        ]),
      ),
      api: page.api.map((c) => ({
        ...c,
        description: trust(c.description),
        members: c.members.map((m) => ({
          ...m,
          description: trust(m.description),
        })),
        host: c.host.map((h) => ({ ...h, note: trust(h.note) })),
      })),
      exports: page.exports.map((e) => ({
        ...e,
        description: trust(e.description),
      })),
      parts: page.parts.map((p) => ({
        ...p,
        description: trust(p.description),
      })),
      tokens: page.tokens.map((t) => ({
        ...t,
        description: trust(t.description),
      })),
      theming: page.theming ? trust(page.theming.code) : null,
      keyboard: page.keyboard ? trust(page.keyboard) : null,
      checks: page.checks.map((c) => ({
        ...c,
        label: STATE_LABEL[c.state],
        criterion: trust(c.criterion),
        evidence: trust(c.evidence),
      })),
      limitations: page.limitations ? trust(page.limitations) : null,
      decisions: page.decisions.map((d) => ({ ...d, title: trust(d.title) })),
      lessons: page.lessons.map((l) => ({ ...l, title: trust(l.title) })),
    };
  });

  protected readonly toc = computed<readonly TocItem[]>(() => {
    const page = this.page();
    if (!page) return [];
    // The same question the template asks at `@if (c.host.length)`. Asked in one place and
    // not the other, the contents offered `#api-host` on `toast` and `tooltip`, where the
    // block is never rendered — a link that writes a fragment into the URL, does not move the
    // page, and is then shareable and lands nowhere.
    const api: TocItem[] =
      page.api.length === 1
        ? [
            { id: 'api-inputs', label: 'Inputs' },
            { id: 'api-outputs', label: 'Outputs' },
            ...(page.api[0].host.length
              ? [{ id: 'api-host', label: 'On the element' }]
              : []),
          ]
        : page.api.map((c) => ({ id: `api-${c.name}`, label: c.name }));
    return [
      { id: 'preview', label: 'Preview' },
      { id: 'usage', label: 'Usage' },
      {
        id: 'examples',
        label: 'Examples',
        children: page.examples.map((e) => ({
          id: `ex-${e.key}`,
          label: e.title,
        })),
      },
      { id: 'api', label: 'API', children: api },
      {
        id: 'styling',
        label: 'Styling',
        children: [
          { id: 'styling-parts', label: 'Parts' },
          { id: 'styling-tokens', label: 'Tokens' },
          ...(page.theming
            ? [{ id: 'styling-theming', label: 'Theming' }]
            : []),
        ],
      },
      {
        id: 'accessibility',
        label: 'Accessibility',
        children: [
          ...(page.keyboard
            ? [{ id: 'a11y-keyboard', label: 'Keyboard' }]
            : []),
          { id: 'a11y-measured', label: 'Measured' },
        ],
      },
      {
        id: 'evidence',
        label: 'Evidence',
        children: [
          ...(page.notes
            ? [{ id: 'evidence-notes', label: 'Why this way' }]
            : []),
          ...(page.decisions.length
            ? [{ id: 'evidence-decisions', label: 'Decisions' }]
            : []),
          ...(page.limitations
            ? [{ id: 'evidence-limits', label: 'Limitations' }]
            : []),
        ],
      },
    ];
  });

  protected readonly tab = signal('preview');
  protected readonly stageTheme = signal<'dark' | 'light' | null>(null);
  protected readonly stageDir = signal<'ltr' | 'rtl'>('ltr');
  protected readonly openCode = signal<ReadonlySet<string>>(new Set());
  protected readonly active = signal<string | null>('preview');

  protected readonly demo = signal<Type<unknown> | null>(null);
  protected readonly examples = signal<ReadonlyMap<string, Type<unknown>>>(
    new Map(),
  );

  constructor() {
    describePage(
      'A component of @pacit/components: the running preview and examples, the API read from the source, the tokens, and what is measured.',
    );

    effect(() => {
      const id = this.id();
      this.demo.set(null);
      this.examples.set(new Map());
      this.tab.set('preview');
      this.stageTheme.set(null);
      this.stageDir.set('ltr');
      this.openCode.set(new Set());
      const loads = EXAMPLES[id] ?? [];
      const preview = DEMOS[id];
      if (!preview && !loads.length) return;
      const done = this.tasks.add();
      Promise.all([
        preview ? preview() : Promise.resolve(null),
        ...loads.map((e) => e.load().then((type) => [e.key, type] as const)),
      ]).then(([type, ...pairs]) => {
        if (this.id() === id) {
          this.demo.set(type);
          this.examples.set(new Map(pairs));
          // The router followed the address's fragment when the navigation ended, and the
          // demos have landed AFTER it — every heading below the preview has just moved
          // down by the height of what arrived (measured: `#ex-faces` at 160px where the
          // offset had put it at 88). So the anchor is asked for once more, from the same
          // scroller with the same offset, in the render that holds the demos.
          const fragment = this.route.snapshot.fragment;
          if (fragment)
            afterNextRender(() => this.scroller.scrollToAnchor(fragment), {
              injector: this.injector,
            });
        }
        done();
      });
    });

    // The scroll spy: the last heading that passed the reading line owns the table of
    // contents; a subsection lights its section too. The reading itself is `spy.ts`, because
    // the gallery's band bar asks the same question of the same DOM.
    afterNextRender(() =>
      spyOnSections(this.document, this.destroyRef, (id) =>
        this.active.set(id),
      ),
    );
  }

  protected isSectionActive(
    id: string,
    children?: readonly TocItem[],
  ): boolean {
    const active = this.active();
    return active === id || Boolean(children?.some((c) => c.id === active));
  }

  protected hasOutputs(c: {
    readonly members: readonly { readonly kind: string }[];
  }): boolean {
    return c.members.some((m) => m.kind === 'output');
  }

  protected toggleCode(key: string): void {
    this.openCode.update((open) => {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected flipStage(): void {
    if (this.stageTheme()) {
      this.stageTheme.set(null);
      return;
    }
    const root = this.document.documentElement;
    const pinned = root.getAttribute('data-theme');
    const dark =
      pinned === 'dark' ||
      (!pinned &&
        Boolean(
          this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)')
            .matches,
        ));
    this.stageTheme.set(dark ? 'light' : 'dark');
  }

  protected flipDir(): void {
    this.stageDir.update((dir) => (dir === 'rtl' ? 'ltr' : 'rtl'));
  }

  protected async copy(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toaster.show({ text: `Copied ${what}`, duration: 1500 });
    } catch {
      this.toaster.show({ text, duration: 3000 });
    }
  }
}
