import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { PctToaster } from '@pacit/components/toast';
import { SNIPPET_CODE, SNIPPET_TEXT } from '../../../generated/demo-code';
import { describePage } from '../../seo';
import { FirstForm } from './first-form';

/**
 * The road in: install, provide, first form, and the one line that makes it render on the
 * server. Each snippet is a real file, highlighted at build by the content pass —
 * apps/docs/src/snippets/install.sh.txt, apps/docs/src/snippets/provide.ts.txt and
 * apps/docs/src/snippets/ssr.ts.txt (named in full — a generated lookup reaches no file by
 * itself, req-project-reach).
 *
 * The fourth is not a snippet file at all: `form` is read from
 * apps/docs/src/app/pages/start/first-form.ts, the component this page RENDERS under it. The
 * page was 1 548 px of code with not one component on it, on a site whose whole claim is
 * that components prove themselves (4.34) — and a snippet beside a screenshot of a snippet
 * would have been the same page with more pixels. One file, so the code and the thing cannot
 * disagree.
 */
@Component({
  selector: 'docs-start',
  imports: [FirstForm, RouterLink, PctButton, PctContainer, PctStack],
  templateUrl: './start.html',
  styleUrl: './start.scss',
})
export class StartPage {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toaster = inject(PctToaster);

  constructor() {
    describePage(
      'Install @pacit/components, provide the config, write a first signal form — three steps, SSR-ready from the start.',
    );
  }

  protected readonly code = (name: string) =>
    this.sanitizer.bypassSecurityTrustHtml(SNIPPET_CODE[name] ?? '');

  /**
   * The same control the component page ships, at its three call sites here: the clipboard
   * when it answers, and the text itself in a toast when it does not — a reader without
   * clipboard permission is shown what they asked for rather than told it failed.
   */
  protected async copy(name: string): Promise<void> {
    const text = SNIPPET_TEXT[name] ?? '';
    try {
      await navigator.clipboard.writeText(text);
      this.toaster.show({ text: 'Copied the snippet', duration: 1500 });
    } catch {
      this.toaster.show({ text, duration: 3000 });
    }
  }
}
