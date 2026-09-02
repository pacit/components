import { Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PctContainer } from '@pacit/components/container';
import { PctStack } from '@pacit/components/stack';
import { SNIPPET_CODE } from '../../../generated/demo-code';
import { THEMING_TOKENS } from '../../../generated/pages-data';

const TIERS = [
  {
    tier: 'primitive',
    heading: 'Primitives — the raw material',
    tells:
      'Colour ramps, the spacing scale, radii, motion durations. No meaning yet, only values.',
  },
  {
    tier: 'semantic',
    heading: 'Semantic — the meaning',
    tells:
      'Surface, text, primary, danger — the names stylesheets actually read, each with a measured contrast partner. Dark mode redefines THESE, and only these.',
  },
  {
    tier: 'component',
    heading: 'Component — the per-part dials',
    tells:
      'One component, one prefix: override a single control without touching the system.',
  },
] as const;

/**
 * The three tiers told, then shown: the full public inventory from the tracked snapshot.
 * The example is apps/docs/src/snippets/theme.html.txt, highlighted by the content pass
 * (named in full — a generated lookup reaches no file by itself, req-project-reach).
 */
@Component({
  selector: 'docs-theming',
  imports: [PctContainer, PctStack],
  templateUrl: './theming.html',
  styleUrl: './theming.scss',
})
export class ThemingPage {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly example = this.sanitizer.bypassSecurityTrustHtml(
    SNIPPET_CODE['theme'] ?? '',
  );

  protected readonly tiers = computed(() =>
    TIERS.map((tier) => ({
      ...tier,
      tokens: THEMING_TOKENS.filter(
        (row) => row.tier === tier.tier && row.visibility === 'public',
      ),
    })),
  );

  protected readonly privateCount = THEMING_TOKENS.filter(
    (row) => row.visibility === 'private',
  ).length;
}
