import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
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
 * The filters of the columns, in three engines: a button in each header that opens a dialog
 * with the column's control, the five kinds of filter once each — a text, values picked from
 * the rows, a range of numbers, a range of days in the column's zone, and one the application
 * draws — the focus going back to the button, the state written out as JSON, and the row of
 * filters under the headers.
 */
test.describe('PctTableColumnFilters — the rules by their columns', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const table = (page: Page) => page.getByTestId('table-filters');
  const rows = (page: Page) => table(page).locator('tbody tr');
  /** The line under the table: the rows left, and the model as JSON, as a URL would hold it. */
  const state = (page: Page, rows: number, json: string) =>
    expect(page.getByTestId('filters-state')).toHaveText(
      `${rows} of 20 rules · ${json}`,
    );
  const button = (page: Page, column: string) =>
    table(page).getByRole('button', {
      name: new RegExp(`^Filter ${column}(, filtered)?$`),
    });
  const panel = (page: Page, column: string) =>
    page.getByRole('dialog', { name: `Filter ${column}` });

  test('a header’s button opens its filter, a text keeps the rows it is found in, and Escape goes back to the button', async ({
    page,
  }) => {
    const name = button(page, 'Name');
    await expect(name).toHaveAccessibleName('Filter Name');
    await expect(name).toHaveAttribute('aria-expanded', 'false');
    await name.click();
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    const dialog = panel(page, 'Name');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Name' }).fill('fan');
    await expect(rows(page)).toHaveCount(4);
    for (const text of await table(page)
      .locator('tbody tr td:first-child')
      .allTextContents())
      expect(text.toLowerCase()).toContain('fan');
    await state(page, 4, '{"name":{"text":"fan"}}');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(name).toBeFocused();
    await expect(name).toHaveAccessibleName('Filter Name, filtered');
  });

  test('Clear lets every row back, and stands disabled while nothing filters', async ({
    page,
  }) => {
    await button(page, 'Name').click();
    const dialog = panel(page, 'Name');
    const clear = dialog.getByRole('button', { name: 'Clear' });
    await expect(clear).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Name' }).fill('heater');
    await expect(rows(page)).toHaveCount(2);
    await clear.click();
    await expect(rows(page)).toHaveCount(20);
    // The press disabled the button it was on: the focus is in the field again.
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
    await state(page, 20, '{}');
    await expect(clear).toBeDisabled();
  });

  test('a room picked from the values the rows hold', async ({ page }) => {
    await button(page, 'Room').click();
    const dialog = panel(page, 'Room');
    await dialog.locator('[data-pct-part="trigger"]').click();
    await page
      .locator('[data-pct-part="option"]')
      .filter({ hasText: 'Kitchen' })
      .click();
    await expect(rows(page)).toHaveCount(4);
    for (const room of await table(page)
      .locator('tbody tr td:nth-child(2)')
      .allTextContents())
      expect(room.trim()).toBe('Kitchen');
    await state(page, 4, '{"room":{"values":["Kitchen"]}}');
  });

  test('the energy between two numbers, both of them included', async ({
    page,
  }) => {
    await button(page, 'Energy').click();
    const dialog = panel(page, 'Energy');
    await dialog.getByRole('spinbutton', { name: 'Energy from' }).fill('100');
    await dialog.getByRole('spinbutton', { name: 'Energy to' }).fill('500');
    await dialog.getByRole('spinbutton', { name: 'Energy to' }).blur();
    await state(page, 7, '{"energy":{"from":100,"to":500}}');
    await expect(rows(page)).toHaveCount(7);
  });

  test('the next run by its days, read in the column’s zone', async ({
    page,
  }) => {
    await button(page, 'Next run').click();
    const dialog = panel(page, 'Next run');
    const until = dialog.locator('pct-date').nth(1).locator('input').first();
    // Every run is on 29 October in Warsaw: a day before holds none of them, the day all.
    await until.fill('28/10/2026');
    await until.blur();
    await state(page, 0, '{"nextAt":{"since":null,"until":"2026-10-28"}}');
    await expect(rows(page)).toHaveCount(0);
    await until.fill('29/10/2026');
    await until.blur();
    await expect(rows(page)).toHaveCount(20);
  });

  test('the application draws the address’s filter, and its column decides by it', async ({
    page,
  }) => {
    await button(page, 'Address').click();
    const dialog = panel(page, 'Address');
    const low = dialog.getByRole('button', { name: 'Below 4128' });
    await low.click();
    await expect(low).toHaveAttribute('aria-pressed', 'true');
    await expect(rows(page)).toHaveCount(8);
    await state(page, 8, '{"address":{"own":"low"}}');
  });

  test('a row of filters under the headers, each control named by its column', async ({
    page,
  }) => {
    await expect(table(page).locator('thead tr')).toHaveCount(1);
    await page.getByTestId('filters-row').getByRole('switch').click();
    const row = table(page).locator('thead tr').nth(1);
    await expect(row).toBeVisible();
    await row
      .getByRole('textbox', { name: 'Filter Name', exact: true })
      .fill('lamp');
    await expect(rows(page)).toHaveCount(2);
    // The header's button reads the same state the row wrote.
    await expect(button(page, 'Name')).toHaveAccessibleName(
      'Filter Name, filtered',
    );
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
  const frameOf = (table: Locator) => table.locator(':scope > pct-table-frame');

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
    const handle = await frame.elementHandle();
    await expect
      .poll(() =>
        row.evaluate((tr, element) => {
          const box = tr.getBoundingClientRect();
          const view = (element as HTMLElement).getBoundingClientRect();
          const head = (
            (element as HTMLElement).querySelector('thead') as HTMLElement
          ).getBoundingClientRect().bottom;
          return box.top >= head - 1 && box.bottom <= view.bottom + 1;
        }, handle),
      )
      .toBe(true);
  };

  /** The row at the top of the view, under the sticky header, and where it stands. */
  const atTop = (frame: Locator) =>
    frame.evaluate((element) => {
      const head = (
        element.querySelector('thead') as HTMLElement
      ).getBoundingClientRect().bottom;
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
    // The scroll drew rows past the ten thousandth: five digits of place.
    await expect(row).toHaveAttribute('aria-rowindex', /^\d{5}$/);
    const was = await value.textContent();
    const toggle = row.getByRole('switch');
    await toggle.focus();
    const name = await toggle.getAttribute('aria-label');
    await expect
      .poll(() => value.textContent(), { timeout: 6000 })
      .not.toBe(was);
    await expect(
      table.getByRole('switch', { name: name as string, exact: true }),
    ).toBeFocused();
    expect(
      Math.abs((await frame.evaluate((element) => element.scrollTop)) - top),
    ).toBeLessThanOrEqual(1);
  });
});

