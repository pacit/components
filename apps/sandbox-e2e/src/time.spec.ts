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

/** The listbox of a column drawn as a wheel — the element its keys and its scroll are on. */
const wheelOf = (scope: Locator, field: string) =>
  scope.locator(`pct-wheel[data-pct-field="${field}"] [data-pct-part="list"]`);

/** Whether the row a wheel points at rests on its line — the band drawn behind the list. */
const onLine = (wheel: Locator) =>
  wheel.evaluate((list) => {
    const middle = (element: Element): number => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const row = list.ownerDocument.getElementById(
      list.getAttribute('aria-activedescendant') ?? '',
    );
    const band = list.parentElement?.querySelector('[data-pct-part="band"]');
    return !!row && !!band && Math.abs(middle(row) - middle(band)) < 1;
  });

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
    // Said from where it is drawn: the line is an alert, so a reader hears it as it arrives.
    await expect(error).toHaveAttribute('role', 'alert');
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
   * A column is a window of seven rows — a count, so its middle is a row — and it opens with
   * its chosen row on that middle, not at the top of a list of sixty where the eye would have
   * to go looking for it. The walk keeps its row there, and the snap rests the scroll on a
   * row's start, so no row is cut at either edge wherever the list stands (0089, point 5).
   */
  test('opens with the chosen rows on the middle of seven, and the walk stays there', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-standalone'), 'toggle').click();
    const panel = panelOf(page);
    await expect(columnOf(panel, 'hour')).toBeFocused();
    const placed = (field: string, selector: string) =>
      columnOf(panel, field).evaluate((list, sel) => {
        const row = list.querySelector(sel) as HTMLElement;
        const a = row.getBoundingClientRect();
        const b = list.getBoundingClientRect();
        const turns = list.scrollTop / a.height;
        return {
          rows: Math.round((list.clientHeight / a.height) * 100) / 100,
          inside: a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5,
          centred: Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) < 1,
          whole: Math.abs(turns - Math.round(turns)) < 0.02,
        };
      }, selector);
    // Hour `13` is the fourteenth row and minute `05` the sixth: both can stand on the middle,
    // and both do at once — the opening is placed, not travelled to.
    const all = { rows: 7, inside: true, centred: true, whole: true };
    expect(await placed('hour', '[aria-selected="true"]')).toEqual(all);
    expect(await placed('minute', '[aria-selected="true"]')).toEqual(all);

    // A step on, and the column travels a row to keep the walk on the middle.
    await page.keyboard.press('ArrowDown');
    await expect(inputOf(page, 'time-standalone')).toHaveValue('14:05');
    await expect.poll(() => placed('hour', '[data-pct-active]')).toEqual(all);

    // The last hour cannot be on the middle — the list ends three rows short of that — so the
    // column rests at its end, with the row whole and in view.
    await page.keyboard.press('End');
    await expect(inputOf(page, 'time-standalone')).toHaveValue('23:05');
    await expect
      .poll(() => placed('hour', '[data-pct-active]'))
      .toEqual({ ...all, centred: false });
  });

  /**
   * The keyboard's ring and the chosen row are nearly always one row — every movement writes the
   * value — so the ring there is drawn in the selection's own text colour: the focus ring's blue
   * on the selection's blue is a ring nobody sees. Opened from the keyboard, for `:focus-visible`.
   */
  test('the keyboard’s ring on the chosen row stands out from the row', async ({
    page,
  }) => {
    const toggle = partOf(page.getByTestId('time-standalone'), 'toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    const hour = columnOf(panelOf(page), 'hour');
    await expect(hour).toBeFocused();
    const row = hour.locator('[data-pct-chosen][data-pct-active]');
    await expect(row).toHaveCount(1);
    const paint = await row.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        outline: style.outlineStyle,
        ring: style.outlineColor,
        text: style.color,
        surface: style.backgroundColor,
      };
    });
    expect(paint.outline).toBe('solid');
    expect(paint.ring).toBe(paint.text);
    expect(paint.ring).not.toBe(paint.surface);
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

