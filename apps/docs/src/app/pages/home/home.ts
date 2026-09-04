import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, required } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctChip, PctChips } from '@pacit/components/chips';
import { PctContainer } from '@pacit/components/container';
import { PctField, PctText } from '@pacit/components/field';
import { PctGrid } from '@pacit/components/grid';
import { PctProgress } from '@pacit/components/progress';
import { PctStack } from '@pacit/components/stack';
import { PctStep, PctStepper } from '@pacit/components/stepper';
import { PctSwitch } from '@pacit/components/switch';
import { PctToaster } from '@pacit/components/toast';
import { DOCS_CARDS, DOCS_EVIDENCE } from '../../../generated/content';
import { describePage } from '../../seo';

const INSTALL = 'npm install @pacit/components';
const TOPICS = ['Angular', 'zoneless', 'signals', 'a11y'];

/**
 * The landing (site.md "The landing, drawn in words", step 2.1.6). Everything measured on
 * it comes from `DOCS_EVIDENCE` — the content pass reads the tracked snapshots and throws
 * on a number it cannot parse, so a figure nothing measured cannot reach this template.
 * The "live" cards are real instances of the shipped package driven by the signals below;
 * the small state they need is the page's own, not a demo harness.
 */
@Component({
  selector: 'docs-home',
  imports: [
    RouterLink,
    FormField,
    PctButton,
    PctChip,
    PctChips,
    PctContainer,
    PctField,
    PctGrid,
    PctProgress,
    PctStack,
    PctStep,
    PctStepper,
    PctSwitch,
    PctText,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private readonly toaster = inject(PctToaster);
  private readonly destroyRef = inject(DestroyRef);

  /** The evidence strip's own box — the reveal below needs the element, not a selector. */
  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');

  /**
   * Whether the facts start hidden and arrive one at a time. False until a browser says
   * otherwise, and that is the load-bearing part: this page is PRERENDERED, so a fact that
   * starts at `opacity: 0` in the static HTML is a fact nobody sees without JavaScript, and
   * one a reader with `prefers-reduced-motion` would have to scroll past to reveal. The
   * hidden state hangs off this flag, so the default — no script, script that never ran, or
   * less motion asked for — is simply five facts, present.
   */
  protected readonly armed = signal(false);

  constructor() {
    describePage(
      'An accessible Angular component library, built and machine-audited to WCAG 2.2 AA — zoneless, signal forms, SSR, design tokens. Every number on the page is measured at build time.',
    );

    // Browser only, and through the view's own reference rather than a document query: the
    // first version reached for `document.querySelector` in here and got null, because what
    // `afterNextRender` promises is that the render ran, not which document this component
    // is looking at.
    afterNextRender(() => {
      const host = this.strip()?.nativeElement;
      const view = host?.ownerDocument.defaultView;
      if (!host || !view) return;
      if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.armed.set(true);
      const seen = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              seen.unobserve(entry.target);
            }
        },
        { threshold: 0.35 },
      );
      for (const fact of host.querySelectorAll('.fact')) seen.observe(fact);
      this.destroyRef.onDestroy(() => seen.disconnect());
    });
  }

  protected readonly evidence = DOCS_EVIDENCE;
  protected readonly cards = DOCS_CARDS;
  protected readonly install = INSTALL;

  /** The stepper card: a journey mid-way, steered by the two buttons beside it. */
  protected readonly step = signal(2);
  protected readonly atStart = computed(() => this.step() <= 1);
  protected readonly atEnd = computed(() => this.step() >= 3);

  /** The chips card: removal really shortens this array — restore brings it back. */
  protected readonly topics = signal(TOPICS);
  protected readonly missing = computed(
    () => this.topics().length < TOPICS.length,
  );

  /** The forms card: a signal form with one rule, and a switch driving the bar. */
  protected readonly workspace = signal({ name: 'acme-design-system' });
  protected readonly workspaceForm = form(this.workspace, (path) => {
    required(path.name, { message: 'Every workspace needs a name' });
  });
  protected readonly ready = signal(false);
  protected readonly readiness = computed(() => (this.ready() ? 100 : 62));

  protected move(by: number): void {
    this.step.update((at) => at + by);
  }

  protected drop(topic: string): void {
    this.topics.update((all) => all.filter((kept) => kept !== topic));
  }

  protected restore(): void {
    this.topics.set(TOPICS);
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(INSTALL);
      this.toaster.show({ text: 'Copied to the clipboard.', duration: 2000 });
    } catch {
      // Clipboard access can be denied (permissions, non-secure context) — the toast
      // then carries the line itself instead of claiming a copy that never happened.
      this.toaster.show({ text: INSTALL, duration: 4000 });
    }
  }
}
