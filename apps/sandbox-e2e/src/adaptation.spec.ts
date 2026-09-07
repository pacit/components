import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * What the page does when the reader changes it (`req-a11y-wcag`).
 *
 * Four criteria of WCAG 2.2 AA are about the same thing from four sides: the layout is the
 * author's offer and not the reader's contract. A narrow window, doubled text, the reader's
 * own spacing and a focus ring that has to stay visible are all cases of "the design moved
 * and the content is still all there".
 *
 * They stood as **Not Evaluated** in `docs/acr.md` until this file, and the reason is worth
 * keeping: nothing else in the suite renders anything at a size the author did not choose.
 * The visual baselines run at one desktop viewport, the geometry tests measure boxes at that
 * same width, and the axe audit does not resize anything at all. So the four rows said
 * nothing, which in a conformance report is the one answer that cannot be checked.
 *
 * The criteria, and what each case here really measures:
 *
 * - **1.4.10 Reflow** — 320 CSS pixels wide, no scrolling on the inline axis. That number is
 *   the criterion's own: 1280 px at 400% zoom is 320 px of layout.
 * - **1.4.4 Resize Text** — text at 200% with no loss of content. Measured as text that no
 *   longer fits a box that clips.
 * - **1.4.12 Text Spacing** — the reader's line height, letter, word and paragraph spacing
 *   applied over everything, again with nothing cut off. The four values are the criterion's.
 * - **2.4.11 Focus Not Obscured (Minimum)** — the element the keyboard is on is not entirely
 *   hidden by content the author put on top of it. The library draws exactly one thing that
 *   can do that — the toast stack, which is `position: fixed` in a corner — so the case opens
 *   one and walks the page's controls under it.
 *
 * **What "clipped" means here, and why it is not "overflowing".** A page that scrolls
 * vertically is not a defect; a box whose own `overflow` is `hidden` and whose content no
 * longer fits it IS one, because that content is unreachable by any means. So the reading is
 * taken only on elements that clip, and only on the axis they clip.
 */

/** The criterion's own four declarations (1.4.12), as a stylesheet the reader could write. */
const TEXT_SPACING = `
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-block-end: 2em !important; }
`;

/**
 * Elements that clip their own content and no longer fit it.
 *
 * The exclusions are the two shapes that clip ON PURPOSE and would otherwise be reported on
 * every page: the live regions, which are a 1×1 box holding a whole sentence
 * ([`lesson-83`](../../../docs/lessons.md#lesson-83)), and anything a stylesheet has put out
 * of sight the same way. Both are recognised by the box being smaller than a character rather
 * than by a class name, so a third one written tomorrow is covered without an edit here.
 */
async function clipped(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width <= 2 || rect.height <= 2) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
      const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
      const cutY = clipsY && el.scrollHeight > el.clientHeight + 1;
      const cutX = clipsX && el.scrollWidth > el.clientWidth + 1;
      if (!cutY && !cutX) continue;
      const name =
        el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : '') +
        (typeof el.className === 'string' && el.className
          ? `.${el.className.trim().split(/\s+/).join('.')}`
          : '');
      out.push(
        `${name} ${cutX ? `x ${el.scrollWidth}>${el.clientWidth} ` : ''}` +
          `${cutY ? `y ${el.scrollHeight}>${el.clientHeight}` : ''}`.trim(),
      );
    }
    return out;
  });
}

/** How far the document may be scrolled sideways — zero, on every view. */
const sidewaysOverflow = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });

/** The widest thing on the page, named — a failing reflow case has to say what to fix. */
const widest = (page: Page) =>
  page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    return Array.from(document.body.querySelectorAll('*'))
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > limit + 1 && rect.width > 0)
      .slice(0, 5)
      .map(
        ({ el, rect }) =>
          `${el.tagName.toLowerCase()}${
            typeof el.className === 'string' && el.className
              ? `.${el.className.trim().split(/\s+/)[0]}`
              : ''
          } right=${Math.round(rect.right)}`,
      );
  });

