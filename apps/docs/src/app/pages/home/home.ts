import { Component, computed, inject, signal } from '@angular/core';
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
