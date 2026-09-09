import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { SNIPPET_CODE } from '../../../generated/demo-code';
import { THEMING_TOKENS, TokenRow } from '../../../generated/pages-data';
import { DocsBand, DocsBar } from '../../docs-bar';
import { DocsFinder } from '../../docs-finder';
import { asNeedle } from '../../find';
import { describePage } from '../../seo';
import { spyOnSections } from '../../spy';

/** One component's dials, closed until a reader or the finder opens them. */
interface TokenGroup {
  readonly id: string;
  readonly tokens: readonly TokenRow[];
}

const TIERS = [
  {
    tier: 'primitive',
    slug: 'primitive',
    name: 'Primitives',
    heading: 'Primitives — the raw material',
    tells:
      'Colour ramps, the spacing scale, radii, motion durations. No meaning yet, only values.',
  },
  {
    tier: 'semantic',
    slug: 'semantic',
    name: 'Semantic',
    heading: 'Semantic — the meaning',
    tells:
      'Surface, text, primary, danger — the names stylesheets actually read, each with a measured contrast partner. Dark mode redefines THESE, and only these.',
  },
] as const;

/** The public contract. The private rows are counted and named, never listed. */
const PUBLIC = THEMING_TOKENS.filter((row) => row.visibility === 'public');
const PRIVATE_COUNT = THEMING_TOKENS.length - PUBLIC.length;
const COMPONENT_TIER = PUBLIC.filter((row) => row.tier === 'component');

/**
 * The three tiers told, then shown: the full public inventory from the tracked snapshot.
 *
 * **The page taught two moves in 324 px and then printed 486 variables in 18 251** — 86% of
 * itself, alphabetically, every one of them already documented on its own component's page
 * under *Parts to select, tokens to override* (4.34). Nothing is deleted, because the public
 * tier IS the contract and a contract you have to visit 34 pages to read is a worse page and
 * not a shorter one. What changed is that it can be reached: the two moves come first and
 * side by side, the three tiers have addresses and a bar that says which one the reader is
 * in, the finder the gallery ships filters all 536 by name, and the component tier is folded
 * into 28 groups — one per component, by the prefix the snapshot already states, each
 * carrying its count and the link to the page that says what those dials paint.
 *
 * What this page refuses to draw is a swatch beside a colour token: the snapshot carries a
 * name and a type, not a value, and a value differs by theme. A page must not print a
 * measurement it does not have — the rule the mutation tile broke on all thirty-four
 * component pages for three days.
 *
 * The examples are apps/docs/src/snippets/theme-pin.html.txt and
 * apps/docs/src/snippets/theme-scope.html.txt, highlighted by the content pass (named in
 * full — a generated lookup reaches no file by itself, req-project-reach).
 */
@Component({
  selector: 'docs-theming',
  imports: [DocsBar, DocsFinder, RouterLink, PctContainer, PctStack],
  templateUrl: './theming.html',
  styleUrl: './theming.scss',
})
export class ThemingPage {
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    describePage(
      'Three DTCG token tiers, contrast-checked on both themes at build — retheme one variable or a whole scope; dark mode is a data attribute.',
    );

    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() =>
      spyOnSections(document, destroyRef, (id) => this.active.set(id)),
    );
  }

  protected readonly total = PUBLIC.length;
  protected readonly privateCount = PRIVATE_COUNT;
  protected readonly componentCount = COMPONENT_TIER.length;
  protected readonly groupCount = new Set(COMPONENT_TIER.map((r) => r.owner))
    .size;

  protected readonly pin = this.snippet('theme-pin');
  protected readonly scope = this.snippet('theme-scope');

  protected readonly query = signal('');
  protected readonly active = signal<string | null>(null);

  /** One rule for all three tiers: a token is found by the string a reader would type. */
  private readonly matching = computed(() => {
    const needle = asNeedle(this.query());
    return needle ? PUBLIC.filter((row) => row.name.includes(needle)) : PUBLIC;
  });

  /** Whether the reader is narrowing — which is also what opens the groups. */
  protected readonly narrowing = computed(() => asNeedle(this.query()) !== '');

  protected readonly tiers = computed(() =>
    TIERS.map((tier) => ({
      ...tier,
      tokens: this.matching().filter((row) => row.tier === tier.tier),
    })),
  );

  /**
   * The 28 groups, biggest first — `date` carries 58 dials and `grid` two, and a list that
   * opens with the surfaces a retheme actually spends its time on says more than one that
   * opens with `accordion`. Six of the thirty-four cards are absent from here on purpose:
   * they carry no dials of their own and their pages say so.
   */
  protected readonly groups = computed<readonly TokenGroup[]>(() => {
    const byOwner = new Map<string, TokenRow[]>();
    for (const row of this.matching()) {
      if (row.tier !== 'component' || !row.owner) continue;
      const list = byOwner.get(row.owner) ?? [];
      list.push(row);
      byOwner.set(row.owner, list);
    }
    return [...byOwner.entries()]
      .map(([id, tokens]) => ({ id, tokens }))
      .sort(
        (a, b) => b.tokens.length - a.tokens.length || (a.id < b.id ? -1 : 1),
      );
  });

  protected readonly componentShown = computed(() =>
    this.groups().reduce((n, group) => n + group.tokens.length, 0),
  );

  protected readonly shown = computed(() => this.matching().length);

  /** The bar counts what is on the page now, so a chip never points at an empty tier. */
  protected readonly bands = computed<readonly DocsBand[]>(() =>
    [
      ...this.tiers().map((tier) => ({
        slug: tier.slug,
        label: tier.name,
        count: tier.tokens.length,
      })),
      {
        slug: 'component',
        label: 'Component',
        count: this.componentShown(),
      },
    ].filter((band) => band.count > 0),
  );

  protected onQuery(typed: string): void {
    this.query.set(typed);
  }

  private snippet(name: string) {
    return this.sanitizer.bypassSecurityTrustHtml(SNIPPET_CODE[name] ?? '');
  }
}
