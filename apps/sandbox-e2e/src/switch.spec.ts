import { expect, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';
import { styleOf } from './support/css';

test.describe('PctSwitch — a setting that takes effect at once', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/switch');
  });

  test('a click on the label toggles the state and paints the track from a token', async ({
    page,
  }) => {
    const host = page.getByTestId('switch-backups');
    const control = host.locator('input');
    const track = host.locator('[data-pct-part="track"]');
    // Inside the wrapper it is pct-field that renders the label.
    const label = page
      .getByTestId('field-backups')
      .locator('[data-pct-part="field-label"]');

    await expect(control).not.toBeChecked();
    await expect(track).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await label.click();

    await expect(control).toBeChecked();
    // --pct-switch-track-bg-checked -> --pct-primary -> blue-600
    await expect(track).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  });

  /**
   * The whole of decision 0039, measured where it can be wrong: in a page a browser really
   * parsed. `role="switch"` sits on the native `<input type="checkbox">`, the checked state
   * comes from the element's own checkedness, and **no `aria-checked` is written** — the
   * attribute would be a second source of truth that no engine reads
   * ([`lesson-112`](../../../docs/lessons.md#lesson-112)).
   */
  test('the control is a switch whose state is its own checkedness, with no aria-checked', async ({
    page,
  }) => {
    const control = page.getByTestId('switch-wifi').locator('input');

    await expect(control).toHaveAttribute('role', 'switch');
    await expect(control).not.toHaveAttribute('aria-checked', /.*/);
    await expect(control).toBeChecked();

    // The accessible tree computed off the DOM: a switch, and it is on. Nothing in the
    // template says so — the platform does.
    await expect(page.getByTestId('switch-wifi')).toMatchAriaSnapshot(`
      - switch "Wi-Fi" [checked]
    `);

    await control.click();

    await expect(control).not.toBeChecked();
    await expect(control).not.toHaveAttribute('aria-checked', /.*/);
    await expect(page.getByTestId('switch-wifi')).toMatchAriaSnapshot(`
      - switch "Wi-Fi"
    `);
  });

  test('Space toggles it — the key map is the platform’s', async ({ page }) => {
    const control = page.getByTestId('switch-wifi').locator('input');

    await control.focus();
    await expect(control).toBeChecked();

    await page.keyboard.press('Space');
    await expect(control).not.toBeChecked();

    await page.keyboard.press('Space');
    await expect(control).toBeChecked();
  });

  test('the clickable area is at least 24x24 px (WCAG 2.2 SC 2.5.8)', async ({
    page,
  }) => {
    const host = page.getByTestId('switch-wifi');
    const hit = await boxOf(host.locator('input'));
    const track = await boxOf(host.locator('[data-pct-part="track"]'));

    // Met outright rather than through the spacing exception — and, unlike the checkbox,
    // without a hit zone larger than the drawing: the floor sits on the TRACK, so the area
    // a finger gets is the area an eye sees, less the 1 px border it is inset by.
    expect(hit.width).toBeGreaterThanOrEqual(24);
    expect(hit.height).toBeGreaterThanOrEqual(24);
    expect(track.width - hit.width).toBeLessThanOrEqual(2);
    expect(track.height - hit.height).toBeLessThanOrEqual(2);
  });

  /**
   * The knob is the one part of the switch that looks like the thing to press, and it was the
   * one part that did nothing: it is painted OVER the transparent control, so a pointer put
   * on it landed on a decoration and reached no input — measured with `elementFromPoint` at
   * the knob's centre before the fix, which answered `thumb` and left the state where it was
   * ([`lesson-158`](../../../docs/lessons.md#lesson-158)). Pressed by coordinates on purpose:
   * a locator click on the thumb would refuse an element that takes no pointer events, and
   * what is being measured is what a finger gets, not what a test runner allows.
   */
  test('a press on the knob itself toggles the state — the thumb lets the pointer through', async ({
    page,
  }) => {
    const host = page.getByTestId('switch-wifi');
    const control = host.locator('input');
    const thumb = host.locator('[data-pct-part="thumb"]');
    await expect(control).toBeChecked();
    expect(await styleOf(thumb, 'pointer-events')).toBe('none');

    const track = host.locator('[data-pct-part="track"]');
    const knob = await boxOf(thumb);
    const box = await boxOf(track);
    // `visit` waits for a stable page, so this knob is at rest at the inline end, and the
    // gap between it and the track's end is the inset it will keep at the other end.
    const inset = box.x + box.width - (knob.x + knob.width);
    await page.mouse.click(knob.x + knob.width / 2, knob.y + knob.height / 2);
    await expect(control).not.toBeChecked();

    // And back, from where the knob has travelled to. The checkedness lands in the click's
    // own task; the knob follows a change detection and a transition later, so one read
    // here can catch it where it was or half-way. What polls is the knob's gap to the
    // track's START against the inset it had at the end: a knob that has not moved stands
    // a whole travel away from it, and one caught in flight part of one
    // ([`lesson-241`](../../../docs/lessons.md#lesson-241)).
    await expect
      .poll(async () =>
        Math.abs((await boxOf(thumb)).x - (await boxOf(track)).x - inset),
      )
      .toBeLessThanOrEqual(1);
    const moved = await boxOf(thumb);
    await page.mouse.click(
      moved.x + moved.width / 2,
      moved.y + moved.height / 2,
    );
    await expect(control).toBeChecked();
  });

  /**
   * The state is the thumb's POSITION, and the position is written with a logical property
   * — so the same declaration mirrors under `dir="rtl"` (`req-token-logical`). Measured as
   * geometry rather than read out of the stylesheet: what a screenshot shows for LTR the
   * numbers have to show for both.
   */
  test('the thumb travels to the inline end, and mirrors in RTL', async ({
    page,
  }) => {
    const host = page.getByTestId('switch-wifi');
    const control = host.locator('input');
    const thumb = host.locator('[data-pct-part="thumb"]');
    const track = host.locator('[data-pct-part="track"]');

    /**
     * Which half of its track the thumb has SETTLED in. Polled rather than read once:
     * the travel is a transition, so a reading taken straight after a click catches the
     * thumb between the two positions — the first draft of this case did exactly that and
     * failed by one pixel.
     */
    const side = async () => {
      const [t, k] = [await boxOf(thumb), await boxOf(track)];
      return t.x > k.x + k.width / 2 ? 'right' : 'left';
    };

    // On, in LTR: the inline end is on the right.
    await expect.poll(side).toBe('right');

    await control.click();
    await expect(control).not.toBeChecked();
    // Off: back to the inline start.
    await expect.poll(side).toBe('left');

    await setRtl(page);
    await control.click();
    await expect(control).toBeChecked();
    // On, in RTL: the same "inline end", which is now on the left. One declaration,
    // both directions — `inset-inline-start` rather than a translation with a sign.
    await expect.poll(side).toBe('left');
  });

  test('readonly keeps focus and refuses the change', async ({ page }) => {
    const control = page.getByTestId('switch-readonly').locator('input');

    await expect(control).toBeChecked();
    await expect(control).toHaveAttribute('aria-readonly', 'true');

    await control.click();
    await expect(control).toBeChecked();

    await control.focus();
    await expect(control).toBeFocused();
  });
});
