import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';
import { firstDurationMs, rootToken, tokenOf } from './support/css';

/**
 * The user's system preferences: reduced motion and the colour scheme.
 *
 * In this project both are TOKENS, not rules added to the stylesheets — the build
 * emits them as `@media` blocks beside the `[data-theme]` blocks. So the tests
 * measure two things at once: that the block activates, and that the effect reaches
 * the component instead of stopping at a variable in `:root`.
 *
 * Emulated through `visit(page, path, { media })` — the reason is in `support/dom.ts`.
 */

/** The gate checks itself: without it a test measures the base values and „passes". */
async function expectMedia(page: Page, query: string, active: boolean) {
  expect(
    await page.evaluate((q) => matchMedia(q).matches, query),
    `the "${query}" emulation did not take — the test would measure the default state`,
  ).toBe(active);
}

test.describe('prefers-reduced-motion', () => {
  const REDUCE = { reducedMotion: 'reduce' } as const;

  /**
   * The reference: with no preference the motion axis MUST stand at its base values.
   * A reduction test that passes even when the media query never took hold watches
   * nothing — only a „before/after" pair makes a measurement of it. That pair found a
   * real problem: in this version of Playwright `test.use({ reducedMotion })` does
   * not reach the context.
   */
  test('with no preference the motion axis stands at its base values', async ({
    page,
  }) => {
    await visit(page, '/button', {
      media: { reducedMotion: 'no-preference' },
    });
    await expectMedia(page, '(prefers-reduced-motion: reduce)', false);

    expect(await rootToken(page, '--pct-motion-transition-duration')).toBe(
      '150ms',
    );
    expect(await rootToken(page, '--pct-motion-loop-duration')).toBe('600ms');
    expect(
      await firstDurationMs(
        page.getByTestId('btn-solid'),
        'transition-duration',
      ),
    ).toBe(150);
  });

  test('the transitions disappear and a continuous indicator only slows down', async ({
    page,
  }) => {
    await visit(page, '/button', { media: REDUCE });
    await expectMedia(page, '(prefers-reduced-motion: reduce)', true);

    // The token axis alone.
    expect(await rootToken(page, '--pct-motion-transition-duration')).toBe(
      '0.01ms',
    );
    expect(await rootToken(page, '--pct-motion-loop-duration')).toBe('1500ms');

    // The effect on the component — a token with no consumer settles nothing.
    expect(
      await firstDurationMs(
        page.getByTestId('btn-solid'),
        'transition-duration',
      ),
    ).toBeLessThan(1);

    // The spinner does NOT stop: stopped, it would no longer say the button is at
    // work. It is to slow down — that is the difference between „less motion" and
    // „less information".
    const spinner = page
      .getByTestId('btn-loading')
      .locator('[data-pct-part="spinner"]');
    expect(await firstDurationMs(spinner, 'animation-duration')).toBe(1500);
  });

  /**
   * A regression against the state from before the motion axis: `prefers-reduced-motion`
   * was a single exception in `button.scss` back then, so the other controls animated
   * their border despite the preference. Since time became a token, one rule is
   * enough — this test makes sure a new component does not quietly fall out of it.
   */
  test('the reduction covers every control, not the button alone', async ({
    page,
  }) => {
    await visit(page, '/states', { media: REDUCE });
    await expectMedia(page, '(prefers-reduced-motion: reduce)', true);

    const idle = page.getByTestId('states-idle');
    const surfaces = {
      'the field row': idle.locator('[data-pct-part="field-row"]').first(),
      'the checkbox box': page
        .getByTestId('idle-checkbox')
        .locator('[data-pct-part="box"]'),
      'the radio circle': page
        .getByTestId('idle-radio')
        .locator('[data-pct-part="circle"]')
        .first(),
      'the list trigger': page
        .getByTestId('idle-select')
        .locator('[data-pct-part="trigger"]'),
    };

    for (const [name, surface] of Object.entries(surfaces)) {
      expect(
        await firstDurationMs(surface, 'transition-duration'),
        `${name} still animates despite prefers-reduced-motion`,
      ).toBeLessThan(1);
    }
  });
});

test.describe('prefers-color-scheme', () => {
  const LIGHT_SURFACE = '#ffffff';
  const DARK_SURFACE = '#0f172a';
  const DARK = { colorScheme: 'dark' } as const;

  test('a page with no explicit theme takes the dark one from the system', async ({
    page,
  }) => {
    await visit(page, '/all', { media: DARK });
    await expectMedia(page, '(prefers-color-scheme: dark)', true);
    // The sandbox `:root` deliberately has no `data-theme` — the theme sits on the shell.
    // That makes it a clean point of reference for the mechanism itself.
    expect(await rootToken(page, '--pct-surface')).toBe(DARK_SURFACE);
  });

  test('with no dark preference :root stays light (the reference)', async ({
    page,
  }) => {
    await visit(page, '/all', { media: { colorScheme: 'light' } });
    await expectMedia(page, '(prefers-color-scheme: dark)', false);
    expect(await rootToken(page, '--pct-surface')).toBe(LIGHT_SURFACE);
  });

  /**
   * The system preference is a DEFAULT, not an order: a subtree with an explicit
   * `data-theme` has to beat it — otherwise an application that deliberately chose
   * the light theme would lose control of it. The sandbox puts the theme on the
   * shell, so one document carries both cases at once: `:root` follows the system
   * and the inside of the shell follows the setting.
   */
  test('an explicit data-theme beats the system preference', async ({
    page,
  }) => {
    await visit(page, '/all', { media: DARK });
    const shell = page.locator('app-root');
    await expect(shell).toHaveAttribute('data-theme', 'light');

    expect(await tokenOf(shell, '--pct-surface')).toBe(LIGHT_SURFACE);
    expect(await rootToken(page, '--pct-surface')).toBe(DARK_SURFACE);
  });

  /**
   * Nesting has to survive automatic dark mode: a dark card in a light shell that
   * stands on a dark system still stands out from its surroundings.
   */
  test('a scoped theme keeps working under automatic dark mode', async ({
    page,
  }) => {
    await visit(page, '/all', { media: DARK });
    const scoped = page.getByTestId('panel-scoped');
    await expect(scoped).toHaveAttribute('data-theme', 'dark');

    expect(await tokenOf(scoped, '--pct-surface')).toBe(DARK_SURFACE);
    expect(await tokenOf(page.locator('app-root'), '--pct-surface')).toBe(
      LIGHT_SURFACE,
    );
  });
});
