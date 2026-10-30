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
});
