import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  // `src/generated/` is what `content` writes (tools/build-content.mjs). It is gitignored, so
  // Nx leaves it out of this target's hash, but ESLint does not read .gitignore and linted
  // whatever the tree held when it started — and nothing orders this target after `content`.
  // Measured 2026-09-30 with a rule failing every .ts/.mjs/.js file, one hash: 124 errors in a
  // fresh tree, 129 once `content` had run, and 124 again when one `nx run-many` started both
  // at once, as CI's `nx affected` line did the same day. Only a green pass is cached, so a hit
  // could replay a fresh tree's pass over modules that would have failed it.
  //
  // Ignored rather than tied to `content` (`dependsOn` plus its outputs as inputs), because
  // the five modules hold nothing for lint to catch: data and one URL helper under a
  // do-not-edit header, no import, no decorator, not one finding from the 85 rules that reach
  // them. A finding would be fixed in the generator, which this target lints already
  // (tools/*.mjs). The edge would re-run this target on every lesson, card or snapshot
  // `content` reads, each pass about 2 s slower. What the site takes from them, `build`
  // checks: it depends on `content` and hashes its outputs.
  {
    ignores: ['src/generated/**'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          // `app` — the shell (app-root); `docs` — the site's own pieces (pages,
          // the future demo frames). The same split the sandbox draws with `sbx`.
          prefix: ['app', 'docs'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          // `app` — the shell (app-root); `docs` — the site's own pieces (pages).
          // `demo` — the one deliberate exception (0062): a demo file doubles as the
          // page's published snippet, and `demo-button` is what a reader should copy,
          // not this site's internal namespace.
          prefix: ['app', 'docs', 'demo'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    rules: {},
  },
];
