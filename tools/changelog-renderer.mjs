#!/usr/bin/env node
/**
 * The CHANGELOG renderer of `nx release` (decision 0079): the first entry is a measurement,
 * every later one the conventional list Nx renders by itself.
 *
 *  1. FIRST: told by `release.mjs` (`PCT_FIRST_RELEASE=1`), the entry says what the package
 *     IS — cards, gates, the changes since the first commit by type — and where it lives,
 *     not the ~150 commit titles the whole history would render as,
 *  2. LATER: every other release goes through Nx's own renderer, the list as it renders it,
 *  3. MEASURED: every number is read at render time — `docs/components/`, `tools/check-*.mjs`,
 *     `apps/docs/public/CNAME` — never typed here,
 *  4. FORMATTED: the entry is what prettier writes, so `format:check` reads the release commit
 *     as green — Nx's double spaces made the push run after `0.2.0` red (lesson-243).
 *
 * Reached by `nx release` alone (`tools.policy.json`), through `nx.json`'s
 * `projectChangelogs.renderer`; the GitHub Release carries the same text.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import renderer from 'nx/release/changelog-renderer';
import * as prettier from 'prettier';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = join(ROOT, 'libs/components/CHANGELOG.md');
const DefaultChangelogRenderer = renderer.default ?? renderer;

/**
 * The entry through prettier, with the repository's configuration, as `check-acr` writes its
 * report: `nx format:check` covers the CHANGELOG, and the release commit is the one commit
 * whose renderings nothing formats before they are pushed. Nx prepends the entry and joins
 * with a blank line of its own, so the trailing newline prettier writes is dropped — the
 * shape Nx's renderer returns.
 */
const format = async (text) =>
  (
    await prettier.format(text, {
      ...((await prettier.resolveConfig(CHANGELOG)) ?? {}),
      parser: 'markdown',
    })
  ).trimEnd();

const cards = () =>
  readdirSync(join(ROOT, 'docs/components')).filter(
    (f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md',
  ).length;
const gates = () =>
  readdirSync(join(ROOT, 'tools')).filter((f) => /^check-.*\.mjs$/.test(f))
    .length + 1; // + libs/components/check-package.mjs
const origin = () =>
  `https://${readFileSync(join(ROOT, 'apps/docs/public/CNAME'), 'utf8').trim()}`;

export default class PctChangelogRenderer extends DefaultChangelogRenderer {
  async render() {
    return format(await this.entry());
  }

  async entry() {
    if (process.env.PCT_FIRST_RELEASE !== '1') return super.render();
    this.preprocessChanges();
    const count = (type) =>
      this.relevantChanges.filter((c) => c.type === type).length;
    const site = origin();
    return [
      this.renderVersionTitle(),
      '',
      `The first public release of \`@pacit/components\`: **${cards()} components** for Angular,`,
      `standalone and zoneless, on signal forms, rendering on the server, themed through design`,
      `tokens — where every promise is held by a gate that runs on every commit.`,
      '',
      `- ${count('feat')} features and ${count('fix')} fixes since the first commit, ` +
        `${this.breakingChanges.length} of them breaking on the way to this shape`,
      `- ${gates()} gates, each with a negative control that proves it can fail — the registry` +
        ` of promise → gate → control is [the trust page](${site}/trust/)`,
      `- every component with its live demos, API, parts, tokens and keyboard map: ` +
        `[${site}/components/](${site}/components/)`,
      `- install: \`npm install @pacit/components\`, then \`ng add @pacit/components\` — ` +
        `[get started](${site}/start/)`,
    ].join('\n');
  }
}
