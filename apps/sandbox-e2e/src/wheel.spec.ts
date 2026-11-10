import { expect, Locator, Page, test } from '@playwright/test';
import { visit } from './support/dom';

const listOf = (page: Page, testId: string): Locator =>
  page.getByTestId(testId).getByRole('listbox');

/**
 * The row whose centre is nearest the middle of the band, and whether it RESTS there — to
 * within a pixel. This is the wheel's one promise jsdom has no way to hear: the unit spec
 * reads the number `scrollTo` was called with, and only an engine says what that number put
 * on the screen — the snap, the spacers before the first row, the three turns of a ring.
 */
function underLine(
  page: Page,
  testId: string,
): Promise<{ label: string; rests: boolean }> {
  return page.getByTestId(testId).evaluate((host) => {
    const middle = (element: Element): number => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const line = middle(host.querySelector('[data-pct-part="band"]')!);
    let label = '';
    let off = Infinity;
    for (const row of host.querySelectorAll('[data-pct-part="option"]')) {
      const distance = Math.abs(middle(row) - line);
      if (distance < off) {
        off = distance;
        label = row.textContent!.trim();
      }
    }
    return { label, rests: off < 1 };
  });
}

/** A turn of a mouse's wheel over the rows, by a number of rows. */
async function turn(page: Page, list: Locator, rows: number): Promise<void> {
  const row = await list.evaluate(
    (element) => (element.firstElementChild as HTMLElement).offsetHeight,
  );
  await list.hover();
  await page.mouse.wheel(0, rows * row);
}

