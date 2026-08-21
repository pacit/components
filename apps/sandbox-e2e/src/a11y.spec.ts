import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { setRtl, visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * The automatic accessibility audit (req-a11y-wcag). It complements the token
 * contrast gate: there the values in the palette are examined, here the DOM as
 * really rendered (roles, ARIA bindings, contrast once the layers are composed).
 */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type Violation = Awaited<
  ReturnType<AxeBuilder['analyze']>
>['violations'][number];

/** A readable report — the default axe object is of no use in a CI log. */
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

test.describe('Accessibility (axe-core, WCAG 2.2 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/all');
  });

  for (const path of SBX_ROUTES) {
    test(`the ${path} view has no violations`, async ({ page }) => {
      await visit(page, path);
      const violations = await audit(page);
      expect(report(violations)).toBe('');
    });
  }

  /**
   * The same audit under `dir="rtl"` (req-token-logical).
   *
   * The direction is not a matter of looks alone: axe computes contrast once the
   * layers are composed and checks ARIA bindings on the rendered tree, and mirroring
   * the layout can change both — an element overlapping its neighbour, an affix
   * covering the text, a touch target pushed outside the control. The RTL
   * screenshots show that the layout mirrored; this audit says whether it is still
   * accessible afterwards.
   */
  for (const path of SBX_ROUTES) {
    test(`the ${path} view has no violations in RTL`, async ({ page }) => {
      await visit(page, path);
      await setRtl(page);
      const violations = await audit(page);
      expect(report(violations)).toBe('');
    });
  }

  test('a panel with a scoped theme (dark) has no violations', async ({
    page,
  }) => {
    const violations = await audit(page, '[data-testid="panel-scoped"]');
    expect(report(violations)).toBe('');
  });

  test('a form in the error state has no violations', async ({ page }) => {
    // Provoke a visible validation error: an invalid e-mail plus leaving the field.
    const input = page.getByTestId('field-email').locator('input');
    await input.fill('this-is-not-an-email');
    await input.press('Tab');
    await expect(
      page.getByTestId('field-email').locator('[data-pct-part="field-error"]'),
    ).toBeVisible();

    const violations = await audit(page, '[data-testid="panel-form"]');
    expect(report(violations)).toBe('');
  });

  test('a checkbox in the indeterminate state has no violations', async ({
    page,
  }) => {
    const violations = await audit(page, '[data-testid="checkbox-mixed"]');
    expect(report(violations)).toBe('');
  });

  /**
   * A grouped listbox is three levels where the walk over the routes only ever sees two, and
   * the closed panel is a panel axe has nothing to say about. What is being asked here is
   * whether the options are still OWNED once a heading stands between them and the listbox:
   * `option` names `group` and `listbox` as its context, `listbox` names `group` and `option`
   * as what it may own, and only the rendered tree says which of the two we actually built.
   */
  test('an open panel with headings has no violations', async ({ page }) => {
    await visit(page, '/select');
    await page
      .getByTestId('select-groups')
      .locator('[data-pct-part="trigger"]')
      .click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    const violations = await audit(page, '[data-pct-part="panel"]');
    expect(report(violations)).toBe('');
  });

  /**
   * An open modal is the one state the walk over the routes cannot reach: every dialog in the
   * sandbox starts closed, and a panel that is not attached is a panel axe has nothing to say
   * about. The audit is scoped to the panel, because the rest of the page is `inert` while it
   * is up — and axe reads the tree as rendered, which is the whole point of running it here
   * rather than over a template.
   */
  test('an open dialog has no violations', async ({ page }) => {
    await visit(page, '/dialog');
    await page.getByTestId('open-with-select').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    const violations = await audit(page, '[data-pct-part="panel"]');
    expect(report(violations)).toBe('');
  });

  /**
   * An open tooltip, for the same reason as the open dialog above: the walk over the routes
   * finds every panel closed, and a panel that is not attached is one axe has nothing to say
   * about. The trigger is the icon-only button — the one place where a violation would be a
   * real one rather than a sandbox artefact, since the tooltip is the only name it has
   * ([`lesson-65`](../../../docs/lessons.md#lesson-65)).
   */
  test('an open tooltip and the button it names have no violations', async ({
    page,
  }) => {
    await visit(page, '/tooltip');
    await page.getByTestId('names-trigger').hover();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    const violations = await audit(page, '[data-testid="demo-names"]');
    expect(report(violations)).toBe('');
  });

  /**
   * An open popover, and the WHOLE page with it rather than the panel alone. The dialog's
   * audit is scoped to its panel because everything else is `inert` while it is up; here
   * nothing is, so the page and the panel are one tree a reader walks — and the trigger's
   * `aria-expanded`/`aria-controls` only mean anything measured together with what they
   * point at.
   */
  test('an open popover has no violations, page and panel together', async ({
    page,
  }) => {
    await visit(page, '/popover');
    await page.getByTestId('panel-trigger').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    const violations = await audit(page);
    expect(report(violations)).toBe('');
  });

  /**
   * An open menu with a submenu beside it, and the whole page with them — the popover's
   * reading of the audit, for the popover's reason: nothing here is `inert`, so the trigger,
   * the panel and the row that opened the second panel are one tree a reader walks. The
   * submenu is open on purpose: `role="menu"` has required children and `role="menuitem"` a
   * required parent, and a nested panel is the arrangement where either could go wrong.
   */
  test('an open menu with a submenu has no violations', async ({ page }) => {
    await visit(page, '/menu');
    await page.getByTestId('file-trigger').click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();
    await page.getByTestId('file-move').hover();
    await expect(page.locator('[role="menu"]')).toHaveCount(2);

    const violations = await audit(page);
    expect(report(violations)).toBe('');
  });

  test('a card with a dark stage has no violations', async ({ page }) => {
    await visit(page, '/button');
    const violations = await audit(page, '[data-testid="demo-dark"]');
    expect(report(violations)).toBe('');
  });

  /**
   * A test of the gate itself, not of the components. An audit that always passes
   * (after a bad tag configuration, say) gives false confidence — this test makes
   * sure the engine really runs the rules and can break them.
   */
  test('the a11y gate really does detect violations (a control of the gate)', async ({
    page,
  }) => {
    const before = await new AxeBuilder({ page })
      .withTags(WCAG_22_AA)
      .analyze();
    expect(before.violations).toHaveLength(0);
    // The engine has to run the rules for real instead of filtering them all out.
    expect(before.passes.length).toBeGreaterThan(10);

    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'a11y-control';
      d.innerHTML =
        '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">' +
        '<button></button>' +
        '<input type="text">';
      document.body.appendChild(d);
    });

    const after = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    const found = after.violations.map((v) => v.id);
    expect(found).toContain('image-alt'); // an <img> with no alt
    expect(found).toContain('button-name'); // a button with no name
    expect(found).toContain('label'); // a field with no label
  });
});
