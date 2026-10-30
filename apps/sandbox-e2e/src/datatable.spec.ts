import { expect, Locator, Page, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * What three engines are asked here: the accessibility tree of a table built from data — a
 * caption naming a table, column headers, a sort button in each sortable one — then the
 * order by keyboard and by Shift, the quick filter and its count, the empty state standing
 * outside the table, the loading state, a switch in a cell that does not sort its column, the
 * live rows that keep the focus in a switch while their values change, the sticky header, and
 * `scrollTo` with what the table reads back from its frame.
 */
test.describe('PctDataTable — the first layer drawn from data', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const rules = (page: Page) => page.getByTestId('table-rules');
  const names = (table: Locator) => table.locator('tbody tr td:first-child');

  test('the caption names the table, every column has a header, and sortable headers are buttons', async ({
    page,
  }) => {
    const table = page.getByRole('table', { name: 'Polling rules' });
    await expect(table).toHaveCount(1);
    await expect(table.getByRole('columnheader')).toHaveCount(6);
    await expect(table.getByRole('row')).toHaveCount(21);
    for (const name of ['Name', 'Room', 'Address', 'Energy', 'Next run'])
      await expect(
        table.getByRole('button', { name, exact: true }),
      ).toHaveCount(1);
    await expect(
      table.getByRole('columnheader', { name: 'Enabled' }).getByRole('button'),
    ).toHaveCount(0);
  });

  test('the keyboard sorts by one key, Space turns it, and Shift+Enter adds a second marked by its place', async ({
    page,
  }) => {
    const table = rules(page);
    await table.getByRole('button', { name: 'Room', exact: true }).focus();
    await page.keyboard.press('Enter');
    const room = table.getByRole('columnheader', { name: 'Room' });
    await expect(room).toHaveAttribute('aria-sort', 'ascending');
    await expect(table.locator('tbody tr td:nth-child(2)').first()).toHaveText(
      'Bathroom',
    );
    await page.keyboard.press('Space');
    await expect(room).toHaveAttribute('aria-sort', 'descending');
    await page.keyboard.press('Space');
    await expect(room).toHaveAttribute('aria-sort', 'ascending');

    await page.keyboard.press('Shift+Tab');
    await expect(
      table.getByRole('button', { name: 'Name', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Shift+Enter');
    const name = table.locator('th', { hasText: 'Name' });
    await expect(name.locator('[data-pct-part="place"]')).toHaveText('2▲');
    // The place is drawn for the eye: the button's name stays the label.
    await expect(
      table.getByRole('button', { name: 'Name', exact: true }),
    ).toHaveCount(1);
    await expect(table.locator('[aria-sort]')).toHaveCount(1);
    const bathrooms = await table
      .locator('tbody tr', {
        has: page.locator('td:nth-child(2)', { hasText: 'Bathroom' }),
      })
      .locator('td:first-child')
      .allTextContents();
    expect(bathrooms).toEqual(
      [...bathrooms].sort((a, b) => a.localeCompare(b, 'pl')),
    );
  });

  test('Tab moves from the sort buttons into the controls in the cells', async ({
    page,
  }) => {
    const table = rules(page);
    await table.getByRole('button', { name: 'Next run', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(table.getByRole('switch').first()).toBeFocused();
  });

  test('the filter keeps the rows every word is found in, and the count follows', async ({
    page,
  }) => {
    const table = rules(page);
    await page.getByTestId('rules-filter').fill('kitchen');
    await expect(page.getByTestId('rules-count')).not.toHaveText('20 of 20');
    const kitchens = await table.locator('tbody tr').count();
    expect(kitchens).toBeGreaterThan(0);
    expect(kitchens).toBeLessThan(20);
    await expect(page.getByTestId('rules-count')).toHaveText(
      `${kitchens} of 20`,
    );
    for (const room of await table
      .locator('tbody tr td:nth-child(2)')
      .allTextContents())
      expect(room.trim()).toBe('Kitchen');
  });

  test('a filter that leaves nothing says so beside the table, not in it', async ({
    page,
  }) => {
    const table = rules(page);
    await page.getByTestId('rules-filter').fill('nothing like this');
    await expect(table.locator('tbody tr')).toHaveCount(0);
    await expect(table.locator('[data-pct-part="message"]')).toHaveText(
      'No matches',
    );
    await expect(
      table.getByRole('table').locator('[data-pct-part="message"]'),
    ).toHaveCount(0);
  });

  test('an empty table says it has no rows, and a loading one is busy with hidden placeholders', async ({
    page,
  }) => {
    await expect(
      page.getByTestId('table-empty').locator('[data-pct-part="message"]'),
    ).toHaveText('No rows');
    const loading = page.getByTestId('table-loading');
    await expect(loading.locator('tbody')).toHaveAttribute('aria-busy', 'true');
    await expect(
      loading.locator('tr[data-pct-part="placeholder"]'),
    ).toHaveCount(5);
    await expect(loading.getByRole('row')).toHaveCount(1);
    await expect(loading.locator('[data-pct-part="message"]')).toHaveText(
      'Loading…',
    );
  });

  test('a switch in a cell toggles its row and keeps the order', async ({
    page,
  }) => {
    const table = rules(page);
    await table.getByRole('button', { name: 'Name', exact: true }).click();
    await expect(table.locator('[aria-sort]')).toHaveCount(1);
    const before = await names(table).allTextContents();
    const first = table.getByRole('switch').first();
    const was = await first.getAttribute('aria-checked');
    await first.click();
    await expect(first).not.toHaveAttribute('aria-checked', was ?? '');
    await expect(table.locator('[aria-sort]')).toHaveCount(1);
    expect(await names(table).allTextContents()).toEqual(before);
  });

  test('live rows change their values and keep the focus in a switch', async ({
    page,
  }) => {
    const table = page.getByTestId('table-live');
    const energy = table.locator('tbody tr').first().locator('td:nth-child(4)');
    const target = table.getByRole('switch').nth(1);
    await target.focus();
    await expect(target).toBeFocused();
    const before = await energy.textContent();
    await expect(energy).not.toHaveText(before ?? '', { timeout: 5000 });
    await expect(target).toBeFocused();
  });

  test('the header row stays at the top of a table given a height', async ({
    page,
  }) => {
    const table = rules(page);
    const frame = table.locator('pct-table-frame');
    await frame.evaluate((element) => element.scrollTo({ top: 300 }));
    await expect
      .poll(() => frame.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(250);
    const offset = await table
      .locator('thead th')
      .first()
      .evaluate((th) => {
        const box = th.closest('pct-table-frame') as HTMLElement;
        return th.getBoundingClientRect().top - box.getBoundingClientRect().top;
      });
    expect(Math.abs(offset)).toBeLessThanOrEqual(1);
  });

  test('scrollTo brings a row below the sticky header, and the table reads its frame back', async ({
    page,
  }) => {
    const table = rules(page);
    const frame = table.locator('pct-table-frame');
    await page.getByTestId('rules-reveal').click();
    const last = table.locator('tbody tr').last();
    await expect(last).toBeInViewport();
    const gap = await last.evaluate((tr) => {
      const head = (tr.closest('table') as HTMLTableElement)
        .tHead as HTMLElement;
      return (
        tr.getBoundingClientRect().top - head.getBoundingClientRect().bottom
      );
    });
    expect(gap).toBeGreaterThanOrEqual(-1);
    const top = await frame.evaluate((element) => element.scrollTop);
    expect(top).toBeGreaterThan(0);
    await expect(page.getByTestId('rules-view')).toContainText(
      `scrolled ${top} px`,
    );
    await expect(page.getByTestId('rules-view')).not.toContainText(
      'In view: 0 rows',
    );
  });

  test('the filter marks the words it found, in the cells it read them in', async ({
    page,
  }) => {
    const table = rules(page);
    await page.getByTestId('rules-filter').fill('kitch');
    const rooms = table.locator('tbody tr td:nth-child(2)');
    await expect(rooms.first().locator('mark')).toHaveText('Kitch');
    const count = await table.locator('tbody tr').count();
    await expect(rooms.locator('mark')).toHaveCount(count);
    await expect(rooms.first()).toHaveText('Kitchen');
    await expect(table.locator('tbody tr td:first-child mark')).toHaveCount(0);
  });

  test('striped rows numbered from 1, a toned row and toned cells', async ({
    page,
  }) => {
    const table = page.getByTestId('table-devices');
    // The eye sees a number sign, a reader hears the word.
    await expect(
      table.getByRole('columnheader', { name: 'Row', exact: true }),
    ).toHaveCount(1);
    await expect(
      table.locator('thead th').first().locator('[aria-hidden="true"]'),
    ).toHaveText('#');
    await expect(table.locator('tbody tr td:first-child')).toHaveText([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    const surface = (row: number) =>
      table
        .locator('tbody tr')
        .nth(row)
        .evaluate((tr) => getComputedStyle(tr).backgroundColor);
    // The second row is striped and the first is not; the third wears the danger tone.
    expect(await surface(1)).not.toBe(await surface(0));
    await expect(table.locator('tbody tr').nth(2)).toHaveAttribute(
      'data-pct-tone',
      'danger',
    );
    expect(await surface(2)).not.toBe(await surface(0));
    expect(await surface(2)).not.toBe(await surface(1));
    // A state is toned by its value: the word says it, the tint repeats it.
    const motion = table.locator('tbody tr').nth(3);
    await expect(motion.locator('td').nth(2)).toHaveText('Offline');
    await expect(motion.locator('td').nth(2)).toHaveAttribute(
      'data-pct-tone',
      'warning',
    );
    await expect(motion.locator('td').nth(3)).not.toHaveAttribute(
      'data-pct-tone',
      /.*/,
    );
    // The pointer tints the row under it.
    const resting = await surface(0);
    await table.locator('tbody tr').first().hover();
    await expect.poll(() => surface(0)).not.toBe(resting);
  });

  test('a long name is cut to one line, and shows whole under the pointer', async ({
    page,
  }) => {
    const table = page.getByTestId('table-devices');
    const long = table.locator('tbody tr').nth(1).locator('td').nth(1);
    const clip = long.locator('.pct-data-table__clip');
    const cut = await clip.evaluate(
      (span) => span.scrollWidth > span.clientWidth,
    );
    expect(cut).toBe(true);
    await clip.hover();
    await expect(long).toHaveAttribute(
      'title',
      'Window contact, the bedroom’s south window by the wardrobe',
    );
    const short = table.locator('tbody tr').first().locator('td').nth(1);
    await short.locator('.pct-data-table__clip').hover();
    await expect(short).not.toHaveAttribute('title', /.*/);
    // A column's own tooltip stands on every cell.
    await expect(
      table.locator('tbody tr').first().locator('td').nth(4),
    ).toHaveAttribute('title', 'Supply fan, Attic');
  });

  test('a live value that changed flashes, and the flash is the motion token’s', async ({
    page,
  }) => {
    const table = page.getByTestId('table-live');
    await expect(table.locator('td[data-pct-changed]').first()).toBeAttached({
      timeout: 5000,
    });
    const duration = async () =>
      table
        .locator('tbody td')
        .first()
        .evaluate((td) => {
          td.setAttribute('data-pct-changed', '');
          const seconds = parseFloat(getComputedStyle(td).animationDuration);
          td.removeAttribute('data-pct-changed');
          return seconds;
        });
    expect(await duration()).toBeGreaterThan(0.5);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await duration()).toBeLessThan(0.001);
  });

  test('a narrow table hides the columns of the highest priority, and its details list them', async ({
    page,
  }) => {
    const table = page.getByTestId('table-details');
    const state = page.getByTestId('details-state');
    const frame = table.locator('pct-table-frame');
    const fits = () =>
      frame.evaluate((element) => {
        const inner = element.querySelector('table') as HTMLElement;
        return inner.scrollWidth <= element.clientWidth;
      });
    await page.getByTestId('width-1200').click();
    await expect(state).toContainText('Hidden: none');
    await page.getByTestId('width-360').click();
    await expect(state).not.toContainText('Hidden: none');
    await expect.poll(fits).toBe(true);
    const hidden = ((await state.textContent()) ?? '')
      .match(/Hidden: ([^.]*)\./)?.[1]
      .split(', ') as string[];
    expect(hidden.length).toBeGreaterThan(0);
    // The columns with no priority never give way.
    await expect(
      table.getByRole('columnheader', { name: 'Name', exact: true }),
    ).toHaveCount(1);
    await expect(
      table.getByRole('columnheader', { name: 'Enabled', exact: true }),
    ).toHaveCount(1);

    const disclosure = table.locator('[data-pct-part="disclosure"]').first();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const details = table.locator('tr[data-pct-part="details"]');
    await expect(details).toHaveCount(1);
    await expect(disclosure).toHaveAttribute(
      'aria-controls',
      (await details.getAttribute('id')) as string,
    );
    await expect(details.locator('dt')).toHaveCount(hidden.length);
    await expect(state).toContainText('Open: 1.');

    // Wider again, the columns come back and the details list nothing.
    await page.getByTestId('width-1200').click();
    await expect(state).toContainText('Hidden: none');
    await expect(details.locator('dl')).toHaveCount(0);
  });

  test('Tab goes from a row’s disclosure to its controls, into its details, then on to the next row', async ({
    page,
  }) => {
    const table = page.getByTestId('table-details');
    const disclosure = table.locator('[data-pct-part="disclosure"]');
    await disclosure.first().click();
    await expect(disclosure.first()).toBeFocused();
    await page.keyboard.press('Tab');
    const toggle = table.getByRole('switch', { name: 'Enabled: Supply fan' });
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      table.getByRole('button', { name: 'Run Supply fan now' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(disclosure.nth(1)).toBeFocused();
    // A switch in an open row still answers.
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-checked', before ?? '');
    await expect(table.locator('tr[data-pct-part="details"]')).toHaveCount(1);
  });

  test('rules by room: a body per room, a rowgroup header on each, a second level, collapsed and opened', async ({
    page,
  }) => {
    const table = page.getByTestId('table-groups');
    const bodies = table.locator('tbody');
    const headings = table.locator('tr[data-pct-part="group"]');
    const count = await headings.count();
    expect(count).toBeGreaterThan(1);
    await expect(bodies).toHaveCount(count);
    await expect(
      table.locator('tr[data-pct-part="group"] > th[scope="rowgroup"]'),
    ).toHaveCount(count);
    // Each heading's button names the group, its state in aria-expanded.
    const first = headings.first().getByRole('button');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    const rowsIn = (body: number) =>
      bodies.nth(body).locator('tr:not([data-pct-part])');
    const before = await rowsIn(0).count();
    expect(before).toBeGreaterThan(0);
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await expect(rowsIn(0)).toHaveCount(0);
    await expect(page.getByTestId('groups-state')).not.toContainText(
      'Collapsed: none',
    );
    await first.click();
    await expect(rowsIn(0)).toHaveCount(before);

    await page.getByTestId('groups-levels').click();
    await expect(headings).not.toHaveCount(count);
    await page.getByTestId('groups-collapse').click();
    await expect(headings).toHaveCount(count);
    await expect(table.locator('tbody tr:not([data-pct-part])')).toHaveCount(0);
    await page.getByTestId('groups-expand').click();
    await expect(table.locator('tbody tr:not([data-pct-part])')).toHaveCount(
      12,
    );
  });

  test('the foot sums the energy of every rule in view, and a group heading its own', async ({
    page,
  }) => {
    const table = page.getByTestId('table-groups');
    const number = (text: string) =>
      Number(text.replace(/[^\d,]/g, '').replace(',', '.'));
    const energies = await table
      .locator('tbody tr:not([data-pct-part]) td:nth-child(3)')
      .allTextContents();
    const sum = energies.reduce((total, text) => total + number(text), 0);
    const foot = await table.locator('tfoot td').nth(1).textContent();
    expect(number(foot ?? '')).toBeCloseTo(sum, 1);
    const firstBody = table.locator('tbody').first();
    const inGroup = await firstBody
      .locator('tr:not([data-pct-part]) td:nth-child(3)')
      .allTextContents();
    const heading = await firstBody
      .locator('tr[data-pct-part="group"] td')
      .nth(1)
      .textContent();
    expect(number(heading ?? '')).toBeCloseTo(
      inGroup.reduce((total, text) => total + number(text), 0),
      1,
    );
  });
  test('rules to move: a checkbox per row named by its rule, and one over them all', async ({
    page,
  }) => {
    const table = page.getByRole('table', { name: 'Rules to move' });
    await expect(table.getByRole('checkbox')).toHaveCount(21);
    await expect(
      table.getByRole('checkbox', { name: 'Select all rows', exact: true }),
    ).toHaveCount(1);
    await expect(
      table.getByRole('checkbox', { name: 'Select Supply fan', exact: true }),
    ).toHaveCount(1);
    // The table is described by the hint until something else takes its line.
    await expect(table).toHaveAccessibleDescription(
      'Pick the rules to move to the new controller.',
    );
  });

  test('the keyboard picks a row, Shift with a press picks the rows between, and the header reads clear, mixed and checked', async ({
    page,
  }) => {
    const table = page.getByTestId('table-selection');
    const all = table.getByRole('checkbox', {
      name: 'Select all rows',
      exact: true,
    });
    const mixed = () =>
      all.evaluate((input) => (input as HTMLInputElement).indeterminate);
    const state = page.getByTestId('selection-state');
    expect(await mixed()).toBe(false);
    await expect(all).not.toBeChecked();
    const heater = table.getByRole('checkbox', {
      name: 'Select Heater',
      exact: true,
    });
    await heater.focus();
    await page.keyboard.press('Space');
    await expect(heater).toBeChecked();
    await expect(state).toContainText('Picked: 2.');
    expect(await mixed()).toBe(true);
    await expect(heater.locator('xpath=ancestor::tr')).toHaveAttribute(
      'data-pct-selected',
      '',
    );
    await table
      .getByRole('checkbox', { name: 'Select Boiler', exact: true })
      .click({ modifiers: ['Shift'] });
    await expect(state).toContainText('Picked: 2 3 4 5.');
    await all.click();
    await expect(all).toBeChecked();
    expect(await mixed()).toBe(false);
    await all.click();
    await expect(state).toContainText('Picked: none.');
  });

  test('the error stands under the table once the column is left empty, and goes with the first pick', async ({
    page,
  }) => {
    const table = page.getByTestId('table-selection');
    const element = table.getByRole('table');
    const first = table.getByRole('checkbox', {
      name: 'Select Supply fan',
      exact: true,
    });
    await expect(table.getByRole('alert')).toHaveCount(0);
    // Tab between the rows stays in the column; Tab past the last row leaves it.
    await first.focus();
    await page.keyboard.press('Tab');
    await expect(table.locator('[data-pct-part="error"]')).toHaveCount(0);
    await table
      .getByRole('checkbox', { name: 'Select Blinds 2', exact: true })
      .focus();
    await page.keyboard.press('Tab');
    const error = table.locator('[data-pct-part="error"]');
    await expect(error).toHaveText('Pick at least one rule to move');
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(element).toHaveAccessibleDescription(
      'Pick at least one rule to move',
    );
    await expect(first).toHaveAttribute('aria-invalid', 'true');
    await expect(first).toHaveAccessibleDescription(
      'Pick at least one rule to move',
    );
    await first.click();
    await expect(error).toHaveCount(0);
    await expect(element).toHaveAccessibleDescription(
      'Pick the rules to move to the new controller.',
    );
  });

  test('a press with Shift on the edge of a checkbox’s target picks the range too', async ({
    page,
  }) => {
    const table = page.getByTestId('table-selection');
    await table
      .getByRole('checkbox', { name: 'Select Heater', exact: true })
      .click();
    // The label is the target; a press on its corner is forwarded to the checkbox.
    await table
      .locator('tbody tr')
      .nth(4)
      .locator('.pct-data-table__target')
      .click({ position: { x: 1, y: 1 }, modifiers: ['Shift'] });
    await expect(page.getByTestId('selection-state')).toContainText(
      'Picked: 2 3 4 5.',
    );
  });

  test('more than ten rules warn and let the form through', async ({
    page,
  }) => {
    const table = page.getByTestId('table-selection');
    await table
      .getByRole('checkbox', { name: 'Select all rows', exact: true })
      .click();
    const warning = table.locator('[data-pct-part="warning"]');
    await page.getByTestId('selection-move').click();
    await expect(warning).toHaveAttribute('role', 'status');
    await expect(warning).toContainText(
      'More than ten rules — the move takes a while',
    );
    await expect(table.getByRole('table')).toHaveAccessibleDescription(
      /More than ten rules/,
    );
    await expect(page.getByTestId('selection-state')).toContainText(
      'Moved: 1 2 3',
    );
  });

  test('a rule the filter hides stays picked, the header counts the rows left, and a change of the rows keeps the picks', async ({
    page,
  }) => {
    const table = page.getByTestId('table-selection');
    const state = page.getByTestId('selection-state');
    await table
      .getByRole('checkbox', { name: 'Select Supply fan', exact: true })
      .click();
    await page.getByTestId('selection-filter').fill('Heater');
    await expect(table.locator('tbody tr')).toHaveCount(2);
    const all = table.getByRole('checkbox', {
      name: 'Select all rows',
      exact: true,
    });
    await expect(all).not.toBeChecked();
    await all.click();
    await expect(state).toContainText('Picked: 1 2 12.');
    await page.getByTestId('selection-filter').fill('');
    // The rules table writes new rows: the ids picked stay, and so do their checks.
    await page.getByTestId('table-rules').getByRole('switch').first().click();
    await expect(state).toContainText('Picked: 1 2 12.');
    await expect(
      table.getByRole('checkbox', { name: 'Select Supply fan', exact: true }),
    ).toBeChecked();
  });

  test('one rule to copy: radios in one group, the arrows move the pick', async ({
    page,
  }) => {
    const table = page.getByTestId('table-single');
    await expect(table.getByRole('checkbox')).toHaveCount(0);
    const radios = table.getByRole('radio');
    await expect(radios).toHaveCount(12);
    const bypass = table.getByRole('radio', {
      name: 'Select Bypass',
      exact: true,
    });
    await expect(bypass).toBeChecked();
    await bypass.focus();
    await page.keyboard.press('ArrowDown');
    await expect(
      table.getByRole('radio', { name: 'Select Exhaust fan', exact: true }),
    ).toBeChecked();
    await expect(page.getByTestId('single-state')).toHaveText('Copied: 4.');
  });
});

/**
 * The window over a hundred thousand registers and a million, in three engines: how many rows
 * it draws, what it tells a reader, where the last row is, that a scroll up through rows of
 * two heights moves what is read by the scroll alone, that the columns keep their widths, and
 * that the live values keep the focus and the scroll.
 */
test.describe('PctTableWindow — a hundred thousand registers', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const registers = (page: Page) => page.getByTestId('table-registers');
  const frameOf = (table: Locator) =>
    table.locator(':scope > pct-table-frame');

  /** Two frames: what a scroll writes has been measured and drawn by then. */
  const settle = (page: Page) =>
    page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => requestAnimationFrame(() => done())),
          ),
        ),
    );

  const choose = async (page: Page, count: number) => {
    await page.getByTestId(`registers-${count}`).click();
    await expect(registers(page).locator('table')).toHaveAttribute(
      'aria-rowcount',
      String(count + 1),
    );
    await settle(page);
  };

  /** The row stands whole in the frame's view, below the sticky header. */
  const expectInFrame = async (frame: Locator, row: Locator) => {
    await expect
      .poll(() =>
        row.evaluate((tr, element) => {
          const box = tr.getBoundingClientRect();
          const view = (element as HTMLElement).getBoundingClientRect();
          const head = (
            (element as HTMLElement).querySelector('thead') as HTMLElement
          ).getBoundingClientRect().bottom;
          return box.top >= head - 1 && box.bottom <= view.bottom + 1;
        }, await frame.elementHandle()),
      )
      .toBe(true);
  };

  /** The row at the top of the view, under the sticky header, and where it stands. */
  const atTop = (frame: Locator) =>
    frame.evaluate((element) => {
      const head = (element.querySelector('thead') as HTMLElement)
        .getBoundingClientRect().bottom;
      const row = Array.from(
        element.querySelectorAll<HTMLElement>('tbody tr'),
      ).find((tr) => tr.getBoundingClientRect().bottom > head + 1);
      if (!row) throw new Error('no row under the header');
      return {
        index: row.dataset['pctIndex'] as string,
        y: row.getBoundingClientRect().top,
      };
    });

  test('draws the rows its frame shows, tells a reader the count, and reaches the last row', async ({
    page,
  }) => {
    await choose(page, 100_000);
    const table = registers(page);
    const frame = frameOf(table);
    const drawn = table.locator('tbody tr');
    await expect.poll(() => drawn.count()).toBeLessThanOrEqual(60);
    expect(await drawn.count()).toBeGreaterThan(5);
    await expect(table.locator('thead tr')).toHaveAttribute(
      'aria-rowindex',
      '1',
    );
    await expect(drawn.first()).toHaveAttribute('aria-rowindex', '2');
    // The scrollbar is the whole list's: a hundred thousand rows of the height most rows have,
    // and every twenty-fifth one taller.
    const { height, scroll } = await frame.evaluate((element) => {
      const heights = Array.from(element.querySelectorAll('tbody tr'))
        .map((tr) => tr.getBoundingClientRect().height)
        .sort((a, b) => a - b);
      return {
        height: heights[Math.floor(heights.length / 2)],
        scroll: element.scrollHeight,
      };
    });
    expect(scroll).toBeGreaterThan(100_000 * height * 0.99);
    expect(scroll).toBeLessThan(100_000 * height * 1.1);
    // A jump to the end draws the last row, numbered as ARIA counts the rows.
    await frame.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const last = table.locator('tbody tr').last();
    await expect(last).toHaveAttribute('aria-rowindex', '100001');
    await expect(last.locator('td').first()).toHaveText('140000');
    await expectInFrame(frame, last);
  });

  test('a scroll up through rows of two heights moves what is on screen by the scroll, and no more', async ({
    page,
  }) => {
    await choose(page, 100_000);
    const frame = frameOf(registers(page));
    await frame.evaluate((element) => {
      element.scrollTop = element.scrollHeight / 2;
    });
    await settle(page);
    for (let step = 0; step < 30; step++) {
      const before = await atTop(frame);
      await frame.evaluate((element) => {
        element.scrollTop -= 200;
      });
      await settle(page);
      const y = await frame
        .locator(`tbody tr[data-pct-index="${before.index}"]`)
        .evaluate((tr) => tr.getBoundingClientRect().top);
      expect(Math.abs(y - before.y - 200)).toBeLessThanOrEqual(1);
    }
  });

  test('the columns keep the widths of the first frame, wherever the frame stands', async ({
    page,
  }) => {
    await choose(page, 100_000);
    const frame = frameOf(registers(page));
    const widths = () =>
      frame.evaluate((element) =>
        Array.from(element.querySelectorAll('thead th')).map(
          (th) => th.getBoundingClientRect().width,
        ),
      );
    const first = await widths();
    for (const at of [0.5, 1]) {
      await frame.evaluate((element, share) => {
        element.scrollTop = element.scrollHeight * share;
      }, at);
      await settle(page);
      const now = await widths();
      now.forEach((width, c) =>
        expect(Math.abs(width - first[c])).toBeLessThanOrEqual(0.5),
      );
    }
  });

  test('a million rows: the space under the tallest box, the last row reached, the middle in the middle', async ({
    page,
  }) => {
    await choose(page, 1_000_000);
    const table = registers(page);
    const frame = frameOf(table);
    const { scroll, client } = await frame.evaluate((element) => ({
      scroll: element.scrollHeight,
      client: element.clientHeight,
    }));
    expect(scroll).toBeLessThanOrEqual(16_000_000 + 200);
    expect(scroll).toBeGreaterThan(15_000_000);
    await frame.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(table.locator('tbody tr').last()).toHaveAttribute(
      'aria-rowindex',
      '1000001',
    );
    await frame.evaluate(
      (element, top) => {
        element.scrollTop = top;
      },
      (scroll - client) / 2,
    );
    await settle(page);
    const first = Number((await atTop(frame)).index);
    expect(Math.abs(first - 500_000)).toBeLessThanOrEqual(5_000);
    // `scrollTo` reaches a row the window has not drawn.
    await frame.evaluate((element) => {
      element.scrollTop = 0;
    });
    await settle(page);
    await page.getByTestId('registers-last').click();
    await expectInFrame(
      frame,
      table.locator('tbody tr[aria-rowindex="1000001"]'),
    );
  });

  test('live values on a hundred thousand rows keep the focus in a switch, and the scroll', async ({
    page,
  }) => {
    await choose(page, 100_000);
    await page.getByTestId('registers-live').getByRole('switch').click();
    const table = registers(page);
    const frame = frameOf(table);
    await frame.evaluate((element) => {
      element.scrollTop = 40_000 * 40;
    });
    await settle(page);
    const top = await frame.evaluate((element) => element.scrollTop);
    const row = table.locator('tbody tr').nth(10);
    const value = row.locator('td').nth(2);
    const was = await value.textContent();
    const toggle = row.getByRole('switch');
    await toggle.focus();
    const name = await toggle.getAttribute('aria-label');
    await expect.poll(() => value.textContent(), { timeout: 6000 }).not.toBe(
      was,
    );
    await expect(
      table.getByRole('switch', { name: name as string, exact: true }),
    ).toBeFocused();
    expect(
      Math.abs(
        (await frame.evaluate((element) => element.scrollTop)) - top,
      ),
    ).toBeLessThanOrEqual(1);
  });
});