test.describe('PctTablePage — registers from a server, a page at a time', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const paged = (page: Page) => page.getByTestId('table-paged');
  const served = (page: Page) => page.getByTestId('paged-served');
  const firstRow = (page: Page) =>
    paged(page).locator('tbody tr[aria-rowindex]').first();

  test('tells a reader each row’s place among every row the server holds', async ({
    page,
  }) => {
    await expect(paged(page).locator('table')).toHaveAttribute(
      'aria-rowcount',
      '1001',
    );
    await expect(firstRow(page)).toHaveAttribute('aria-rowindex', '2');
    await page
      .getByTestId('paged-pages')
      .getByRole('button', { name: '3', exact: true })
      .click();
    // Rows 41 to 60: the first is the 42nd row a reader counts, the header's row first.
    await expect(firstRow(page)).toHaveAttribute('aria-rowindex', '42');
    await expect(firstRow(page)).toContainText('41');
    await expect(paged(page).locator('tbody tr[aria-rowindex]')).toHaveCount(
      20,
    );
  });

  test('asks the server once for a new order, and goes back to the first page', async ({
    page,
  }) => {
    await page
      .getByTestId('paged-pages')
      .getByRole('button', { name: '3', exact: true })
      .click();
    await expect(firstRow(page)).toHaveAttribute('aria-rowindex', '42');
    await expect(served(page)).toHaveText('The server was asked 2 times');
    await paged(page)
      .getByRole('button', { name: 'Name', exact: true })
      .click();
    await expect(paged(page).locator('tbody').first()).not.toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(served(page)).toHaveText('The server was asked 3 times');
    await expect(firstRow(page)).toHaveAttribute('aria-rowindex', '2');
    await expect(
      paged(page).getByRole('columnheader', { name: /Name/ }),
    ).toHaveAttribute('aria-sort', 'ascending');
  });

  test('counts the matches the server found', async ({ page }) => {
    await page.getByTestId('paged-filter').fill('Lamp');
    // A thousand registers name ten devices in turn: a hundred lamps.
    await expect(paged(page).locator('table')).toHaveAttribute(
      'aria-rowcount',
      '101',
    );
    await expect(firstRow(page)).toContainText('Lamp');
  });
});

test.describe('PctTableRemote — a million registers from a server, a block at a time', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const remote = (page: Page) => page.getByTestId('table-remote');
  const frame = (page: Page) => remote(page).locator('pct-table-frame');
  const asked = (page: Page) => page.getByTestId('remote-asked');
  /** How many blocks the server was asked for, as the demo counts them. */
  const askedCount = async (page: Page) =>
    Number(/asked for (\d+)/.exec(await asked(page).innerText())?.[1]);
  const firstRow = (page: Page) =>
    remote(page)
      .locator('tbody tr[aria-rowindex]:not([data-pct-part])')
      .first();
  /** Scrolls the frame to the row `at` of the million, in the window's scaled space. */
  const scrollToRow = (page: Page, at: number) =>
    frame(page).evaluate((element, row) => {
      element.scrollTop =
        ((element.scrollHeight - element.clientHeight) * row) / 1_000_000;
    }, at);

  test('counts every row the server holds from its first answer', async ({
    page,
  }) => {
    await expect(remote(page).locator('table')).toHaveAttribute(
      'aria-rowcount',
      '1000001',
    );
    await expect(firstRow(page)).toContainText('40001');
    await expect(asked(page)).toContainText('1000000 registers');
  });

  test('asks for the few blocks in view far down, and draws them where the scroll stands', async ({
    page,
  }) => {
    await expect(firstRow(page)).toContainText('40001');
    const before = await askedCount(page);
    await scrollToRow(page, 500_000);
    const top = await frame(page).evaluate((element) => element.scrollTop);
    // Holes first, then the rows of the blocks they stand in.
    await expect(
      remote(page).locator('tbody tr[aria-rowindex]:not([data-pct-part])'),
    ).not.toHaveCount(0);
    await expect(
      remote(page).locator('tr[data-pct-part="hole"][aria-busy]'),
    ).toHaveCount(0);
    const row = await firstRow(page).getAttribute('aria-rowindex');
    expect(Number(row)).toBeGreaterThan(450_000);
    expect(Number(row)).toBeLessThan(550_000);
    expect((await askedCount(page)) - before).toBeLessThanOrEqual(3);
    // The rows that came are measured in place of their holes: the scroll moves by what a
    // row and a hole differ in above the view, which keeps the view where it was — no more.
    const after = await frame(page).evaluate((element) => element.scrollTop);
    expect(Math.abs(after - top)).toBeLessThan(40);
  });

  test('starts again at the top under a new order', async ({ page }) => {
    await expect(firstRow(page)).toContainText('40001');
    await scrollToRow(page, 1_000);
    await expect(firstRow(page)).not.toContainText('40001');
    const header = remote(page).getByRole('button', {
      name: 'Address',
      exact: true,
    });
    await header.click();
    await header.click();
    await expect(
      remote(page).getByRole('columnheader', { name: /Address/ }),
    ).toHaveAttribute('aria-sort', 'descending');
    expect(await frame(page).evaluate((element) => element.scrollTop)).toBe(0);
    // The last register first: address 40,000 + a million.
    await expect(firstRow(page)).toContainText('1040000');
    await expect(firstRow(page)).toHaveAttribute('aria-rowindex', '2');
  });

  test('counts the matches of a question the server answered', async ({
    page,
  }) => {
    await page.getByTestId('remote-filter').fill('Lamp');
    // A million registers name ten devices in turn: a hundred thousand lamps.
    await expect(remote(page).locator('table')).toHaveAttribute(
      'aria-rowcount',
      '100001',
    );
    await expect(firstRow(page)).toContainText('Lamp');
  });

  test('says a block failed, and its retry asks for it alone', async ({
    page,
  }) => {
    await expect(firstRow(page)).toContainText('40001');
    // Rows 900 to 999 are the tenth block, which fails the first time.
    await scrollToRow(page, 950);
    const retry = remote(page).getByRole('button', { name: 'Retry' });
    await expect(retry).toHaveCount(1);
    await expect(remote(page)).toContainText('These rows could not be loaded.');
    const before = await askedCount(page);
    await retry.click();
    await expect(retry).toHaveCount(0);
    await expect(remote(page).locator('tr[data-pct-part="hole"]')).toHaveCount(
      0,
    );
    await expect(asked(page)).toContainText(`asked for ${before + 1} blocks`);
  });

  test('refreshes the rows in view and leaves the scroll where it is', async ({
    page,
  }) => {
    await expect(firstRow(page)).toContainText('40001');
    await scrollToRow(page, 300);
    await expect(remote(page).locator('tr[data-pct-part="hole"]')).toHaveCount(
      0,
    );
    const top = await frame(page).evaluate((element) => element.scrollTop);
    const before = await askedCount(page);
    await page.getByTestId('remote-refresh').click();
    await expect(remote(page).locator('tbody').first()).not.toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(await askedCount(page)).toBeGreaterThan(before);
    // The rows stayed while they were asked again: no hole stood in for them.
    await expect(remote(page).locator('tr[data-pct-part="hole"]')).toHaveCount(
      0,
    );
    expect(await frame(page).evaluate((element) => element.scrollTop)).toBe(
      top,
    );
  });
});

