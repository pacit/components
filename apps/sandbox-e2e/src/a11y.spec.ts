import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { setRtl, settled, visit } from './support/dom';
import {
  panelOwners,
  readPartsSnapshot,
  stageDrift,
} from './support/inventory';
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

/**
 * The audit reads the page at REST. A contrast rule composes colours as they stand at the
 * moment of reading, and a case audits right after the interaction that opened its panel —
 * while the panel is still fading in and the trigger's background still travelling
 * (`settled`, and the control at the end of this file). An audit taken then measures a frame
 * no user rests in, and a different frame on every run.
 */
async function audit(page: Page, scope?: string) {
  await settled(page);
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
   * A panel that is not attached is a panel axe has nothing to say about — every overlay in
   * the sandbox starts shut, so the walk over the routes never sees one open. The states
   * below are therefore brought up by hand, and the LIST of them is not: every class that
   * exposes a `panel` part in `libs/components/parts.snapshot.md` has to have a stage here,
   * both ways (the two cases after the table). A new component with a panel joins the audit
   * by default — as a red case asking for its stage rather than as a silence, which is the
   * inversion 4.11 gave the mutation inventory. What the derivation does not reach is written
   * beside it: the toast's stack is an `item` and not a `panel`, and stays a case by hand.
   */
  interface Stage {
    /** The case's name — `… has no violations`. */
    readonly title: string;
    readonly route: string;
    /** Brings the panel up; `null` for a panel the route already holds open, which is asserted. */
    readonly open: ((page: Page) => Promise<void>) | null;
    /** A selector to scope the audit to; the whole page otherwise. */
    readonly scope?: string;
  }

  const openTrigger = (testId: string) => async (page: Page) => {
    await page.getByTestId(testId).locator('[data-pct-part="trigger"]').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
  };

  const STAGES: Readonly<Record<string, readonly Stage[]>> = {
    PctSelect: [
      /**
       * A grouped listbox is three levels where the walk over the routes only ever sees two,
       * and the closed panel is a panel axe has nothing to say about. What is being asked here
       * is whether the options are still OWNED once a heading stands between them and the
       * listbox: `option` names `group` and `listbox` as its context, `listbox` names `group`
       * and `option` as what it may own, and only the rendered tree says which of the two we
       * actually built.
       */
      {
        title: 'an open panel with headings',
        route: '/select',
        open: openTrigger('select-groups'),
        scope: '[data-pct-part="panel"]',
      },
      /**
       * A filtering combobox with its panel open, and audited WHOLE-PAGE rather than scoped
       * to the panel: what is new here is a relation between two elements that live in
       * different trees. The trigger is an `<input role="combobox">` in the page and the
       * listbox is in the overlay container, so `aria-controls` and `aria-activedescendant`
       * are references crossing between them — and a reference to an id that is not in the
       * document is exactly what `aria-valid-attr-value` reports. The question typed leaves
       * one row standing under one heading, which is also the narrowed list's own audit.
       */
      {
        title: 'a filtering combobox with a narrowed panel',
        route: '/select',
        open: async (page) => {
          await page
            .getByTestId('select-filter')
            .locator('[data-pct-part="trigger"]')
            .fill('lat');
          await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
        },
      },
      /**
       * A listbox with nothing in it — the state an async control is in before its list
       * arrives, and the first EMPTY one this suite audits. `aria-required-children` is what
       * has an opinion about it: a `listbox` must own options, and a panel waiting for its
       * rows owns none. The way out is not a placeholder row but the state the specification
       * has for exactly this, and axe implements it — a container marked `aria-busy` is a
       * container whose content has not arrived, so the rule stands down until it does
       * ([0037](../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
       */
      {
        title: 'a panel waiting for its list',
        route: '/select',
        open: openTrigger('select-async'),
      },
      /**
       * A listbox with nothing in it and NO excuse: the list is genuinely empty, `aria-busy`
       * is not written, and the sentence saying so is the panel's, standing beside the list
       * ([0069](../../../docs/decisions/0069-a-message-about-the-list-is-not-an-item-in-it.md)).
       * The same tree with the sentence inside the listbox was a critical
       * `aria-required-children` this suite had never opened a panel to find (plan 4.8):
       * axe marks an empty listbox for review and fails one holding content it cannot own.
       */
      {
        title: 'an empty panel',
        route: '/select',
        open: openTrigger('select-empty'),
      },
      /**
       * A panel drawing eleven rows of five thousand, scrolled into the middle of them — the
       * state a window is FOR, and the one the geometry only exists in a browser to reach.
       *
       * Two things are being asked here and only one of them has a rule. The one that has:
       * the listbox — the `list` part inside the panel since
       * [0069](../../../docs/decisions/0069-a-message-about-the-list-is-not-an-item-in-it.md)
       * — is still the element that scrolls, and it stays that way because the exemption
       * keeping a panel of unfocusable rows out of `scrollable-region-focusable` is for a
       * combobox's own popup — put the scrolling one element in, which is exactly what a
       * virtual-scroll viewport does, and the same tree is a serious violation
       * ([0038](../../../docs/decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)).
       * The one that has not: `aria-setsize` and `aria-posinset` exist for a set the DOM does
       * not hold, and axe has no rule about them at all — a windowed listbox that says
       * neither is green here and lies to the reader about how long the list is. That
       * promise is measured in `select.spec.ts`, and this case is why it has to be.
       */
      {
        title: 'a panel drawing a window of a long list',
        route: '/select',
        open: async (page) => {
          await openTrigger('select-many')(page);
          const list = page.locator('[data-pct-part="list"]');
          // Into the middle of the list, where the panel is drawing a window with a spacer
          // on both sides of it — the top of a list is the one place a window looks like an
          // ordinary panel.
          await list.evaluate((el) => {
            el.scrollTop = el.scrollHeight / 2;
          });
          await expect(
            page.locator('[data-pct-part="option"]').first(),
          ).not.toHaveText('Row 0');
        },
      },
    ],
    PctMultiSelect: [
      /**
       * A many-choice listbox. `aria-multiselectable` belongs to the listbox and
       * `aria-selected` to every option under it — including the ones that are NOT chosen,
       * which is the half a single-choice panel never has to say. The panel is an overlay,
       * so the closed one is again something axe has nothing to say about.
       */
      {
        title: 'an open panel that takes many answers',
        route: '/select',
        open: openTrigger('select-multi'),
        scope: '[data-pct-part="panel"]',
      },
    ],
    PctDate: [
      /**
       * An open calendar, and the field it belongs to — the one panel of the library the
       * audit had never opened until the list was derived. The `/date` view holds an INLINE
       * calendar too, so the grid itself was audited attached from the start; what only the
       * overlay has is the relation across trees — the toggle's `aria-expanded` and
       * `aria-controls` pointing at a panel in the overlay container — and the roving cell
       * that takes focus when the panel opens
       * ([0032](../../../docs/decisions/0032-a-grid-moves-focus-and-does-not-point-at-it.md)),
       * so the audit runs whole-page.
       */
      {
        title: 'an open calendar and the field it belongs to',
        route: '/date',
        open: async (page) => {
          await page
            .getByTestId('date-standalone')
            .locator('[data-pct-part="toggle"]')
            .click();
          await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
        },
      },
    ],
    PctDialog: [
      /**
       * An open modal is the one state the walk over the routes cannot reach: every dialog
       * in the sandbox starts closed, and a panel that is not attached is a panel axe has
       * nothing to say about. The audit is scoped to the panel, because the rest of the page
       * is `inert` while it is up — and axe reads the tree as rendered, which is the whole
       * point of running it here rather than over a template.
       */
      {
        title: 'an open dialog',
        route: '/dialog',
        open: async (page) => {
          await page.getByTestId('open-with-select').click();
          await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
        },
        scope: '[data-pct-part="panel"]',
      },
    ],
    PctTooltipPanel: [
      /**
       * An open tooltip, for the same reason as the open dialog: the walk over the routes
       * finds every panel closed. The trigger is the icon-only button — the one place where
       * a violation would be a real one rather than a sandbox artefact, since the tooltip is
       * the only name it has ([`lesson-65`](../../../docs/lessons.md#lesson-65)).
       */
      {
        title: 'an open tooltip and the button it names',
        route: '/tooltip',
        open: async (page) => {
          await page.getByTestId('names-trigger').hover();
          await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
        },
        scope: '[data-testid="demo-names"]',
      },
    ],
    PctPopover: [
      /**
       * An open popover, and the WHOLE page with it rather than the panel alone. The
       * dialog's audit is scoped to its panel because everything else is `inert` while it is
       * up; here nothing is, so the page and the panel are one tree a reader walks — and the
       * trigger's `aria-expanded`/`aria-controls` only mean anything measured together with
       * what they point at.
       */
      {
        title: 'an open popover, page and panel together',
        route: '/popover',
        open: async (page) => {
          await page.getByTestId('panel-trigger').click();
          await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
        },
      },
    ],
    PctMenu: [
      /**
       * An open menu with a submenu beside it, and the whole page with them — the popover's
       * reading of the audit, for the popover's reason: nothing here is `inert`, so the
       * trigger, the panel and the row that opened the second panel are one tree a reader
       * walks. The submenu is open on purpose: `role="menu"` has required children and
       * `role="menuitem"` a required parent, and a nested panel is the arrangement where
       * either could go wrong.
       */
      {
        title: 'an open menu with a submenu',
        route: '/menu',
        open: async (page) => {
          await page.getByTestId('file-trigger').click();
          await expect(page.locator('[role="menu"]').first()).toBeVisible();
          await page.getByTestId('file-move').hover();
          await expect(page.locator('[role="menu"]')).toHaveCount(2);
        },
      },
    ],
    PctAccordionItem: [
      /**
       * A panel drawn IN the page: a `<details>` the sandbox holds open, so the walk over the
       * routes audits it already. The stage exists to say so — the day the sandbox shuts
       * every section, the walk goes on passing and this case asks where the panel went.
       */
      {
        title: 'a section standing open in the walk',
        route: '/accordion',
        open: null,
      },
    ],
    PctTab: [
      /**
       * The same for a strip's panel: one tab is chosen on every strip of the sandbox, so its
       * panel is in the walk from the start, and the case holds the claim rather than the
       * audit.
       */
      {
        title: "a strip's panel standing open in the walk",
        route: '/tabs',
        open: null,
      },
    ],
  };

  for (const stages of Object.values(STAGES))
    for (const stage of stages)
      test(`${stage.title} has no violations`, async ({ page }) => {
        await visit(page, stage.route);
        if (stage.open) await stage.open(page);
        else
          await expect(
            page.locator('[data-pct-part="panel"]:visible').first(),
          ).toBeVisible();

        const violations = await audit(page, stage.scope);
        expect(report(violations)).toBe('');
      });

  /**
   * The denominator: the stages above against the inventory `check-parts` writes from the
   * built package. Both directions — an owner with no stage is a panel the audit never
   * opens, a stage with no owner is an audit of nothing.
   */
  test('every owner of a panel part has a stage here (the denominator)', async () => {
    const owners = panelOwners(readPartsSnapshot());
    expect(owners.length).toBeGreaterThan(0);
    expect(stageDrift(owners, Object.keys(STAGES))).toEqual({
      unstaged: [],
      ownerless: [],
    });
  });

  /**
   * A control of the denominator: the same comparison over a doctored inventory has to name
   * the panel nobody staged, and a doctored stage list the stage nobody owns — else the case
   * above is a sentence that always agrees.
   */
  test('the denominator really compares (a control of the derivation)', async () => {
    const owners = panelOwners(readPartsSnapshot());
    const doctored = readPartsSnapshot().replace(
      /^```\s*$/m,
      '```\n./widget PctWidget panel',
    );
    expect(panelOwners(doctored)).toContain('PctWidget');
    expect(stageDrift(panelOwners(doctored), Object.keys(STAGES))).toEqual({
      unstaged: ['PctWidget'],
      ownerless: [],
    });
    expect(stageDrift(owners, [...Object.keys(STAGES), 'PctGone'])).toEqual({
      unstaged: [],
      ownerless: ['PctGone'],
    });
  });

  /**
   * The cross, audited where it really stands: a `<button>` beside the trigger, inside the
   * same field row. Two things about it are only ever true in a rendered tree — its name comes
   * from `PCT_TEXTS` through `aria-label`, so a control that lost the string would be an
   * unnamed button, and it is out of the tab order, which `aria-hidden-focus` would report the
   * moment somebody "tidied" it away from a reader as well. The audit runs whole-page, because
   * the cross is not in the panel and the trigger's references still cross into one.
   */
  test('a control with a cross beside its trigger has no violations', async ({
    page,
  }) => {
    await visit(page, '/select');
    await expect(
      page.getByTestId('select-clear').locator('[data-pct-part="clear"]'),
    ).toBeVisible();

    const violations = await audit(page);
    expect(report(violations)).toBe('');
  });

  /**
   * A stack of messages, and the whole page with them. An empty live region is nothing an
   * audit has an opinion about — which is itself worth knowing, since an empty LISTBOX is a
   * critical violation ([`lesson-106`](../../../docs/lessons.md#lesson-106)): a listbox is a
   * list and a log is a place. What is asked here is the state the walk over the routes never
   * reaches, a region holding messages: an `alert` nested inside a `log`, two buttons on a
   * card whose only text is a sentence, and the contrast of the whole thing composed over the
   * page it stands on. The stack is in the top layer, and that is part of the question too.
   */
  test('a stack of messages has no violations', async ({ page }) => {
    await visit(page, '/toast');
    await page.getByTestId('raise-standing').click();
    await page.getByTestId('raise-urgent').click();
    await page.getByTestId('raise-action').click();
    await expect(page.locator('[data-pct-part="item"]')).toHaveCount(3);

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
  /**
   * A control of the wait in `audit`: right after the popover's panel is visible there IS
   * something in flight to wait for — the fade and the trigger's background, measured in
   * three engines at 0–35% of their 150 ms — and once waited for, nothing finite is left
   * running. Without the first half the wait would be a sentence; without the second, a wait
   * that returned early would look exactly like one that worked. The motion axis is slowed
   * to two seconds for this case alone, through the token an application would use, so that
   * "in flight" is a fact and not a race against a 150 ms fade on a loaded machine.
   */
  test('the audit waits for the page to settle (a control of the wait)', async ({
    page,
  }) => {
    await visit(page, '/popover');
    await page.addStyleTag({
      content: ':root { --pct-motion-transition-duration: 2s; }',
    });
    await page.getByTestId('panel-trigger').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    const inFlight = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) =>
            Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity),
          ).length,
    );
    expect(inFlight).toBeGreaterThan(0);

    expect(await settled(page)).toBeGreaterThanOrEqual(0);
    expect(await settled(page)).toBe(0);
  });

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
