import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { DOCS_EVIDENCE } from '../../../generated/content';
import {
  TRUST_DECISIONS,
  TRUST_GATES,
  TRUST_LESSONS,
  TRUST_REGISTRY,
} from '../../../generated/pages-data';
import { describePage } from '../../seo';

/**
 * The axis worn outward: the promise registry rendered row by row, the gates named, the
 * mutation score in the open, every decision and lesson listed under a stable anchor —
 * the addresses the component cards link into. For the auditor this page IS the product.
 */
@Component({
  selector: 'docs-trust',
  imports: [PctContainer, PctStack, RouterLink],
  templateUrl: './trust.html',
  styleUrl: './trust.scss',
})
export class TrustPage {
  constructor() {
    describePage(
      'The proof machinery of @pacit/components: the promise registry with gates and negative controls, the mutation score, every decision and lesson on record.',
    );
  }

  private readonly sanitizer = inject(DomSanitizer);
  private readonly trust = (value: string): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(value);

  protected readonly evidence = DOCS_EVIDENCE;
  protected readonly gates = TRUST_GATES;

  protected readonly axes = [
    ...new Set(TRUST_REGISTRY.map((row) => row.axis)),
  ].map((axis) => ({
    axis,
    rows: TRUST_REGISTRY.filter((row) => row.axis === axis).map((row) => ({
      ...row,
      gate: this.trust(row.gate),
      control: this.trust(row.control),
    })),
  }));

  protected readonly decisions = TRUST_DECISIONS.map((decision) => ({
    ...decision,
    title: this.trust(decision.title),
  }));

  protected readonly lessons = TRUST_LESSONS.map((lesson) => ({
    ...lesson,
    title: this.trust(lesson.title),
  }));
}
