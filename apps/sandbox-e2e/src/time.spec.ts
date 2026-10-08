import { expect, Locator, Page, test } from '@playwright/test';
import { attrOf, boxOf, setRtl, visit } from './support/dom';

/**
 * Every case in this file runs with the browser's clock in Kiritimati — UTC+14, the farthest a
 * clock gets from the meridian — and not in whatever timezone the machine happens to be in. A
 * time of day is a wall clock and never an instant (0086), so nothing below may move when the
 * browser stands fourteen hours east of the server that stored the value; a field that wrote its
 * time through a `Date` would read `13:05` back as another hour here, measured where the
 * machine's own timezone would have hidden it (`req-api-time`).
 */
test.use({ timezoneId: 'Pacific/Kiritimati' });

/**
 * The time field and its columns, in a real browser.
 *
 * Every case here is about something jsdom has no answer for: what a browser's own
 * `<input type="time">` would have done instead, where focus really goes when a panel that lives
 * outside the host tree opens, which way the columns stand in a page written right to left, and
 * what a reader's engine writes for a clock — the three browsers write a plain space before a
 * day period where node writes a narrow one (0086, D4), so these readings are the browsers'.
 */

const partOf = (host: Locator, part: string) =>
  host.locator(`[data-pct-part="${part}"]`);

/** The panel is attached to `body`, so it is looked for on the page and not in the host. */
const panelOf = (page: Page) => page.locator('[data-pct-part="panel"]');

const columnOf = (scope: Locator, field: string) =>
  scope.locator(`[data-pct-part="column"][data-pct-field="${field}"]`);

/** The row a column points at — what `aria-activedescendant` names, read as its text. */
const activeIn = (column: Locator) =>
  column.evaluate(
    (list) =>
      list.ownerDocument
        .getElementById(list.getAttribute('aria-activedescendant') ?? '')
        ?.textContent?.trim() ?? null,
  );

const inputOf = (page: Page, id: string) =>
  page.getByTestId(id).locator('input').first();

