import { expect, Locator, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * Stany przekrojowo: to samo pytanie zadane każdej kontrolce naraz.
 *
 * Testy per komponent sprawdzają, czy dany stan działa. Tutaj chodzi o to, czy
 * wszystkie kontrolki rozumieją go **tak samo** — bo rozjazd zaczyna się od
 * jednej, która robi po swojemu.
 */
const CONTROLS = ['text', 'number', 'select', 'checkbox', 'radio'] as const;

/**
 * Element, który realnie przyjmuje fokus i stan wyłączenia. Nie da się go
 * wskazać jednym selektorem: `[pctText]` i `[pctNumber]` **są** natywnym
 * inputem (testid siedzi na nim), select ma trigger, a checkbox i grupa radiów
 * trzymają natywne inputy w środku.
 */
function focusTarget(card: Locator, state: string, control: string): Locator {
  const host = card.getByTestId(`${state}-${control}`);
  if (control === 'text' || control === 'number') return host;
  if (control === 'select') return host.locator('[data-pct-part="trigger"]');
  return host.locator('input').first();
}

test.describe('Stany — przekrój przez wszystkie kontrolki', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/states');
  });

  /**
   * Bramka kontrastu liczy na hexach z palety, więc każde **przyciemnienie**
   * `opacity` jest dla niej niewidoczne — stan musi mieć własne tokeny koloru
   * (req-token-no-opacity). Szukamy więc wartości pomiędzy 0 a 1: pełne `0` to inna
   * technika (natywna kontrolka checkboxa jest niewidoczna, ale wciąż jest
   * obszarem trafienia nad narysowanym pudełkiem), a nie ściemniony tekst.
   */
  test('żaden stan nie jest przyciemniany przezroczystością', async ({
    page,
  }) => {
    for (const state of ['disabled', 'readonly', 'invalid']) {
      const przyciemnione = await page
        .getByTestId(`states-${state}`)
        .locator('[data-pct-part], input, button')
        .evaluateAll((els) =>
          els
            .map((el) => ({
              el,
              opacity: Number(getComputedStyle(el).opacity),
            }))
            .filter(({ opacity }) => opacity > 0 && opacity < 1)
            .map(
              ({ el, opacity }) =>
                `${el.tagName.toLowerCase()}[${el.getAttribute('data-pct-part') ?? '—'}] = ${opacity}`,
            ),
        );
      expect(przyciemnione, `stan ${state}`).toEqual([]);
    }
  });

  test('każda wyłączona kontrolka jest naprawdę wyłączona', async ({
    page,
  }) => {
    const card = page.getByTestId('states-disabled');

    for (const control of CONTROLS) {
      await expect(
        focusTarget(card, 'disabled', control),
        `kontrolka ${control}`,
      ).toBeDisabled();
    }

    await expect(card.getByTestId('disabled-button')).toBeDisabled();
  });

  /**
   * Tylko do odczytu to nie to samo co wyłączenie: wartości nie da się zmienić,
   * ale kontrolka zostaje w kolejności Taba, więc czytnik ekranu ją odczyta.
   */
  test('kontrolka tylko do odczytu zostaje fokusowalna', async ({ page }) => {
    const card = page.getByTestId('states-readonly');

    for (const control of CONTROLS) {
      const target = focusTarget(card, 'readonly', control);
      await target.focus();
      await expect(target, `kontrolka ${control}`).toBeFocused();
    }
  });

  test('błąd jest widoczny, ogłaszany i związany z kontrolką', async ({
    page,
  }) => {
    const card = page.getByTestId('states-invalid');
    const errors = card.locator('[data-pct-part="field-error"]');

    // Każda kontrolka w karcie dostaje komunikat od obudowy.
    await expect(errors).toHaveCount(CONTROLS.length);
    for (let i = 0; i < CONTROLS.length; i++) {
      await expect(errors.nth(i)).toHaveAttribute('role', 'alert');
    }

    // Ramka pola sygnalizuje błąd kolorem z tokenu — w każdym polu z ramką.
    const rows = card.locator('[data-pct-part="field-row"]');
    const kolory = await rows.evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).borderTopWidth !== '0px')
        .map((el) => getComputedStyle(el).borderColor),
    );
    expect(kolory.length).toBeGreaterThan(0);
    expect(new Set(kolory)).toEqual(new Set(['rgb(220, 38, 38)']));
  });

  test('znacznik wymagalności należy do obudowy, nie do kontrolki', async ({
    page,
  }) => {
    const card = page.getByTestId('states-required');
    const labels = card.locator('[data-pct-part="field-label"]');

    await expect(labels).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(labels.nth(i)).toContainText('*');
    }
  });

  test('przycisk w stanie ładowania blokuje się i zapowiada to przez ARIA', async ({
    page,
  }) => {
    const loading = page.getByTestId('loading-button');
    await expect(loading).toBeDisabled();
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(loading.locator('[data-pct-part="spinner"]')).toBeVisible();
  });
});
