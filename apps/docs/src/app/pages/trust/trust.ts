import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { DOCS_EVIDENCE } from '../../../generated/content';
import {
  RegistryRow,
  TRUST_DECISIONS,
  TRUST_GATES,
  TRUST_LESSONS,
  TRUST_REGISTRY,
} from '../../../generated/pages-data';
import { DocsBand, DocsBar } from '../../docs-bar';
import { DocsFinder } from '../../docs-finder';
import { asNeedle } from '../../find';
import { describePage } from '../../seo';
import { spyOnSections } from '../../spy';

/** Where the repository keeps what these indexes name. */
const BLOB = 'https://github.com/pacit/components/blob/main/';

/** `API` → `api`, so an axis of the register has an address a sentence can point at. */
const slugOf = (axis: string): string =>
  axis
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface AxisGroup {
  readonly axis: string;
  readonly slug: string;
  readonly rows: readonly (RegistryRow & {
    readonly gateHtml: SafeHtml;
    readonly controlHtml: SafeHtml;
    readonly promiseHtml: SafeHtml;
  })[];
}

/**
 * The axis worn outward: the promise registry rendered row by row, the gates named, the
 * mutation score in the open, every decision and lesson listed under a stable anchor —
 * the addresses the component cards link into. For the auditor this page IS the product.
 *
 * **Which is why one thing on it was a defect and not a matter of taste.** docs/registry.md
 * clips its cells with an ellipsis to stay a markdown table narrow enough to read, and this
 * page rendered the clip: 94 rows ended mid-sentence, on the page an audit reads first.
 * Every row now carries the requirement's own title above the clipped cells — the promise
 * it makes, whole, from the file that makes it, and the content pass throws when a row has
 * no titled section of its own.
 *
 * The rest is the way in. 94% of the page was three flat lists — 94 requirements, 73
 * decisions, 183 lessons — with no filter and no addresses: a bar of the seven axes and the
 * finder the gallery ships answer the first, and the two logs become the dotted index the
 * landing adopted, each entry linking to the file it names.
 */
@Component({
  selector: 'docs-trust',
  imports: [DocsBar, DocsFinder, RouterLink, PctContainer, PctStack],
  templateUrl: './trust.html',
  styleUrl: './trust.scss',
})
export class TrustPage {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly trust = (value: string): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(value);

  constructor() {
    describePage(
      'The proof machinery of @pacit/components: the promise registry with gates and negative controls, the mutation score, every decision and lesson on record.',
    );

    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() =>
      spyOnSections(document, destroyRef, (id) => this.active.set(id)),
    );
  }

  protected readonly evidence = DOCS_EVIDENCE;
  protected readonly gates = TRUST_GATES;
  protected readonly total = TRUST_REGISTRY.length;

  protected readonly query = signal('');
  protected readonly active = signal<string | null>(null);

  /**
   * What a requirement answers to: its id, which is what a link into this page carries, and
   * the promise it makes, which is what a reader who does not know the id has to go on. Not
   * the gate cell — that is a file list, and a page whose filter matched paths would answer
   * `spec` with half the register.
   */
  private readonly matching = computed(() => {
    const needle = asNeedle(this.query());
    if (!needle) return TRUST_REGISTRY;
    return TRUST_REGISTRY.filter(
      (row) =>
        row.id.includes(needle) || row.promise.toLowerCase().includes(needle),
    );
  });

  protected readonly shown = computed(() => this.matching().length);

  protected readonly axes = computed<readonly AxisGroup[]>(() => {
    const rows = this.matching();
    return [...new Set(rows.map((row) => row.axis))].map((axis) => ({
      axis,
      slug: slugOf(axis),
      rows: rows
        .filter((row) => row.axis === axis)
        .map((row) => ({
          ...row,
          promiseHtml: this.trust(row.promise),
          gateHtml: this.trust(row.gate),
          controlHtml: this.trust(row.control),
        })),
    }));
  });

  /**
   * The register's own head first, so a reader who has narrowed to one axis still has a way
   * back to all of them — and an axis the filter empties leaves the bar with its rows.
   */
  protected readonly bands = computed<readonly DocsBand[]>(() => [
    { slug: 'registry', label: 'All', count: this.shown() },
    ...this.axes().map((group) => ({
      slug: group.slug,
      label: group.axis,
      count: group.rows.length,
    })),
  ]);

  protected readonly decisions = TRUST_DECISIONS.map((decision) => ({
    ...decision,
    titleHtml: this.trust(decision.title),
    href: `${BLOB}docs/decisions/${decision.file}`,
  }));

  protected readonly lessons = TRUST_LESSONS.map((lesson) => ({
    ...lesson,
    titleHtml: this.trust(lesson.title),
    href: `${BLOB}docs/lessons.md#lesson-${lesson.id}`,
  }));

  /**
   * The register's three states in the four tones the site states a verdict in, which the
   * conformance report's five words map onto too — one chip, defined once, so a reader who
   * has learned the register has learned the report.
   */
  protected tone(state: RegistryRow['state']): string {
    return state === 'enforced'
      ? 'good'
      : state === 'partial'
        ? 'caution'
        : 'bad';
  }

  protected onQuery(typed: string): void {
    this.query.set(typed);
  }
}
