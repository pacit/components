import { test } from '@playwright/test';
test('eased progress', async ({ page, browserName }) => {
  await page.setContent('<title>e</title><p>x</p>');
  const r = await page.evaluate(() => {
    const effect = new KeyframeEffect(null, null, { duration: 1000, easing: 'steps(2, end)', fill: 'forwards' });
    const a = new Animation(effect, document.timeline);
    a.pause();
    a.currentTime = 600;
    const steps = effect.getComputedTiming().progress;
    const e2 = new KeyframeEffect(null, null, { duration: 1000, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' });
    const b = new Animation(e2, document.timeline); b.pause(); b.currentTime = 500;
    const bez = e2.getComputedTiming().progress;
    b.currentTime = 1000; const end = e2.getComputedTiming().progress;
    return { steps, bez, end };
  });
  console.log(browserName, JSON.stringify(r));
});