test.describe('PctWheel — a listbox on the platform’s scroll', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/wheel');
  });

  test('opens with the chosen row resting on the line, and the opening writes nothing', async ({
    page,
  }) => {
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Wednesday', rests: true });
    await expect
      .poll(() => underLine(page, 'wheel-hour'))
      .toEqual({ label: '09', rests: true });
    await expect
      .poll(() => underLine(page, 'wheel-minute'))
      .toEqual({ label: '30', rests: true });

    // With no value the line holds the first row — and it is not the value.
    await expect
      .poll(() => underLine(page, 'wheel-unset'))
      .toEqual({ label: 'Monday', rests: true });
    await expect(page.getByTestId('unset-value')).toHaveText('—');
    await expect(page.getByTestId('day-value')).toHaveText('wed');
    await expect(page.getByTestId('clock-value')).toHaveText('9:30');
  });

  test('the wheel is as tall as its rows, and shows no scrollbar', async ({
    page,
  }) => {
    // The size is the height of a row; `rows` is how many of them show.
    await expect(listOf(page, 'wheel-sm')).toHaveCSS('height', '84px');
    await expect(listOf(page, 'wheel-md')).toHaveCSS('height', '160px');
    await expect(listOf(page, 'wheel-lg')).toHaveCSS('height', '252px');

    await expect
      .poll(() =>
        listOf(page, 'wheel-day').evaluate(
          (list: HTMLElement) => list.offsetWidth - list.clientWidth,
        ),
      )
      .toBe(0);
  });

  test('a reader is given one listbox and each row once — the copies of a ring are not its', async ({
    page,
  }) => {
    const hour = page.getByTestId('wheel-hour');

    await expect(
      hour.getByRole('listbox', { name: 'Hour' }),
    ).toHaveAttribute('aria-activedescendant', /-option-9$/);
    await expect(hour.getByRole('option')).toHaveCount(24);
    await expect(hour.locator('[data-pct-part="option"]')).toHaveCount(72);
    await expect(hour.getByRole('option', { selected: true })).toHaveText('09');
  });

  test('a key moves the line, the row becomes the value, and the scroll follows', async ({
    page,
  }) => {
    const list = listOf(page, 'wheel-day');
    const value = page.getByTestId('day-value');

    await list.focus();
    await page.keyboard.press('ArrowDown');
    await expect(value).toHaveText('thu');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Thursday', rests: true });

    // Saturday cannot be chosen: the arrow passes over it.
    await page.keyboard.press('ArrowDown');
    await expect(value).toHaveText('fri');
    await page.keyboard.press('ArrowDown');
    await expect(value).toHaveText('sun');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Sunday', rests: true });

    await page.keyboard.press('Home');
    await expect(value).toHaveText('mon');
    await page.keyboard.press('t');
    await expect(value).toHaveText('tue');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Tuesday', rests: true });
  });

  test('the keyboard’s ring is drawn on the band, not on the list the mask would cut', async ({
    page,
  }) => {
    const wheel = page.getByTestId('wheel-day');
    const list = listOf(page, 'wheel-day');

    // Reached by the keyboard, from the wheel after it: the ring is drawn for a keyboard.
    await listOf(page, 'wheel-unset').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(list).toBeFocused();

    await expect(wheel.locator('[data-pct-part="band"]')).toHaveCSS(
      'outline-style',
      'solid',
    );
    await expect(list).toHaveCSS('outline-style', 'none');
  });

  test('a click on a row chooses it and brings it to the line; a refused row takes no click', async ({
    page,
  }) => {
    const wheel = page.getByTestId('wheel-day');
    const value = page.getByTestId('day-value');

    await wheel.getByRole('option', { name: 'Friday' }).click();
    await expect(value).toHaveText('fri');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Friday', rests: true });

    // `force`: Playwright itself refuses to click what says `aria-disabled`.
    await wheel.getByRole('option', { name: 'Saturday' }).click({ force: true });
    await wheel.getByRole('option', { name: 'Thursday' }).click();
    await expect(value).toHaveText('thu');
  });

  test('a turn of the mouse’s wheel: the row the scroll settles on becomes the value', async ({
    page,
  }) => {
    const list = listOf(page, 'wheel-day');
    const value = page.getByTestId('day-value');

    await turn(page, list, 2);
    await expect(value).toHaveText('fri');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Friday', rests: true });

    // One row on is Saturday, which cannot be chosen: the wheel goes on to Sunday, and the
    // line follows it there.
    await turn(page, list, 1);
    await expect(value).toHaveText('sun');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Sunday', rests: true });
  });

  test('a value the page writes travels to the line and is not written back', async ({
    page,
  }) => {
    const value = page.getByTestId('day-value');

    await page.getByTestId('write-fri').click();
    await expect(value).toHaveText('fri');
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Friday', rests: true });

    await page.getByTestId('write-mon').click();
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Monday', rests: true });
    // The settle of the wheel's own scroll is no gesture: the value is still the page's.
    await expect(value).toHaveText('mon');
  });

  test.describe('a ring', () => {
    /** Which of the three turns the scroll rests on — `1` is the middle one. */
    const turnOf = (page: Page, testId: string, count: number) =>
      listOf(page, testId).evaluate((list: HTMLElement, rows: number) => {
        const row = (list.firstElementChild as HTMLElement).offsetHeight;
        return Math.floor(Math.round(list.scrollTop / row) / rows);
      }, count);

    test('the keys come round at the ends, and the scroll is put back on the middle turn', async ({
      page,
    }) => {
      const list = listOf(page, 'wheel-hour');
      const value = page.getByTestId('clock-value');

      await list.focus();
      await page.keyboard.press('Home');
      await expect(value).toHaveText('0:30');
      await page.keyboard.press('ArrowUp');
      await expect(value).toHaveText('23:30');

      // 23 is one row before 00: the wheel travels that one row, onto the turn before the
      // middle one, and the settle puts it back by a whole turn — the same row on the line.
      await expect.poll(() => turnOf(page, 'wheel-hour', 24)).toBe(1);
      await expect
        .poll(() => underLine(page, 'wheel-hour'))
        .toEqual({ label: '23', rests: true });

      await page.keyboard.press('ArrowDown');
      await expect(value).toHaveText('0:30');
      await expect.poll(() => turnOf(page, 'wheel-hour', 24)).toBe(1);
      await expect
        .poll(() => underLine(page, 'wheel-hour'))
        .toEqual({ label: '00', rests: true });
    });

    test('a turn of the mouse’s wheel past the end of the rows goes on from the start', async ({
      page,
    }) => {
      const list = listOf(page, 'wheel-minute');
      const value = page.getByTestId('clock-value');

      // Forty rows on from 30 is 10, on the last of the three turns.
      await turn(page, list, 40);
      await expect(value).toHaveText('9:10');
      await expect.poll(() => turnOf(page, 'wheel-minute', 60)).toBe(1);
      await expect
        .poll(() => underLine(page, 'wheel-minute'))
        .toEqual({ label: '10', rests: true });

      // And forty back is 30 again, by way of the first turn.
      await turn(page, list, -40);
      await expect(value).toHaveText('9:30');
      await expect.poll(() => turnOf(page, 'wheel-minute', 60)).toBe(1);
    });

    test('a click on a copy is a click on the row it copies', async ({
      page,
    }) => {
      const wheel = page.getByTestId('wheel-hour');
      const value = page.getByTestId('clock-value');

      await listOf(page, 'wheel-hour').focus();
      await page.keyboard.press('Home');
      await expect(value).toHaveText('0:30');
      await expect
        .poll(() => underLine(page, 'wheel-hour'))
        .toEqual({ label: '00', rests: true });

      // Above 00 on the line stand 22 and 23 of the turn before the middle one — copies, and
      // the first `23` in the tree is the one on the screen.
      await wheel
        .locator('[data-pct-part="option"][aria-hidden="true"]')
        .filter({ hasText: '23' })
        .first()
        .click();
      await expect(value).toHaveText('23:30');
      await expect(wheel.getByRole('option', { selected: true })).toHaveText(
        '23',
      );
      await expect.poll(() => turnOf(page, 'wheel-hour', 24)).toBe(1);
      await expect
        .poll(() => underLine(page, 'wheel-hour'))
        .toEqual({ label: '23', rests: true });
    });
  });

  test.describe('in a form', () => {
    test('the error waits for the wheel to be left, and a chosen row clears it', async ({
      page,
    }) => {
      const wheel = page.getByTestId('wheel-form');
      const list = wheel.getByRole('listbox', { name: 'Delivery day' });

      await expect(list).toHaveAttribute('aria-required', 'true');
      await expect(list).not.toHaveAttribute('aria-invalid');
      await expect(wheel.getByRole('alert')).toHaveCount(0);

      await list.focus();
      await list.blur();
      await expect(wheel.getByRole('alert')).toHaveText('Pick a day');
      await expect(list).toHaveAttribute('aria-invalid', 'true');
      await expect(list).toHaveAccessibleDescription('Pick a day');

      await list.focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByTestId('form-value')).toHaveText('tue');
      await expect(wheel.getByRole('alert')).toHaveCount(0);
      await expect(list).not.toHaveAttribute('aria-invalid');
    });

    test('inside pct-field the wrapper names and describes the listbox', async ({
      page,
    }) => {
      const list = page
        .getByTestId('field-day')
        .getByRole('listbox', { name: 'Delivery day' });

      await expect(list).toHaveAccessibleDescription('Drawn by the wrapper');
      await expect(
        page.getByTestId('wheel-in-field').getByRole('option', {
          selected: true,
        }),
      ).toHaveText('Tuesday');
    });
  });

  test.describe('a wheel that does not turn', () => {
    test('disabled: out of the tab order, and its rows do not scroll', async ({
      page,
    }) => {
      const list = listOf(page, 'wheel-disabled');

      await expect(list).toHaveAttribute('tabindex', '-1');
      await expect(list).toHaveAttribute('aria-disabled', 'true');
      await expect(list).toHaveCSS('overflow-y', 'hidden');
      await expect
        .poll(() => underLine(page, 'wheel-disabled'))
        .toEqual({ label: 'Tuesday', rests: true });
    });

    test('read-only: a tab stop that takes no key and no click', async ({
      page,
    }) => {
      const wheel = page.getByTestId('wheel-readonly');
      const list = listOf(page, 'wheel-readonly');

      await expect(list).toHaveAttribute('aria-readonly', 'true');
      await expect(list).toHaveCSS('overflow-y', 'hidden');

      await list.focus();
      await expect(list).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await wheel.getByRole('option', { name: 'Friday' }).click();

      await expect(
        wheel.getByRole('option', { selected: true }),
      ).toHaveText('Thursday');
    });
  });
});

