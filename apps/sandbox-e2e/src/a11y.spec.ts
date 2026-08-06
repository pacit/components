import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { setRtl, visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * Automatyczny audyt dostępności (req-a11y-wcag). Uzupełnia bramkę kontrastu
 * tokenów: tam badane są wartości w palecie, tutaj realnie wyrenderowany DOM
 * (role, powiązania ARIA, kontrast po złożeniu warstw).
 */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type Violation = Awaited<
  ReturnType<AxeBuilder['analyze']>
>['violations'][number];

/** Czytelny raport — domyślny obiekt axe jest nieprzydatny w logu CI. */
function report(violations: readonly Violation[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .map(
          (n) =>
            `      - ${n.target.join(' ')}\n        ${n.failureSummary?.replace(/\n/g, '\n        ')}`,
        )
        .join('\n');
      return `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${nodes}`;
    })
    .join('\n\n');
}

async function audit(page: Page, scope?: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_22_AA);
  if (scope) builder = builder.include(scope);
  const results = await builder.analyze();
  return results.violations;
}

test.describe('Dostępność (axe-core, WCAG 2.2 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/all');
  });

  for (const path of SBX_ROUTES) {
    test(`widok ${path} jest bez naruszeń`, async ({ page }) => {
      await visit(page, path);
      const violations = await audit(page);
      expect(report(violations)).toBe('');
    });
  }

  /**
   * Ten sam audyt w `dir="rtl"` (req-token-logical).
   *
   * Kierunek nie jest wyłącznie sprawą wyglądu: axe liczy kontrast po złożeniu
   * warstw i sprawdza powiązania ARIA na wyrenderowanym drzewie, a odbicie
   * układu potrafi zmienić jedno i drugie — element nachodzący na sąsiada,
   * dekoracja zasłaniająca tekst, cel dotykowy wypchnięty poza kontrolkę.
   * Zrzuty RTL pokazują, że układ się odbił; ten audyt mówi, czy po odbiciu
   * nadal jest dostępny.
   */
  for (const path of SBX_ROUTES) {
    test(`widok ${path} jest bez naruszeń w RTL`, async ({ page }) => {
      await visit(page, path);
      await setRtl(page);
      const violations = await audit(page);
      expect(report(violations)).toBe('');
    });
  }

  test('panel ze scoped theme (ciemny) jest bez naruszeń', async ({ page }) => {
    const violations = await audit(page, '[data-testid="panel-scoped"]');
    expect(report(violations)).toBe('');
  });

  test('formularz w stanie błędu jest bez naruszeń', async ({ page }) => {
    // Wywołaj widoczny błąd walidacji: niepoprawny e-mail + opuszczenie pola.
    const input = page.getByTestId('field-email').locator('input');
    await input.fill('to-nie-jest-email');
    await input.press('Tab');
    await expect(
      page.getByTestId('field-email').locator('[data-pct-part="field-error"]'),
    ).toBeVisible();

    const violations = await audit(page, '[data-testid="panel-form"]');
    expect(report(violations)).toBe('');
  });

  test('checkbox w stanie nieokreślonym jest bez naruszeń', async ({
    page,
  }) => {
    const violations = await audit(page, '[data-testid="checkbox-mixed"]');
    expect(report(violations)).toBe('');
  });

  test('karta z ciemną sceną jest bez naruszeń', async ({ page }) => {
    await visit(page, '/button');
    const violations = await audit(page, '[data-testid="demo-dark"]');
    expect(report(violations)).toBe('');
  });

  /**
   * Test samej bramki, nie komponentów. Audyt, który zawsze przechodzi (np. po
   * błędnej konfiguracji tagów), daje fałszywe poczucie bezpieczeństwa — ten
   * test pilnuje, że silnik faktycznie uruchamia reguły i potrafi je złamać.
   */
  test('bramka a11y faktycznie wykrywa naruszenia (kontrola bramki)', async ({
    page,
  }) => {
    const przed = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    expect(przed.violations).toHaveLength(0);
    // Silnik musi realnie uruchamiać reguły, a nie odfiltrować wszystkie.
    expect(przed.passes.length).toBeGreaterThan(10);

    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'a11y-kontrola';
      d.innerHTML =
        '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">' +
        '<button></button>' +
        '<input type="text">';
      document.body.appendChild(d);
    });

    const po = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    const wykryte = po.violations.map((v) => v.id);
    expect(wykryte).toContain('image-alt'); // <img> bez alt
    expect(wykryte).toContain('button-name'); // przycisk bez nazwy
    expect(wykryte).toContain('label'); // pole bez etykiety
  });
});
