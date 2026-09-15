import { voiceOverTest as test } from '@guidepup/playwright';
import { routesAsked, walk } from './walk';

/**
 * VoiceOver with Safari on macOS — the other declared reader. The same caveat as its
 * neighbour: never run, and the first dispatch is the falsification.
 */
test('VoiceOver reads the sandbox views', async ({ page, voiceOver }) => {
  await walk(
    page,
    voiceOver,
    'tmp/at/voiceover-safari-macos.steps.json',
    'VoiceOver with Safari on macOS',
    routesAsked(),
  );
});
