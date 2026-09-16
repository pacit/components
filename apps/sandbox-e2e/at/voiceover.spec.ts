import { voiceOverTest as test } from '@guidepup/playwright';
import { routesAsked, walk } from './walk';

/**
 * VoiceOver with Safari on macOS — the other declared reader. The same caveat as its
 * neighbour: never run, and the first dispatch is the falsification.
 */
test('VoiceOver reads the sandbox views', async ({ page, voiceOver }) => {
  await walk(
    page,
    // `act()` and not `press('Enter')`: asked with the key, this reader said so in words —
    // "To click this button, press Control-Option-Space" — and opened nothing. Listed
    // method by method because a spread would leave the prototype methods behind.
    {
      spokenPhraseLog: () => voiceOver.spokenPhraseLog(),
      press: (key: string) => voiceOver.press(key),
      navigateToWebContent: () => voiceOver.navigateToWebContent(),
      activate: () => voiceOver.act(),
    },
    'tmp/at/voiceover-safari-macos.steps.json',
    'VoiceOver with Safari on macOS',
    routesAsked(),
  );
});
