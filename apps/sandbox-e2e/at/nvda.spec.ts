import { nvdaTest as test } from '@guidepup/playwright';
import { routesAsked, walk } from './walk';

/**
 * NVDA with Firefox on Windows — one of the two readers `docs/acr/claims.json` declares and
 * that no machine here can run. It has never run: the first `workflow_dispatch` of
 * `at-pass.yml` is its first test as much as its first reading.
 */
test('NVDA reads the sandbox views', async ({ page, nvda }) => {
  await walk(
    page,
    nvda,
    'tmp/at/nvda-firefox-windows.steps.json',
    'NVDA with Firefox on Windows',
    routesAsked(),
  );
});