/**
 * How the wheel's own travel is asked for — `smooth` or `instant` — is the one thing about
 * it no assertion on the resting state can tell apart, so the call itself is recorded.
 */
test.describe('PctWheel — the travel follows the motion axis', () => {
  async function record(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const calls: (string | undefined)[] = [];
      (window as unknown as { wheelTravels: typeof calls }).wheelTravels =
        calls;
      const scrollTo = Element.prototype.scrollTo;
      Element.prototype.scrollTo = function (
        this: Element,
        ...args: unknown[]
      ) {
        if (this.closest('[data-testid="wheel-day"]'))
          calls.push((args[0] as ScrollToOptions | undefined)?.behavior);
        return (scrollTo as (...a: unknown[]) => void).apply(this, args);
      };
    });
  }

  const travels = (page: Page) =>
    page.evaluate(
      () =>
        (window as unknown as { wheelTravels: (string | undefined)[] })
          .wheelTravels,
    );

  test('the opening is a placement; a written value travels', async ({
    page,
  }) => {
    await record(page);
    await visit(page, '/wheel');
    await expect.poll(() => travels(page)).toEqual(['instant']);

    await page.getByTestId('write-fri').click();
    await expect.poll(() => travels(page)).toEqual(['instant', 'smooth']);
  });

  test('with reduced motion the written value is placed too', async ({
    page,
  }) => {
    await record(page);
    await visit(page, '/wheel', { media: { reducedMotion: 'reduce' } });
    await expect.poll(() => travels(page)).toEqual(['instant']);

    await page.getByTestId('write-fri').click();
    await expect.poll(() => travels(page)).toEqual(['instant', 'instant']);
    await expect
      .poll(() => underLine(page, 'wheel-day'))
      .toEqual({ label: 'Friday', rests: true });
  });
});