/**
 * The columns laid out by the user (`pctTableColumns` and `pct-table-column-chooser`): the
 * separator by its arrows and by a drag, the header's menu by keyboard and by pointer, the
 * chooser's checkboxes and buttons, the pinned columns that stay while the rest scroll, and
 * the layout saved as JSON and laid back as it was.
 */
test.describe('PctTableColumns — the columns as the user lays them out', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const table = (page: Page) => page.getByTestId('table-layout');
  const chooser = (page: Page) => page.getByTestId('layout-chooser');
  /** The ids of the columns the table draws, in the order it draws them. */
  const order = (page: Page) =>
    table(page)
      .locator('thead th[data-pct-column]')
      .evaluateAll((ths) =>
        ths.map((th) => th.getAttribute('data-pct-column')),
      );
  const state = (page: Page, json: string) =>
    expect(page.getByTestId('layout-state')).toHaveText(json);
  const header = (page: Page, id: string) =>
    table(page).locator(`thead th[data-pct-column="${id}"]`);
  const width = async (locator: Locator) =>
    Math.round((await locator.boundingBox())?.width ?? 0);
  /** An item of a column's menu, the one open: a menu closing fades out under the next. */
  const item = (page: Page, column: string, name: string) =>
    page
      .getByRole('menu', { name: `Options for ${column}` })
      .getByRole('menuitem', { name });

  test('a separator widens its column by the arrows, by 32 with Shift, and stops at its narrowest', async ({
    page,
  }) => {
    const room = table(page).getByRole('separator', { name: 'Resize Room' });
    await expect(room).toHaveAttribute('aria-valuenow', '150');
    await expect(room).toHaveAttribute('aria-valuemin', '120');
    await expect(room).toHaveAttribute('aria-valuemax', '2000');
    await expect(room).toHaveAttribute('aria-orientation', 'vertical');
    await room.focus();
    await page.keyboard.press('ArrowRight');
    await expect(room).toHaveAttribute('aria-valuenow', '158');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(room).toHaveAttribute('aria-valuenow', '190');
    await page.keyboard.press('ArrowLeft');
    await state(page, '{"widths":{"room":182}}');
    await expect.poll(() => width(header(page, 'room'))).toBe(182);

    const name = table(page).getByRole('separator', { name: 'Resize Name' });
    await name.focus();
    for (let step = 0; step < 3; step++)
      await page.keyboard.press('Shift+ArrowLeft');
    // 200 less 96 is below the column's 140.
    await expect(name).toHaveAttribute('aria-valuenow', '140');
  });

  test('a drag sets the width, and a double press fits the column to what it draws', async ({
    page,
  }) => {
    const room = table(page).getByRole('separator', { name: 'Resize Room' });
    await room.scrollIntoViewIfNeeded();
    const box = (await room.boundingBox()) as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y, { steps: 2 });
    await page.mouse.move(x + 50, y, { steps: 2 });
    await page.mouse.up();
    await expect(room).toHaveAttribute('aria-valuenow', '200');
    await state(page, '{"widths":{"room":200}}');

    await room.dblclick();
    // "Living room" and the header's buttons: narrower than the 200 the drag left.
    await expect
      .poll(async () => Number(await room.getAttribute('aria-valuenow')))
      .toBeLessThan(200);
    const fitted = await room.getAttribute('aria-valuenow');
    await state(page, `{"widths":{"room":${fitted}}}`);
  });

  test('a header’s menu moves its column, pins it and hides it, and the focus goes to the menu taking its place', async ({
    page,
  }) => {
    const roomMenu = table(page).getByRole('button', {
      name: 'Options for Room',
    });
    await roomMenu.focus();
    await page.keyboard.press('Enter');
    await expect(item(page, 'Room', 'Move left')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect
      .poll(() => order(page))
      .toEqual(['room', 'name', 'address', 'energy', 'nextAt', 'enabled']);
    await expect(roomMenu).toBeFocused();
    // The first column moves no further towards the start.
    await page.keyboard.press('Enter');
    await expect(item(page, 'Room', 'Move left')).toBeDisabled();
    await page.keyboard.press('Escape');

    await table(page)
      .getByRole('button', { name: 'Options for Enabled' })
      .click();
    await item(page, 'Enabled', 'Pin to the start').click();
    await expect(
      table(page).getByRole('button', { name: 'Options for Enabled' }),
    ).toBeFocused();
    await expect.poll(async () => (await order(page))[0]).toBe('enabled');
    await expect(header(page, 'enabled')).toHaveAttribute(
      'data-pct-pinned',
      'start edge',
    );
    await state(
      page,
      '{"order":["room","name","address","energy","nextAt","enabled"],"pinned":{"start":["enabled"],"end":[]}}',
    );

    // The keyboard alone from here: a menu opening under the resting pointer follows it.
    await page.mouse.move(0, 0);
    await table(page)
      .getByRole('button', { name: 'Options for Energy' })
      .focus();
    await page.keyboard.press('Enter');
    await expect(item(page, 'Energy', 'Move left')).toBeFocused();
    await page.keyboard.press('End');
    await expect(item(page, 'Energy', 'Hide column')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(header(page, 'energy')).toHaveCount(0);
    await expect(
      table(page).getByRole('button', { name: 'Options for Next run' }),
    ).toBeFocused();
    await expect(
      chooser(page).getByRole('checkbox', { name: 'Energy' }),
    ).not.toBeChecked();
  });

  test('the chooser shows and hides a column, its buttons move one, and Alt with an arrow moves the one focused', async ({
    page,
  }) => {
    const room = chooser(page).getByRole('checkbox', { name: 'Room' });
    await room.uncheck();
    await expect(header(page, 'room')).toHaveCount(0);
    await expect(
      table(page).locator('tbody tr').first().locator('td'),
    ).toHaveCount(7);
    await state(page, '{"hidden":["room"]}');
    await room.check();
    await expect(header(page, 'room')).toHaveCount(1);

    const down = chooser(page).getByRole('button', { name: 'Move Name down' });
    await down.click();
    await expect
      .poll(() => order(page))
      .toEqual(['room', 'name', 'address', 'energy', 'nextAt', 'enabled']);
    await expect(down).toBeFocused();

    const enabled = chooser(page).getByRole('checkbox', { name: 'Enabled' });
    await enabled.focus();
    await page.keyboard.press('Alt+ArrowUp');
    await expect
      .poll(async () => (await order(page)).slice(-2))
      .toEqual(['enabled', 'nextAt']);
    await expect(enabled).toBeFocused();
    await expect(
      chooser(page).locator('[data-pct-part="item"]').nth(4),
    ).toHaveAttribute('data-pct-column', 'enabled');
  });

  test('a column pinned to an edge stays there while the rest scroll under it', async ({
    page,
  }) => {
    await table(page).getByRole('button', { name: 'Options for Name' }).click();
    await item(page, 'Name', 'Pin to the start').click();
    await table(page)
      .getByRole('button', { name: 'Options for Enabled' })
      .click();
    await item(page, 'Enabled', 'Pin to the end').click();
    await expect(header(page, 'enabled')).toHaveAttribute(
      'data-pct-pinned',
      'end edge',
    );
    // The press on the last header's menu scrolled the frame to it: back to the start first.
    const frame = table(page).locator('pct-table-frame');
    await frame.evaluate((element) => {
      element.scrollLeft = 0;
    });
    const left = async (id: string) =>
      Math.round((await header(page, id).boundingBox())?.x ?? 0);
    const before = {
      name: await left('name'),
      room: await left('room'),
      enabled: await left('enabled'),
    };
    await frame.evaluate((element) => {
      element.scrollLeft = 120;
    });
    await expect.poll(() => left('room')).toBeLessThan(before.room - 100);
    expect(await left('name')).toBe(before.name);
    expect(await left('enabled')).toBe(before.enabled);
    // The rows' checkboxes and numbers stick with the start's columns.
    const lead = table(page).locator('tbody tr').first().locator('td');
    await expect(lead.nth(0)).toHaveAttribute('data-pct-pinned', 'start');
    await expect(lead.nth(1)).toHaveAttribute('data-pct-pinned', 'start');
  });

  test('a layout saved as JSON lays the table back as it was, and Reset forgets it', async ({
    page,
  }) => {
    await chooser(page).getByRole('checkbox', { name: 'Address' }).uncheck();
    await chooser(page).getByRole('button', { name: 'Move Room up' }).click();
    const room = table(page).getByRole('separator', { name: 'Resize Room' });
    await room.focus();
    await page.keyboard.press('Shift+ArrowRight');
    const saved =
      '{"hidden":["address"],"order":["room","name","address","energy","nextAt","enabled"],"widths":{"room":182}}';
    await state(page, saved);
    await page.getByTestId('layout-save').click();

    await page.getByTestId('layout-reset').click();
    await state(page, '{}');
    await expect
      .poll(() => order(page))
      .toEqual(['name', 'room', 'address', 'energy', 'nextAt', 'enabled']);
    await expect(room).toHaveAttribute('aria-valuenow', '150');

    await page.getByTestId('layout-restore').click();
    await state(page, saved);
    await expect
      .poll(() => order(page))
      .toEqual(['room', 'name', 'energy', 'nextAt', 'enabled']);
    await expect(room).toHaveAttribute('aria-valuenow', '182');
    await expect(
      chooser(page).getByRole('checkbox', { name: 'Address' }),
    ).not.toBeChecked();
  });
});