/**
 * `picker="wheel"`: the same columns, a `PctWheel` each (0089, point 2). What only a browser
 * answers is where the focus goes, whether the row a key asks for arrives under the line, and
 * what a turn of the platform's scroll writes — jsdom scrolls nothing.
 */
test.describe('Time — the panel as wheels', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/time');
  });

  test('opens with a wheel per column, the time on the lines, and focus on the hour wheel', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-wheel'), 'toggle').click();
    const panel = panelOf(page);
    await expect(wheelOf(panel, 'hour')).toBeFocused();
    await expect(panel.locator('[data-pct-part="column"]')).toHaveCount(0);

    // One stop per wheel, and the stop is its listbox — the rows are never stops (0086, E1).
    const stops = await panel.evaluate((root) =>
      [...root.querySelectorAll('button:not(:disabled), [tabindex="0"]')].map(
        (el) =>
          `${el.getAttribute('role')}:${el.closest('pct-wheel')?.getAttribute('data-pct-field')}`,
      ),
    );
    expect(stops).toEqual([
      'listbox:hour',
      'listbox:minute',
      'listbox:dayPeriod',
    ]);
    await expect(panel.locator('[role="option"][tabindex]')).toHaveCount(0);

    for (const [field, label] of [
      ['hour', '1'],
      ['minute', '05'],
      ['dayPeriod', 'PM'],
    ]) {
      const wheel = wheelOf(panel, field);
      expect(await activeIn(wheel)).toBe(label);
      await expect(wheel.locator('[aria-selected="true"]')).toHaveText(label);
      await expect.poll(() => onLine(wheel)).toBe(true);
    }
  });

  /**
   * The keys are the columns' own in both shapes: a wheel left to its own keys would stop at
   * its end where a column comes round, and would not know a typed hour.
   */
  test('the keys are the columns’ own — an arrow comes round, a digit goes to its row, Enter takes the time', async ({
    page,
  }) => {
    const input = inputOf(page, 'time-wheel');
    await partOf(page.getByTestId('time-wheel'), 'toggle').click();
    const panel = panelOf(page);
    const hour = wheelOf(panel, 'hour');
    await expect(hour).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('2:05 PM');
    // The row the key asked for travels to the line.
    await expect.poll(() => onLine(hour)).toBe(true);
    expect(await activeIn(hour)).toBe('2');

    await page.keyboard.press('9');
    await expect(input).toHaveValue('9:05 PM');
    await expect.poll(() => onLine(hour)).toBe(true);

    await page.keyboard.press('Tab');
    const minute = wheelOf(panel, 'minute');
    await expect(minute).toBeFocused();
    await page.keyboard.press('End');
    await expect(input).toHaveValue('9:59 PM');
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('9:00 PM');
    await expect.poll(() => onLine(minute)).toBe(true);

    // Two rows are no ring to turn, and the walk comes round all the same.
    await page.keyboard.press('Tab');
    const period = wheelOf(panel, 'dayPeriod');
    await expect(period).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('9:00 AM');
    await expect.poll(() => onLine(period)).toBe(true);

    await expect(panel).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(input).toHaveValue('9:00 AM');
    await expect(input).toBeFocused();
  });

  /**
   * The wheel's own way in: the platform's scroll, read where it settles. The row the settle
   * leaves under the line is written as a key's would be, and the panel stays open.
   */
  test('a turn settles on a row and writes it, and the panel stays open', async ({
    page,
  }) => {
    const input = inputOf(page, 'time-wheel');
    await partOf(page.getByTestId('time-wheel'), 'toggle').click();
    const panel = panelOf(page);
    await expect(wheelOf(panel, 'hour')).toBeFocused();

    const minute = wheelOf(panel, 'minute');
    const row = await minute.evaluate(
      (list) => (list.firstElementChild as HTMLElement).offsetHeight,
    );
    await minute.hover();
    await page.mouse.wheel(0, 3 * row);
    await expect(input).toHaveValue('1:08 PM');
    await expect.poll(() => onLine(minute)).toBe(true);
    expect(await activeIn(minute)).toBe('08');
    await expect(panel).toBeVisible();
    // The hour was not turned, and was not moved.
    expect(await activeIn(wheelOf(panel, 'hour'))).toBe('1');
  });

  test('a row outside the bounds is said refused, and the walk passes it over', async ({
    page,
  }) => {
    const input = inputOf(page, 'time-wheel-bounded');
    await partOf(page.getByTestId('time-wheel-bounded'), 'toggle').click();
    const panel = panelOf(page);
    const hour = wheelOf(panel, 'hour');
    await expect(hour).toBeFocused();

    // Twenty-four hours are a ring — the cycle three times in the tree, one of them a reader's
    // — and four quarters are shorter than the window, so they are a list.
    await expect(hour.locator('[role="option"]')).toHaveCount(72);
    await expect(
      hour.locator('[role="option"]:not([aria-hidden="true"])'),
    ).toHaveCount(24);
    await expect(
      hour.locator(
        '[role="option"][aria-disabled="true"]:not([aria-hidden="true"])',
      ),
    ).toHaveCount(15);
    await expect(
      wheelOf(panel, 'minute').locator('[role="option"]'),
    ).toHaveCount(4);

    await page.keyboard.press('End');
    await expect(input).toHaveValue('17:00');
    await expect.poll(() => onLine(hour)).toBe(true);
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('09:00');
    await expect.poll(() => onLine(hour)).toBe(true);
  });

  test('Tab walks the wheels, one stop each, and then comes back to the field', async ({
    page,
  }) => {
    await partOf(page.getByTestId('time-wheel-bounded'), 'toggle').click();
    const panel = panelOf(page);
    await expect(wheelOf(panel, 'hour')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(wheelOf(panel, 'minute')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(inputOf(page, 'time-wheel-bounded')).toBeFocused();
  });

  test('the columns on their own are wheels too, and a press on a row takes it', async ({
    page,
  }) => {
    const columns = page.getByTestId('time-columns-wheel');
    const hour = wheelOf(columns, 'hour');
    await expect(columns.locator('pct-wheel')).toHaveCount(2);
    await expect(hour.locator('[aria-selected="true"]')).toHaveText('06');
    await expect.poll(() => onLine(hour)).toBe(true);

    await hour
      .locator('[role="option"]:not([aria-hidden="true"])', { hasText: '07' })
      .click();
    await expect(hour.locator('[aria-selected="true"]')).toHaveText('07');
    await expect.poll(() => onLine(hour)).toBe(true);
    await expect(
      wheelOf(columns, 'minute').locator('[aria-selected="true"]'),
    ).toHaveText('30');
  });
});