test.describe('Time — the field', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/time');
  });

  /**
   * The case the decision rests on. `<input type="time">` draws its clock in the browser's
   * interface language in chromium, in its own in firefox and in the browser's locale in webkit
   * — in `lang` in none of them (0086, A1–A3) — so the one thing an application cannot do with
   * it is decide. Here it decides, and the proof is three fields on one page on two clocks, none
   * of them the browser's.
   */
  test('shows the time on the clock of the language the FIELD is in, not the browser', async ({
    page,
  }) => {
    await expect(inputOf(page, 'time-en')).toHaveValue('1:05 PM');
    await expect(inputOf(page, 'time-pl')).toHaveValue('13:05');
    // No `locale` of its own: the application's, which is `fr-FR` here.
    await expect(inputOf(page, 'time-standalone')).toHaveValue('13:05');
  });

  /**
   * The format hint has two owners, as the date's does. The ORDER, the separators and the
   * day-period words come from `Intl` for the FIELD's locale; the letters come from `PCT_TEXTS`
   * for the APPLICATION. The Korean field writes its day period before the hour, in its own
   * words — read here off the field's own text, because webkit writes Korean's two as `AM` and
   * `PM` (0086, D2) and the hint follows the field's formatter wherever it goes.
   */
  test('shows the FORMAT while it is empty — the order per field, the letters per application', async ({
    page,
  }) => {
    const en = inputOf(page, 'time-en');
    await en.fill('');
    await en.blur();
    await expect(en).toHaveAttribute('placeholder', 'h:mm AM/PM');

    await expect(inputOf(page, 'time-standalone')).toHaveAttribute(
      'placeholder',
      'hh:mm',
    );
    await expect(inputOf(page, 'time-seconds')).toHaveAttribute(
      'placeholder',
      'hh:mm:ss',
    );

    const ko = inputOf(page, 'time-ko');
    const written = await ko.inputValue();
    const afternoon = written.slice(0, written.indexOf(' '));
    expect(afternoon).not.toBe('');
    const hint = await attrOf(ko, 'placeholder');
    expect(hint.endsWith(`/${afternoon} h:mm`)).toBe(true);
  });

  /**
   * The other half of the decision: a half-typed native time reads `""` in two engines and
   * chromium reads `130` as `13:00`, a time nobody entered (0086, A5). This control keeps the
   * text and says what it is.
   */
  test('keeps junk in the field and reports it, where a native time input loses it', async ({
    page,
  }) => {
    const host = page.getByTestId('time-standalone');
    const input = inputOf(page, 'time-standalone');

    await input.fill('teatime');
    await input.blur();

    await expect(input).toHaveValue('teatime');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(host).toHaveAttribute('data-pct-malformed', '');
    const error = partOf(host, 'error');
    await expect(error).toHaveText('Pas une heure');
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(error, 'id'),
    );

    // What the platform's own control does with a time it cannot hold, measured on the same
    // page rather than quoted: an empty value and no way back to what was given.
    const native = await page.evaluate(() => {
      const el = document.createElement('input');
      el.type = 'time';
      document.body.append(el);
      el.value = '25:99';
      const value = el.value;
      el.remove();
      return value;
    });
    expect(native).toBe('');
  });

  test('reads back what it writes, in every language on the page', async ({
    page,
  }) => {
    for (const [id, typed, expected] of [
      ['time-pl', '9.05', '09:05'],
      ['time-pl', '1430', '14:30'],
      ['time-en', '905 pm', '9:05 PM'],
      ['time-en', '21:05', '9:05 PM'],
      ['time-standalone', '7h45', '07:45'],
    ] as const) {
      const input = inputOf(page, id);
      await input.fill(typed);
      await input.blur();
      await expect(input).toHaveValue(expected);
    }

    // Korean, in whatever words this engine's own `Intl` writes it — the field agrees with the
    // page rather than with a table (0086, D2).
    const expected = await page.evaluate(() =>
      new Intl.DateTimeFormat('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hourCycle: 'h12',
        timeZone: 'UTC',
      })
        .formatToParts(Date.UTC(1970, 0, 1, 14, 30))
        .map((part) => part.value)
        .join(''),
    );
    const ko = inputOf(page, 'time-ko');
    await ko.fill('14:30');
    await ko.blur();
    await expect(ko).toHaveValue(expected);
  });
});

