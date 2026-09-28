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
    // `act()` is this reader's Enter under Guidepup's own name (`keyCodeCommands.activate`),
    // kept for symmetry with VoiceOver, where the two differ and the difference is the whole
    // opening. The `pressed` this reader answered at eight of nine acts on 2026-09-16 and at
    // five on 2026-09-28 was never the key's doing: the walk had Tabbed out of the page, and
    // the key followed the window (`lesson-245`). The methods are listed one by one because
    // they live on a PROTOTYPE — a spread of this object carries the fields and leaves
    // `press` and `spokenPhraseLog` behind.
    {
      spokenPhraseLog: () => nvda.spokenPhraseLog(),
      press: (key: string) => nvda.press(key),
      navigateToWebContent: () => nvda.navigateToWebContent(),
      activate: () => nvda.act(),
    },
    'tmp/at/nvda-firefox-windows.steps.json',
    'NVDA with Firefox on Windows',
    routesAsked(),
  );
});