test.describe('Adaptation — the reader changes the page and the content stays', () => {
  /**
   * 1.4.10 Reflow, over every view the sandbox has.
   *
   * The whole registry and not a sample: reflow breaks per PAGE, in whichever demo happens to
   * hold a wide table, a long word or a fixed width, and a sample would be a list of the views
   * somebody thought of. `shell.spec.ts` keeps that list honest against the navigation.
   *
   * One test per route rather than one walk over all of them — the a11y audit's shape, and for
   * its reasons: a walk is one name for thirty-five answers, and on the slower engines it is
   * also one timeout for thirty-five page loads.
   */
  for (const route of SBX_ROUTES) {
    test(`${route} lays out at 320 px with nothing to scroll sideways`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await visit(page, route);

      const overflow = await sidewaysOverflow(page);
      expect(
        overflow,
        `the page scrolls ${overflow}px sideways; widest: ${(
          await widest(page)
        ).join(', ')}`,
      ).toBe(0);
    });
  }

  /**
   * 1.4.4 Resize Text, on the kitchen sink.
   *
   * `/all` is every component of the library on one page, which is what this criterion needs:
   * the failure is a box with a height in it, and the question is whether ANY of them has one.
   * The root font size is doubled rather than the browser zoomed, because zoom scales the
   * layout with the text and would measure nothing — 1.4.4 is about text alone growing.
   */
  test('text at 200 % cuts nothing off', async ({ page }) => {
    await visit(page, '/all');
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(200);

    const cut = await clipped(page);
    expect(cut, `clipped at 200 % text:\n${cut.join('\n')}`).toHaveLength(0);
  });

  /**
   * 1.4.12 Text Spacing, on the same page and for the same reason.
   *
   * The four declarations are the criterion's own numbers, written with `!important` over
   * everything, which is how a reader's own stylesheet arrives.
   */
  test('the reader’s own text spacing cuts nothing off', async ({ page }) => {
    await visit(page, '/all');
    await page.addStyleTag({ content: TEXT_SPACING });
    await page.waitForTimeout(200);

    const cut = await clipped(page);
    expect(
      cut,
      `clipped under the text-spacing overrides:\n${cut.join('\n')}`,
    ).toHaveLength(0);
  });

  /**
   * 2.4.11 Focus Not Obscured (Minimum), with the one thing this library floats.
   *
   * A toast stack is `position: fixed` in a corner and outlives the press that raised it, so
   * it is the one piece of the library that can come to rest on top of a control the keyboard
   * later reaches. The case raises a STANDING toast — the kind with no clock — and then walks
   * every focusable of the view, asking at each one whether the element under the middle of
   * its own box is still itself.
   *
   * `elementsFromPoint` and not a rectangle comparison: the criterion is about what a reader
   * can SEE, and a box that overlaps another is not obscured if it is the one in front.
   */
  test('a standing toast leaves every control in front of it', async ({
    page,
  }) => {
    await visit(page, '/toast');
    await page.getByTestId('raise-standing').click();
    await page.locator('pct-toast-viewport [data-pct-part="item"]').waitFor();

    const buried = await page.evaluate(() => {
      const out: string[] = [];
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.top >= 0 &&
          r.bottom <= window.innerHeight &&
          !el.closest('pct-toast-viewport')
        );
      });

      for (const el of focusables) {
        el.focus();
        const r = el.getBoundingClientRect();
        const stack = document.elementsFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        );
        const top = stack[0];
        if (top && (top === el || el.contains(top) || top.contains(el)))
          continue;
        out.push(
          `${el.tagName.toLowerCase()}${
            el.dataset['testid'] ? `[${el.dataset['testid']}]` : ''
          } is under ${top?.tagName.toLowerCase() ?? 'nothing'}`,
        );
      }
      return out;
    });

    expect(
      buried,
      `controls hidden under the toast stack:\n${buried.join('\n')}`,
    ).toHaveLength(0);
  });
});