test.describe('Time — the panel', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/time');
  });

  /**
   * A panel of the kind that TAKES focus (0025), and what takes it is the hour column — a
   * listbox that points at its row rather than moving focus onto it (0032). jsdom can be asked
   * whether the attribute is right; only a browser can be asked where focus went.
   */
  test('opens onto the time the field holds, with focus on the hour', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    await expect(columnOf(panel, 'hour')).toBeFocused();
    expect(await activeIn(columnOf(panel, 'hour'))).toBe('13');
    expect(await activeIn(columnOf(panel, 'minute'))).toBe('05');
    await expect(
      columnOf(panel, 'hour').locator('[aria-selected="true"]'),
    ).toHaveText('13');
  });

  /**
   * A column opens with its chosen row in view — centred, the first time — and not at the top
   * of a list of sixty where the eye would have to go looking for it.
   */
  test('opens with the chosen rows in view', async ({ page }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    // Hour `13` is the fourteenth row, twice the column's window down: a column that did not
    // scroll would open with it out of sight.
    const column = columnOf(panelOf(page), 'hour');
    await expect(column).toBeFocused();
    const row = column.locator('[aria-selected="true"]');
    const inside = await row.evaluate((el) => {
      const list = el.parentElement as HTMLElement;
      const a = el.getBoundingClientRect();
      const b = list.getBoundingClientRect();
      return a.top >= b.top && a.bottom <= b.bottom;
    });
    expect(inside).toBe(true);
  });

  test('says on the button that the panel is open, and takes it back', async ({
    page,
  }) => {
    const toggle = partOf(page.getByTestId('time-standalone'), 'toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await attrOf(toggle, 'aria-controls')).toBe(
      await attrOf(panelOf(page), 'id'),
    );

    await page.keyboard.press('Escape');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes it and hands focus back to the field', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    await expect(columnOf(panelOf(page), 'hour')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(inputOf(page, 'time-standalone')).toBeFocused();
  });

  /**
   * The panel is a child of `body`, so its content stands at the END of the document's tab
   * order however near the field it is drawn. Tab walks the columns and then leaves, spliced
   * back onto the field (0031) — otherwise the next Tab would leave the page.
   */
  test('Tab walks the columns, one stop each, and then comes back to the field', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    const panel = panelOf(page);
    await expect(columnOf(panel, 'hour')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(columnOf(panel, 'minute')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(inputOf(page, 'time-standalone')).toBeFocused();
  });

  test('writes the time it is given and closes', async ({ page }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    // Where the focus IS, asked before a key is pressed: the panel takes it one RENDER after
    // the click, so a key pressed straight after could reach the toggle instead (`lesson-152`).
    await expect(columnOf(panelOf(page), 'hour')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    // A column is a field: the value moves under the key, and the field shows it already.
    await expect(inputOf(page, 'time-standalone')).toHaveValue('14:05');
    await expect(panelOf(page)).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(inputOf(page, 'time-standalone')).toHaveValue('14:05');
    await expect(inputOf(page, 'time-standalone')).toBeFocused();
  });

  test('a press on a row writes it and leaves the panel open for the next column', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    const minute = columnOf(panelOf(page), 'minute');
    await minute.locator('[data-pct-part="option"]', { hasText: '30' }).click();
    await expect(inputOf(page, 'time-standalone')).toHaveValue('13:30');
    await expect(panelOf(page)).toBeVisible();
    await expect(minute).toBeFocused();
  });

  test('a press outside closes it and leaves focus where the press landed', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    await expect(panelOf(page)).toBeVisible();

    await page.locator('h2.view__title').click();
    await expect(panelOf(page)).toHaveCount(0);
    await expect(inputOf(page, 'time-standalone')).not.toBeFocused();
  });

  /**
   * One stop per column, and the stop is the listbox: the rows are options the column points
   * at, never tab stops of their own — 0086's E1, on the panel as built.
   */
  test('the columns are one stop each, the period among them on a twelve-hour clock', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-en'), 'toggle').click();
    const panel = panelOf(page);
    await expect(columnOf(panel, 'hour')).toBeFocused();

    const stops = await panel.evaluate((root) =>
      [...root.querySelectorAll('button:not(:disabled), [tabindex="0"]')].map(
        (el) =>
          `${el.getAttribute('role')}:${el.getAttribute('data-pct-field')}`,
      ),
    );
    expect(stops).toEqual([
      'listbox:hour',
      'listbox:minute',
      'listbox:dayPeriod',
    ]);
    await expect(panel.locator('[role="option"][tabindex]')).toHaveCount(0);
    expect(await activeIn(columnOf(panel, 'dayPeriod'))).toBe('PM');
  });

  test('stands the day period where the language writes it — before the hour in Korean', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-ko'), 'toggle').click();
    const fields = await panelOf(page)
      .locator('[data-pct-part="column"]')
      .evaluateAll((lists) =>
        lists.map((list) => list.getAttribute('data-pct-field')),
      );
    expect(fields).toEqual(['dayPeriod', 'hour', 'minute']);
    // The panel still opens on the hour, wherever the language puts it.
    await expect(columnOf(panelOf(page), 'hour')).toBeFocused();
  });
});

