import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { SNIPPET_CODE } from '../../../generated/demo-code';
import { describePage } from '../../seo';

/**
 * The road in: install, provide, first form — each snippet a real file, highlighted at
 * build by the content pass: apps/docs/src/snippets/install.sh.txt,
 * apps/docs/src/snippets/provide.ts.txt and apps/docs/src/snippets/form.ts.txt (named in
 * full — a generated lookup reaches no file by itself, req-project-reach).
 */
@Component({
  selector: 'docs-start',
  imports: [RouterLink, PctContainer, PctStack],
  templateUrl: './start.html',
  styleUrl: './start.scss',
})
export class StartPage {
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    describePage(
      'Install @pacit/components, provide the config, write a first signal form — three steps, SSR-ready from the start.',
    );
  }

  protected readonly snippet = (name: string) =>
    this.sanitizer.bypassSecurityTrustHtml(SNIPPET_CODE[name] ?? '');
}