test.describe('Time — the window', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/time');
  });

  /**
   * The window is a count of rows, the columns' `rows`, so its middle is a row at every size.
   * Before it was a count it was a height, `--pct-time-column-height`, and that token shipped:
   * a skin that wrote it keeps the height it wrote until the token goes, and the height the
   * skin ships it with is read as nobody having written it (`docs/support.md`).
   */
  test('shows the count of rows it is given, and the height a skin wrote before there was a count', async ({
    page,
  }) => {
    const columns = page.getByTestId('time-columns-short');
    const hour = columnOf(columns, 'hour');
    const shown = () =>
      hour.evaluate((list) => {
        const row = list.querySelector('[aria-selected="true"]') as HTMLElement;
        const a = row.getBoundingClientRect();
        const b = list.getBoundingClientRect();
        return {
          rows: Math.round((b.height / a.height) * 100) / 100,
          height: Math.round(b.height),
          centred: Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) < 1,
        };
      });
    const write = (height: string | null) =>
      columns.evaluate((host, value) => {
        if (value === null)
          host.style.removeProperty('--pct-time-column-height');
        else host.style.setProperty('--pct-time-column-height', value);
      }, height);
    await hour.scrollIntoViewIfNeeded();
    await expect.poll(shown).toEqual({ rows: 5, height: 160, centred: true });

    await write('120px');
    await expect.poll(async () => (await shown()).height).toBe(120);
    await write('300px');
    await expect.poll(async () => (await shown()).height).toBe(300);
    // The height the skin ships: untouched, as far as a stylesheet can tell.
    await write('224px');
    await expect.poll(async () => (await shown()).height).toBe(160);
    await write('96px');
    await expect.poll(async () => (await shown()).height).toBe(96);
    await write(null);
    await expect.poll(async () => (await shown()).rows).toBe(5);
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

  /**
   * A signal form cannot write `min` beside `[formField]` (`NG8022`), and Angular's own `min()`
   * takes a number: `pctTimeBounds` binds the field's own type to the platform's `MIN` / `MAX`,
   * and the directive hands the bounds on. The closing time is bounded by the opening one.
   */
  test('a signal form hands its bounds to the panel, and reports a time typed outside', async ({
    page,
  }) => {
    const closes = page.getByTestId('time-closes');
    await partOf(closes, 'toggle').click();
    await expect(
      columnOf(panelOf(page), 'hour').locator(
        '[role="option"]:not([aria-disabled])',
      ),
    ).toHaveText([
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
    ]);
    await page.keyboard.press('Escape');

    const input = inputOf(page, 'time-closes');
    await input.fill('07:30');
    await input.blur();
    await expect(input).toHaveValue('07:30');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    const field = page.getByTestId('demo-form-bounds').locator('pct-field');
    await expect(partOf(field.nth(1), 'field-error')).toHaveText(
      'It cannot close before it opens',
    );
  });
});