test.describe('Time — the walk', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/time');
  });

  /** A column is a ring and a field: minute 59 comes round to 00 and the hour stays (0086 §4). */
  test('a column comes round at its end and leaves the other columns alone', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    await expect(columnOf(panelOf(page), 'hour')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(columnOf(panelOf(page), 'minute')).toBeFocused();

    await page.keyboard.press('End');
    await expect(inputOf(page, 'time-standalone')).toHaveValue('13:59');
    await page.keyboard.press('ArrowDown');
    await expect(inputOf(page, 'time-standalone')).toHaveValue('13:00');
  });

  test('seconds where the step has them, in the value and in a column of their own', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-seconds'), 'toggle').click();
    const panel = panelOf(page);
    await expect(columnOf(panel, 'hour')).toBeFocused();
    await expect(panel.locator('[data-pct-part="column"]')).toHaveCount(3);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(columnOf(panel, 'second')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(inputOf(page, 'time-seconds')).toHaveValue('13:05:31');
  });
});

test.describe('Time — the bounds and the step', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/time');
  });

  /**
   * The step decides which rows EXIST — the quarters of an hour — and the bounds which of them
   * can be TAKEN: a refused hour is drawn, announced and skipped.
   */
  test('the step lists the quarters, and the walk skips the hours outside the bounds', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-bounded'), 'toggle').click();
    const panel = panelOf(page);
    await expect(columnOf(panel, 'hour')).toBeFocused();

    await expect(
      columnOf(panel, 'minute').locator('[role="option"]'),
    ).toHaveText(['00', '15', '30', '45']);
    await expect(
      columnOf(panel, 'hour').locator('[role="option"]:not([aria-disabled])'),
    ).toHaveText(['09', '10', '11', '12', '13', '14', '15', '16', '17']);

    // From 13:00 to the last hour inside and round to the first, past the refused ones.
    await page.keyboard.press('End');
    await expect(inputOf(page, 'time-bounded')).toHaveValue('17:00');
    await page.keyboard.press('ArrowDown');
    await expect(inputOf(page, 'time-bounded')).toHaveValue('09:00');

    // Playwright's own actionability check reads `aria-disabled` and refuses the row — a third
    // party confirming the state is legible, and the reason the press below is forced.
    const refused = columnOf(panel, 'hour').locator(
      '[role="option"][aria-disabled="true"]',
    );
    await expect(refused.first()).toBeDisabled();
    await refused.first().click({ force: true });
    await expect(inputOf(page, 'time-bounded')).toHaveValue('09:00');
  });

  /** `min` later than `max` is the night between them (0086, A12). */
  test('min later than max is a window across midnight', async ({ page }) => {
    await partOf(page.getByTestId('time-night'), 'toggle').click();
    const hour = columnOf(panelOf(page), 'hour');
    await expect(hour).toBeFocused();
    await expect(
      hour.locator('[role="option"]:not([aria-disabled])'),
    ).toHaveText(['00', '01', '02', '03', '04', '05', '06', '22', '23']);

    await page.keyboard.press('ArrowDown');
    await expect(inputOf(page, 'time-night')).toHaveValue('00:30');
  });

  /** A bound clamps a MOVEMENT, and a time typed in full is not one (0086 §5). */
  test('a time typed outside the bounds or off the step is kept as typed', async ({
    page,
  }) => {
    const input = inputOf(page, 'time-bounded');
    await input.fill('18:05');
    await input.blur();
    await expect(input).toHaveValue('18:05');
    await expect(page.getByTestId('time-bounded')).not.toHaveAttribute(
      'data-pct-malformed',
      '',
    );
  });
});

test.describe('Time — right to left', () => {
  /**
   * The columns stand along the INLINE axis, so a page written right to left draws the first
   * field on the right — with no rule of its own (`req-token-logical`). The keys are about the
   * row above and below, which no direction mirrors.
   */
  test('the columns follow the writing direction, and the keys do not need to', async ({
    page,
  }) => {
    await visit(page, '/time');
    await setRtl(page);
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    const panel = panelOf(page);
    await expect(columnOf(panel, 'hour')).toBeFocused();

    const hour = await boxOf(columnOf(panel, 'hour'));
    const minute = await boxOf(columnOf(panel, 'minute'));
    expect(hour.x).toBeGreaterThan(minute.x);

    await page.keyboard.press('ArrowDown');
    await expect(inputOf(page, 'time-standalone')).toHaveValue('14:05');
  });
});