/**
 * The table as a grid: one tab stop moved by the APG's keys, a lone control in a cell taking
 * the stop itself, a header of several stepped into and out of, a range stretched by Shift,
 * Ctrl+A picking every row, and the stop kept through a new order.
 */
test.describe('PctTableGrid — the rules as a grid', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const grid = (page: Page) => page.getByTestId('table-grid');
  /** What the element with the focus is: its tag, its part, and the text of its cell. */
  const focus = (page: Page) =>
    page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      const cell = active.closest('td, th');
      return {
        tag: active.tagName.toLowerCase(),
        type: active.getAttribute('type'),
        column:
          cell
            ?.closest('table')
            ?.tHead?.rows[0].cells[
              (cell as HTMLTableCellElement).cellIndex
            ]?.getAttribute('data-pct-column') ?? null,
        text: cell?.textContent?.trim() ?? null,
      };
    });

  test('is one tab stop: Tab reaches the first cell of the first row, and the next Tab leaves', async ({
    page,
  }) => {
    await expect(grid(page).getByRole('grid', { name: 'Rules' })).toHaveCount(
      1,
    );
    const stops = await grid(page).locator('table [tabindex="0"]').count();
    expect(stops).toBe(1);
    await grid(page)
      .locator('table')
      .evaluate((table) => {
        const before = document.createElement('button');
        before.textContent = 'before';
        before.id = 'grid-before';
        table.closest('pct-data-table')?.before(before);
      });
    await page.locator('#grid-before').focus();
    await page.keyboard.press('Tab');
    // The first row's checkbox, alone in its cell, holds the stop itself.
    expect(await focus(page)).toMatchObject({ tag: 'input', type: 'checkbox' });
    await page.keyboard.press('Tab');
    expect(
      await grid(page).evaluate((host) =>
        host.contains(document.activeElement),
      ),
    ).toBe(false);
  });

  test('the arrows move cell to cell, Home and End along the row, Ctrl with them to the ends', async ({
    page,
  }) => {
    const first = grid(page).locator('tbody tr').first();
    await first.locator('td.pct-data-table__pick input').focus();
    await page.keyboard.press('ArrowRight');
    expect(await focus(page)).toMatchObject({ tag: 'button' });
    await page.keyboard.press('ArrowRight');
    expect(await focus(page)).toMatchObject({ tag: 'td', text: '1' });
    await page.keyboard.press('ArrowRight');
    expect(await focus(page)).toMatchObject({ tag: 'td', column: 'name' });
    const name = (await focus(page)).text;
    await page.keyboard.press('ArrowDown');
    expect((await focus(page)).text).not.toBe(name);
    await page.keyboard.press('ArrowUp');
    expect((await focus(page)).text).toBe(name);
    await page.keyboard.press('ArrowUp');
    // The header's Name: its sort button, alone in the cell.
    expect(await focus(page)).toMatchObject({ tag: 'button', column: 'name' });
    await page.keyboard.press('Home');
    expect(await focus(page)).toMatchObject({ tag: 'input', type: 'checkbox' });
    await page.keyboard.press('End');
    expect(await focus(page)).toMatchObject({ tag: 'th', column: 'enabled' });
    await page.keyboard.press('Control+End');
    // The last row's switch.
    expect(await focus(page)).toMatchObject({
      tag: 'input',
      column: 'enabled',
    });
    await expect(page.getByTestId('grid-state')).toContainText(
      '"column":"enabled"',
    );
    await page.keyboard.press('Control+Home');
    expect(await focus(page)).toMatchObject({ tag: 'input', type: 'checkbox' });
    await expect(page.getByTestId('grid-state')).toContainText(
      '"focused":{"row":null,"column":"#select"}',
    );
  });

  test('a switch alone in its cell takes Space, and the arrows go on from it', async ({
    page,
  }) => {
    const toggle = grid(page)
      .getByRole('switch', { name: 'Enabled: Boiler' })
      .first();
    const was = await toggle.isChecked();
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked({ checked: !was });
    await page.keyboard.press('ArrowLeft');
    expect(await focus(page)).toMatchObject({ tag: 'td' });
    expect((await focus(page)).column).not.toBe('enabled');
  });

  test('opens a row with its disclosure; its details, of two buttons, are stepped into with Enter and left with Escape', async ({
    page,
  }) => {
    const first = grid(page).locator('tbody tr').first();
    await first.locator('[data-pct-part="disclosure"]').focus();
    await page.keyboard.press('Enter');
    // The details drawn first: an arrow before them goes to the next row.
    const details = grid(page).locator('tr[data-pct-part="details"] > td');
    await expect(details).toBeVisible();
    await page.keyboard.press('ArrowDown');
    // The details hold two buttons: the cell takes the stop.
    await expect(details).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus')).toHaveText(/Run .* now/);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('Skip the next run');
    await page.keyboard.press('Escape');
    await expect(details).toBeFocused();
    await page.keyboard.press('ArrowDown');
    expect(await focus(page)).toMatchObject({ tag: 'button' });
  });

  test('Page Down and Page Up move by what the frame shows', async ({
    page,
  }) => {
    const rows = grid(page).locator('tbody tr[data-pct-index]');
    await rows.first().locator('td.pct-data-table__first').focus();
    await page.keyboard.press('PageDown');
    const down = await page.evaluate(() =>
      Number(
        (document.activeElement as HTMLElement)
          .closest('tr')
          ?.getAttribute('data-pct-index'),
      ),
    );
    expect(down).toBeGreaterThan(3);
    await page.keyboard.press('PageUp');
    await expect(
      rows.first().locator('td.pct-data-table__first'),
    ).toBeFocused();
  });

  test('Shift with the arrows stretches a range of cells, an arrow alone lets it go', async ({
    page,
  }) => {
    const name = grid(page)
      .locator('tbody tr')
      .first()
      .locator('td.pct-data-table__first');
    await name.focus();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowRight');
    const marked = grid(page).locator('[data-pct-in-range]');
    await expect(marked).toHaveCount(4);
    await expect(marked.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('grid-state')).toContainText(
      '"range":{"from"',
    );
    await page.keyboard.press('ArrowRight');
    await expect(marked).toHaveCount(0);
    await expect(page.getByTestId('grid-state')).toContainText('"range":null');
  });

  test('Ctrl+A picks every row, and each row says it is selected', async ({
    page,
  }) => {
    const rows = grid(page).locator('tbody tr[data-pct-index]');
    await expect(rows.first()).toHaveAttribute('aria-selected', 'false');
    await rows.first().locator('td.pct-data-table__first').focus();
    await page.keyboard.press('ControlOrMeta+a');
    await expect(page.getByTestId('grid-state')).toContainText('"picked":20');
    await expect(rows.first()).toHaveAttribute('aria-selected', 'true');
  });

  test("Enter on a header's lone sort button sorts, and the stop stays on it through the new order", async ({
    page,
  }) => {
    await grid(page)
      .locator('tbody tr')
      .first()
      .locator('td.pct-data-table__first')
      .focus();
    // To the header's row, where Enter on the Name's sort button sorts.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(
      grid(page).getByRole('columnheader', { name: 'Name' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    // The stop stays on the button through the new order.
    expect(await focus(page)).toMatchObject({ tag: 'button', column: 'name' });
    await page.keyboard.press('ArrowDown');
    expect(await focus(page)).toMatchObject({ tag: 'td', column: 'name' });
  });

  test('keeps the stop on its row through a new order', async ({ page }) => {
    const cell = grid(page)
      .locator('tbody tr')
      .nth(3)
      .locator('td.pct-data-table__first');
    const text = (await cell.textContent())?.trim();
    await cell.focus();
    // Sorted by a press that leaves the focus where it is: the row moves, and its cell keeps it.
    await grid(page)
      .getByRole('button', { name: 'Room', exact: true })
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(
      grid(page).getByRole('columnheader', { name: 'Room' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(async () => (await focus(page)).text).toBe(text);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    expect((await focus(page)).text).toBe(text);
  });
});

test.describe('PctTableEditing — the rules edited in place', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const table = (page: Page) => page.getByTestId('table-editing');
  const cell = (page: Page, row: number, column: number) =>
    table(page).locator('tbody tr').nth(row).locator('td').nth(column);
  const editors = (page: Page) =>
    table(page).locator('[data-pct-part="editor"]');
  /** The last edit the table proposed, as the page keeps it. */
  const last = async (page: Page) =>
    JSON.parse(
      (await page.getByTestId('editing-state').textContent()) ?? '{}',
    ) as { editing: unknown; last: unknown };

  test('opens a cell on Enter, commits on Enter and goes a row down, and the page applies it', async ({
    page,
  }) => {
    await cell(page, 0, 0).click();
    await page.keyboard.press('Enter');
    const field = table(page).getByRole('textbox', { name: 'Edit Name' });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Supply fan');
    await expect(editors(page)).toHaveCount(1);
    await page.keyboard.type(' 2');
    await page.keyboard.press('Enter');
    await expect(editors(page)).toHaveCount(0);
    await expect(cell(page, 0, 0)).toHaveText('Supply fan 2');
    await expect(cell(page, 1, 0)).toBeFocused();
    expect((await last(page)).last).toEqual({
      id: 1,
      cause: 'edit',
      changes: [
        { column: 'name', value: 'Supply fan 2', previous: 'Supply fan' },
      ],
    });
  });

  test('lets the draft go on Escape, and commits on Tab with the stop on the next cell', async ({
    page,
  }) => {
    await cell(page, 1, 0).dblclick();
    const field = table(page).getByRole('textbox', { name: 'Edit Name' });
    await expect(field).toBeFocused();
    await page.keyboard.type(' A');
    await page.keyboard.press('Escape');
    await expect(cell(page, 1, 0)).toBeFocused();
    await expect(cell(page, 1, 0)).toHaveText('Heater');
    expect((await last(page)).last).toBeNull();
    // The keys move the stop again.
    await page.keyboard.press('ArrowDown');
    await expect(cell(page, 2, 0)).toBeFocused();
    await page.keyboard.press('F2');
    await page.keyboard.type('!');
    await page.keyboard.press('Tab');
    await expect(cell(page, 2, 0)).toHaveText('Bypass!');
    await expect(cell(page, 2, 1)).toBeFocused();
  });

  test('opens a number with the digit typed, in a field of its fraction digits', async ({
    page,
  }) => {
    await cell(page, 3, 2).click();
    await page.keyboard.press('7');
    const field = table(page).getByRole('spinbutton', { name: 'Edit Energy' });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('7');
    await page.keyboard.type('.25');
    await page.keyboard.press('Enter');
    await expect(cell(page, 3, 2)).toHaveText(/7\.3\s*kWh/);
    expect((await last(page)).last).toEqual({
      id: 4,
      cause: 'edit',
      changes: [{ column: 'energy', value: 7.3, previous: null }],
    });
  });

  test('keeps every key typed on a cell, however fast, and commits on a press beside the table', async ({
    page,
  }) => {
    await cell(page, 2, 0).click();
    await page.keyboard.type('Damper');
    const field = table(page).getByRole('textbox', { name: 'Edit Name' });
    await expect(field).toHaveValue('Damper');
    // A press on the page's text: the edit is committed, and the focus is where the press put it.
    await page.getByTestId('editing-state').click();
    await expect(editors(page)).toHaveCount(0);
    await expect(cell(page, 2, 0)).toHaveText('Damper');
    await expect(cell(page, 2, 0)).not.toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
      'BODY',
    );
  });

  test("edits the room in the page's own select, which commits on a pick", async ({
    page,
  }) => {
    await cell(page, 0, 1).click();
    await page.keyboard.press('Enter');
    const select = table(page).getByRole('combobox', { name: 'Edit Room' });
    await expect(select).toBeFocused();
    // The select opens on its own key; Escape closes its list before the editor.
    await page.keyboard.press('ArrowDown');
    await expect(select).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(select).toHaveAttribute('aria-expanded', 'false');
    await expect(editors(page)).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.getByRole('option', { name: 'Garage' }).click();
    await expect(editors(page)).toHaveCount(0);
    await expect(cell(page, 0, 1)).toHaveText('Garage');
    await expect(cell(page, 0, 1)).toBeFocused();
  });

  test('asks the last edit back on Ctrl+Z, and again on Ctrl+Shift+Z', async ({
    page,
  }) => {
    await cell(page, 4, 0).click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('s');
    await page.keyboard.press('Enter');
    await expect(cell(page, 4, 0)).toHaveText('Boilers');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(cell(page, 4, 0)).toHaveText('Boiler');
    await expect(cell(page, 4, 0)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(cell(page, 4, 0)).toHaveText('Boilers');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(cell(page, 4, 0)).toHaveText('Boiler');
    await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });

  test('edits a whole row: Enter opens its cells, Tab moves among them, the last Tab commits them in one edit', async ({
    page,
  }) => {
    await page.getByRole('switch', { name: 'Edit a whole row' }).click();
    await cell(page, 5, 0).click();
    await page.keyboard.press('Enter');
    await expect(editors(page)).toHaveCount(3);
    await expect(
      table(page).getByRole('textbox', { name: 'Edit Name' }),
    ).toBeFocused();
    await page.keyboard.type(' 2');
    await page.keyboard.press('Tab');
    await expect(
      table(page).getByRole('combobox', { name: 'Edit Room' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('1');
    await page.keyboard.press('Tab');
    await expect(editors(page)).toHaveCount(0);
    expect((await last(page)).last).toEqual({
      id: 6,
      cause: 'edit',
      changes: [
        { column: 'name', value: 'Floor heating 2', previous: 'Floor heating' },
        { column: 'energy', value: 1, previous: 488.5 },
      ],
    });
    await expect(cell(page, 5, 3)).toBeFocused();
  });
});

test.describe('PctTableEditing — the rules copied, pasted and written out', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const table = (page: Page) => page.getByTestId('table-editing');
  const cell = (page: Page, row: number, column: number) =>
    table(page).locator('tbody tr').nth(row).locator('td').nth(column);
  const said = (page: Page) => page.locator('[data-pct-live="polite"]');

  test('copies a range on Ctrl+C and pastes it from another stop on Ctrl+V, one step Ctrl+Z gives back', async ({
    page,
  }) => {
    const name = (await cell(page, 0, 0).textContent())?.trim() ?? '';
    const room = (await cell(page, 0, 1).textContent())?.trim() ?? '';
    const before = [
      (await cell(page, 2, 0).textContent())?.trim(),
      (await cell(page, 2, 1).textContent())?.trim(),
    ];
    await cell(page, 0, 0).click();
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('ControlOrMeta+c');
    await expect(said(page)).toHaveText('Cells copied: 2');
    // Shift took the stop along to the range's end; the paste goes from two rows down, at the start.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await expect(cell(page, 2, 0)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+v');
    // The room is the page's own select, whose rules a paste would pass by: it is left out.
    await expect(said(page)).toHaveText('Cells pasted: 1, left out: 1');
    await expect(cell(page, 2, 0)).toHaveText(name);
    await expect(cell(page, 2, 1)).toHaveText(before[1] ?? '');
    expect(room).not.toBe('');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(cell(page, 2, 0)).toHaveText(before[0] ?? '');
    await expect(cell(page, 2, 1)).toHaveText(before[1] ?? '');
  });

  test('pastes a number as the column reads it, and leaves out what is none', async ({
    page,
  }) => {
    // What a sheet puts on the clipboard, copied there by the engine from a field of its own.
    await page.evaluate(() => {
      const field = document.createElement('textarea');
      field.id = 'sheet';
      field.value = '1,950.5\n12 W';
      document.body.append(field);
      field.select();
    });
    await page.keyboard.press('ControlOrMeta+c');
    await page.evaluate(() => document.getElementById('sheet')?.remove());
    await cell(page, 0, 2).click();
    await page.keyboard.press('ControlOrMeta+v');
    await expect(said(page)).toHaveText('Cells pasted: 1, left out: 1');
    await expect(cell(page, 0, 2)).toHaveText(/1,950\.5/);
  });

  test('downloads the rules as CSV and as an Excel workbook the page writes with the table', async ({
    page,
  }) => {
    const name = (await cell(page, 0, 0).textContent())?.trim() ?? '';
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(csv.suggestedFilename()).toBe('rules.csv');
    const text = readFileSync(await csv.path(), 'utf8');
    expect(
      text.startsWith(
        `${String.fromCharCode(0xfeff)}Name,Room,Energy,Enabled\r\n${name},`,
      ),
    ).toBe(true);
    const [xlsx] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download Excel' }).click(),
    ]);
    expect(xlsx.suggestedFilename()).toBe('rules.xlsx');
    const sheet = partOf(
      readFileSync(await xlsx.path()),
      'xl/worksheets/sheet1.xml',
    );
    expect(sheet).toContain(
      '<sheetData><row r="1"><c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Name</t>',
    );
    expect(sheet).toContain(
      `<c r="A2" t="inlineStr"><is><t xml:space="preserve">${name}</t></is></c>`,
    );
    expect(sheet).toContain('<c r="D2" t="b"><v>1</v></c>');
  });
});

/** A part of a zip, found by its central directory and inflated. */
function partOf(zip: Buffer, name: string): string {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let at = zip.readUInt32LE(end + 16);
  for (let n = zip.readUInt16LE(end + 10); n > 0; n--) {
    const length = zip.readUInt16LE(at + 28);
    const offset = zip.readUInt32LE(at + 42);
    if (zip.toString('utf8', at + 46, at + 46 + length) === name) {
      const start =
        offset +
        30 +
        zip.readUInt16LE(offset + 26) +
        zip.readUInt16LE(offset + 28);
      const body = zip.subarray(start, start + zip.readUInt32LE(at + 20));
      return (
        zip.readUInt16LE(at + 10) === 8 ? inflateRawSync(body) : body
      ).toString('utf8');
    }
    at += 46 + length + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  throw new Error(`No ${name} in the zip.`);
}

test.describe('PctTableTree — the home as a tree', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const tree = (page: Page) => page.getByTestId('table-tree');
  const rows = (page: Page) => tree(page).locator('tbody tr');
  const names = (page: Page) => rows(page).locator('td:nth-child(1)');
  /** A row's disclosure, by the name its first cell shows. */
  const button = (page: Page, name: string) =>
    rows(page)
      .filter({ hasText: name })
      .first()
      .locator('button[data-pct-part="disclosure"]');
  const focusedText = (page: Page) =>
    page.evaluate(
      () =>
        document.activeElement
          ?.closest('tr')
          ?.querySelector('td')
          ?.textContent?.trim() ?? null,
    );

  test('three levels open from their buttons, and the treegrid says each row’s level and place', async ({
    page,
  }) => {
    await expect(
      tree(page).getByRole('treegrid', { name: 'Home' }),
    ).toHaveCount(1);
    // The ground floor stands open from the start, its rooms under it; upstairs is closed.
    await expect(names(page)).toHaveText([
      /Ground floor/,
      /Kitchen/,
      /Hall/,
      /Garage/,
      /Upstairs/,
    ]);
    const ground = rows(page).first();
    await expect(ground).toHaveAttribute('aria-level', '1');
    await expect(ground).toHaveAttribute('aria-expanded', 'true');
    await expect(ground).toHaveAttribute('aria-setsize', '2');
    await expect(rows(page).nth(1)).toHaveAttribute('aria-level', '2');
    await expect(rows(page).nth(1)).toHaveAttribute('aria-posinset', '1');
    await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'false');
    // A room with no device is a leaf: no button, no state.
    await expect(button(page, 'Garage')).toHaveCount(0);
    await expect(rows(page).nth(3)).not.toHaveAttribute('aria-expanded');
    await expect(button(page, 'Kitchen')).toHaveAttribute(
      'aria-label',
      'Expand',
    );
    await button(page, 'Kitchen').click();
    await expect(names(page).nth(2)).toHaveText(/Kettle/);
    await expect(rows(page).nth(2)).toHaveAttribute('aria-level', '3');
    await expect(rows(page).nth(2)).toHaveAttribute('aria-setsize', '3');
    await expect(button(page, 'Kitchen')).toHaveAttribute(
      'aria-label',
      'Collapse',
    );
    await expect(page.getByTestId('tree-state')).toContainText(
      'Open: ground kitchen.',
    );
    await page.getByTestId('tree-collapse').click();
    await expect(names(page)).toHaveCount(2);
    await page.getByTestId('tree-expand').click();
    await expect(names(page)).toHaveCount(14);
  });

  test('the filter keeps the way to a match, the rows above it muted, and counts what it kept', async ({
    page,
  }) => {
    // The filter opens nothing: a closed branch stays closed, and is counted all the same.
    await page.getByTestId('tree-filter').click();
    await expect(names(page)).toHaveText([
      /Ground floor/,
      /Kitchen/,
      /Upstairs/,
    ]);
    await expect(page.getByTestId('tree-state')).toContainText('Rows: 6.');
    await page.getByTestId('tree-expand').click();
    await expect(names(page)).toHaveText([
      /Ground floor/,
      /Kitchen/,
      /Lamp/,
      /Upstairs/,
      /Bedroom/,
      /Lamp/,
    ]);
    await expect(rows(page).first()).toHaveAttribute('data-pct-muted', '');
    await expect(rows(page).nth(1)).toHaveAttribute('data-pct-muted', '');
    await expect(rows(page).nth(2)).not.toHaveAttribute('data-pct-muted');
    await expect(rows(page).nth(4)).toHaveAttribute('data-pct-muted', '');
    await page.getByTestId('tree-filter').click();
    await expect(page.getByTestId('tree-state')).toContainText('Rows: 14.');
  });

  test('reveal opens the branches above a device in a closed floor, and new rows keep the branches open', async ({
    page,
  }) => {
    await page.getByTestId('tree-collapse').click();
    await expect(names(page)).toHaveCount(2);
    await page.getByTestId('tree-reveal').click();
    await expect(names(page).filter({ hasText: 'Heater' })).toHaveCount(1);
    await expect(page.getByTestId('tree-state')).toContainText(
      'Open: bedroom upstairs.',
    );
    await page.getByTestId('tree-replace').click();
    await expect(names(page).filter({ hasText: 'Office' })).toHaveCount(0);
    await button(page, 'Ground floor').click();
    await expect(names(page).filter({ hasText: 'Office' })).toHaveCount(1);
    await expect(names(page).filter({ hasText: 'Heater' })).toHaveCount(1);
  });

  test('on a first cell the arrow out of the line closes a branch or goes to the parent, the arrow into it opens one', async ({
    page,
  }) => {
    await button(page, 'Kitchen').focus();
    await page.keyboard.press('ArrowRight');
    await expect(names(page).nth(2)).toHaveText(/Kettle/);
    expect(await focusedText(page)).toMatch(/Kitchen/);
    await page.keyboard.press('ArrowLeft');
    await expect(names(page).nth(2)).toHaveText(/Hall/);
    expect(await focusedText(page)).toMatch(/Kitchen/);
    await page.keyboard.press('ArrowLeft');
    expect(await focusedText(page)).toMatch(/Ground floor/);
    // On an open branch the arrow into the line is the grid's move: to the next cell.
    await page.keyboard.press('ArrowRight');
    expect(await focusedText(page)).toMatch(/Ground floor/);
    expect(
      await page.evaluate(
        () => document.activeElement?.closest('td')?.cellIndex,
      ),
    ).toBe(1);
  });
});

test.describe('Header groups — the rules under grouped headers', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datatable');
  });

  const table = (page: Page) => page.getByTestId('table-grouped');
  /**
   * Each row of the header as its cells read: a group's header starred, a column's by its
   * id, an empty cell as nothing, each with the columns it spans past one.
   */
  const head = (page: Page) =>
    table(page)
      .locator('thead tr')
      .evaluateAll((rows) =>
        rows.map((row) =>
          Array.from((row as HTMLTableRowElement).cells, (cell) => {
            const text =
              cell.getAttribute('data-pct-column') ??
              `${cell.getAttribute('scope') === 'colgroup' ? '*' : ''}${(
                cell.textContent ?? ''
              )
                .replace(/\s+/g, ' ')
                .trim()}`;
            return `${text}${cell.colSpan > 1 ? ` x${cell.colSpan}` : ''}`;
          }),
        ),
      );
  const item = (page: Page, column: string, name: string) =>
    page
      .getByRole('menu', { name: `Options for ${column}` })
      .getByRole('menuitem', { name });
  const state = (page: Page, json: string) =>
    expect(page.getByTestId('heads-state')).toContainText(json);

  test('a row per level of groups stands over the headers, a group over its columns', async ({
    page,
  }) => {
    await expect
      .poll(() => head(page))
      .toEqual([
        ['', '*Where x2', '*Energy x2', ''],
        ['', ' x2', '*This month', '*Next run', ''],
        ['name', 'room', 'address', 'energy', 'nextAt', 'enabled'],
      ]);
    await expect(table(page).locator('thead th[scope="colgroup"]')).toHaveCount(
      4,
    );
  });

  test('a column’s menu moves its group whole, and pins it whole', async ({
    page,
  }) => {
    await table(page).getByRole('button', { name: 'Options for Room' }).click();
    await item(page, 'Room', 'Move left').click();
    await expect
      .poll(() => head(page))
      .toEqual([
        ['*Where x2', '', '*Energy x2', ''],
        [' x2', '', '*This month', '*Next run', ''],
        ['room', 'address', 'name', 'energy', 'nextAt', 'enabled'],
      ]);
    await state(
      page,
      '"order":["room","address","name","energy","nextAt","enabled"]',
    );
    await table(page).getByRole('button', { name: 'Options for Used' }).click();
    await item(page, 'Used', 'Pin to the start').click();
    await expect
      .poll(() => head(page))
      .toEqual([
        // `name` and `enabled`, adjacent now and of no group, stand under one cell.
        ['*Energy x2', '*Where x2', ' x2'],
        ['*This month', '*Next run', ' x2', ' x2'],
        ['energy', 'nextAt', 'room', 'address', 'name', 'enabled'],
      ]);
    await state(page, '"pinned":{"start":["energy","nextAt"],"end":[]}');
    await expect(
      table(page).locator('thead tr').first().locator('th').first(),
    ).toHaveAttribute('data-pct-pinned', 'start edge');
  });

  test('the groups’ rows stick with the header while the rules scroll', async ({
    page,
  }) => {
    const frame = table(page).locator('pct-table-frame');
    await frame.evaluate((element) => element.scrollTo({ top: 300 }));
    await expect
      .poll(() => frame.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(250);
    const frameBox = (await frame.boundingBox()) as { y: number };
    const group = table(page).locator('thead th[scope="colgroup"]').first();
    const groupBox = (await group.boundingBox()) as {
      y: number;
      height: number;
    };
    const header = table(page).locator('thead th[data-pct-column="name"]');
    const headerBox = (await header.boundingBox()) as { y: number };
    // The outermost group's row at the frame's top; the headers' row below both rows of groups.
    expect(Math.abs(groupBox.y - frameBox.y)).toBeLessThan(2);
    expect(headerBox.y - frameBox.y).toBeGreaterThan(groupBox.height * 1.9);
    expect(headerBox.y - frameBox.y).toBeLessThan(groupBox.height * 2.5);
  });
});