/**
 * The round trip over the thirty-eight locales 0086 measured the hour cycle over (C1), read in
 * THIS engine's `Intl`. The unit suite runs the same sweep in node, whose ICU is not the
 * browsers' — node writes a narrow space before a day period where all three write a plain one
 * (D4), chromium writes Burmese and Nepali in the browser's default locale (C5), webkit writes
 * Korean's day periods `AM` and `PM` (D2) — so a field that reads back node's text proves
 * nothing about the text a reader is shown. The four times are the field's own check before
 * use: the first hour, noon, a two-digit hour on a twelve-hour clock and an afternoon, with
 * seconds (`locale.ts`). The list is the unit suite's, written out again because the e2e
 * project compiles none of the library's sources.
 */
const SWEEP = [
  'en-US',
  'en-GB',
  'pl-PL',
  'de-DE',
  'fr-FR',
  'fi-FI',
  'da-DK',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'ar-EG',
  'hi-IN',
  'th-TH',
  'my-MM',
  'fa-IR',
  'he-IL',
  'zh-TW',
  'en-IN',
  'en-CA',
  'fr-CA',
  'es-ES',
  'es-MX',
  'pt-BR',
  'ru-RU',
  'tr-TR',
  'vi-VN',
  'bn-BD',
  'mr-IN',
  'ta-IN',
  'ur-PK',
  'nb-NO',
  'sv-SE',
  'it-IT',
  'nl-NL',
  'el-GR',
  'en-AU',
  'ne-NP',
  'ar-SA',
] as const;

test.describe('Time — the round trip in this engine', () => {
  test('every language 0086 measured reads back what it writes', async ({
    page,
  }) => {
    // Three hundred and four fills and blurs, each a round trip to the page: about twenty
    // seconds on a quiet desk, and past the default thirty in firefox beside other work. The
    // limit is the case's size, not a wait for anything to settle.
    test.setTimeout(180_000);
    await visit(page, '/time');
    const select = page.getByTestId('time-sweep-locale');
    const input = inputOf(page, 'time-sweep');
    const value = page.getByTestId('time-sweep-value');
    // Every language of the sweep is in the select, and nothing else: the page's list and this
    // one are two copies, and a copy that drifted would sweep a set nobody chose.
    expect(
      await select
        .locator('option')
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        ),
    ).toEqual([...SWEEP]);

    const misses: string[] = [];
    for (const locale of SWEEP) {
      await select.selectOption(locale);
      for (const time of ['00:00:00', '12:00:00', '10:26:47', '19:58:39']) {
        await input.fill(time);
        await input.blur();
        await expect(value).toHaveText(time);
        const written = await input.inputValue();
        await input.fill(written);
        await input.blur();
        const read = await value.textContent();
        if (read !== time || (await input.inputValue()) !== written)
          misses.push(`${locale} ${time}: wrote "${written}", read "${read}"`);
      }
    }
    expect(misses).toEqual([]);
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
