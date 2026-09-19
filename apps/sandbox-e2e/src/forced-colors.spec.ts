import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';
import { styleOf, systemColors } from './support/css';

/**
 * Forced colours mode (Windows High Contrast, `forced-colors: active`).
 *
 * In that mode the browser swaps EVERY author colour for one from the user
 * palette. The tokens stop meaning anything and every state expressed by colour
 * alone disappears: two different backgrounds become the same rectangle. So the
 * tests do not check "what the colour is" — they check whether states that are
 * meant to differ still differ, and whether what should come from the palette
 * really does (req-a11y-forced-colors).
 *
 * Emulated through `visit(page, path, { media })` — the reason is in `support/dom.ts`.
 */

const FORCED = { forcedColors: 'active' } as const;

/** The background / text colour of an element, as computed by the browser. */
const bg = (page: Page, sel: string) =>
  styleOf(page.locator(sel).first(), 'background-color');

test.describe('forced-colors: active', () => {
  /**
   * A control of the gate. That the media query fires is no proof yet that the
   * browser really swaps the colours — and if it does not, every test below passes
   * on token colours and examines nothing. The reference point is an element with NO
   * forced-colors rules: its colour has to stop being a colour from the library
   * palette.
   */
  test('the emulation really does swap the author colours (a control of the gate)', async ({
    page,
  }) => {
    await visit(page, '/states');
    const fromToken = await styleOf(
      page.getByTestId('idle-button'),
      'background-color',
    );
    expect(fromToken).toBe('rgb(37, 99, 235)'); // --pct-primary, the light theme

    await visit(page, '/states', { media: FORCED });
    expect(
      await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
    ).toBe(true);

    const forced = await styleOf(
      page.getByTestId('idle-button'),
      'background-color',
    );
    expect(forced).not.toBe(fromToken);
  });

  test('the focus ring is drawn in Highlight, not in the border colour', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const input = page.getByTestId('idle-text');
    await input.focus();

    const row = page
      .getByTestId('states-idle')
      .locator('[data-pct-part="field-row"]')
      .first();
    // With no explicit rule the ring gets the forced border colour and merges with
    // the field border — it disappears exactly where it is needed most.
    //
    // `toHaveCSS` and not a read of the same value: `focus()` returns before the row has
    // been restyled around the focused input, and `.first()` resolved in that instant
    // answers for a row that is not focused yet — the forced border colour, read as the ring
    // having been drawn in the wrong one ([`lesson-192`](../../../docs/lessons.md#lesson-192)).
    // The claim is the same one; it retries, and every retry resolves the locator again.
    await expect(row).toHaveCSS('outline-color', sys.Highlight);
  });

  /**
   * The radio dot was a real defect, not a hypothesis: it is a `<div>` carrying the
   * state by background alone, so the forcing levelled it with the circle background
   * and a checked radio button looked empty.
   */
  test('a checked radio button stays distinguishable from an empty one', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });

    const checked = page
      .getByTestId('idle-radio')
      .locator('pct-radio[data-pct-checked]')
      .first();
    await expect(checked).toHaveCount(1);

    const dot = await styleOf(
      checked.locator('[data-pct-part="dot"]'),
      'background-color',
    );
    const circle = await styleOf(
      checked.locator('[data-pct-part="circle"]'),
      'background-color',
    );

    expect(dot).not.toBe(circle);
  });

  test('the checkbox tick stands out against the box', async ({ page }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const checkbox = page.getByTestId('idle-checkbox');
    await checkbox.locator('[data-pct-part="control"]').check();

    // The part is the icon's box and the drawing sits inside it, painting itself in
    // `currentColor` — so what the mode has to reach is the box's `color`, and what the
    // user sees is the `stroke` the drawing resolves it to (req-api-icons).
    const mark = checkbox.locator('[data-pct-part="mark"]');
    await expect(mark).toBeVisible();
    expect(await styleOf(mark, 'color')).toBe(sys.FieldText);
    expect(await styleOf(mark.locator('svg'), 'stroke')).toBe(sys.FieldText);
    expect(
      await styleOf(
        checkbox.locator('[data-pct-part="box"]'),
        'background-color',
      ),
    ).toBe(sys.Field);
  });

  /**
   * The switch's own answer to the same question, and it is a different one. The checkbox
   * carries its state in the PRESENCE of a shape; here both states draw the same two
   * shapes, and what changes is where the thumb stands. So the colours are deliberately
   * equal after the swap — the assertion is that they are, and that the geometry still
   * separates the two states (`req-a11y-forced-colors`).
   */
  test('the switch carries its state in the thumb’s position, not in a colour', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const host = page.getByTestId('idle-switch');
    const control = host.locator('[data-pct-part="control"]');
    const thumb = host.locator('[data-pct-part="thumb"]');
    const track = host.locator('[data-pct-part="track"]');

    const read = async () => ({
      thumb: await styleOf(thumb, 'background-color'),
      track: await styleOf(track, 'background-color'),
      x: (await thumb.boundingBox())?.x ?? 0,
    });

    await control.uncheck();
    const off = await read();
    await control.check();
    const on = await read();

    expect(on.thumb).toBe(sys.FieldText);
    expect(on.track).toBe(sys.Field);
    // The two states are indistinguishable by colour — and that is the point being made.
    expect(on.thumb).toBe(off.thumb);
    expect(on.track).toBe(off.track);
    // What tells them apart survives any palette: the thumb moved. The position is POLLED,
    // because the thumb may still be travelling when the first frame is read — under a
    // loaded machine the one-shot reading came back mid-flight (497.5 against a resting
    // 503.1), which is `lesson-130`'s family at a fourth component.
    await expect
      .poll(async () => (await thumb.boundingBox())?.x ?? 0)
      .toBeGreaterThan(off.x);
  });

  /**
   * The slider has to repaint MORE than the others, and the reason is measurable rather
   * than stylistic: `appearance: none` is what lets a range be drawn at all, and it takes
   * the platform's own high-contrast rendering with it. So every shape the eye needs —
   * the track, the part travelled and the thumb — is named from the palette here, and the
   * case is that the three are three DIFFERENT system colours (`req-a11y-forced-colors`).
   */
  test('the slider repaints every shape appearance:none took away', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const host = page.getByTestId('idle-slider');
    const read = (part: string, prop = 'background-color') =>
      styleOf(host.locator(`[data-pct-part="${part}"]`), prop);

    expect(await read('track')).toBe(sys.Field);
    expect(await read('fill')).toBe(sys.Highlight);
    expect(await read('thumb')).toBe(sys.FieldText);
    expect(await read('thumb', 'border-top-color')).toBe(sys.FieldText);

    // The travelled part and the rest of the track are what the eye reads the value off,
    // so they have to stay two colours after the swap.
    expect(await read('fill')).not.toBe(await read('track'));
  });

  /**
   * The calendar draws three facts on one square — the chosen day, today, and a day that
   * cannot be taken — and in the light theme all three are colour. After the swap the
   * palette gives back one pair, so each of the three has to be something else: the chosen
   * day takes the mode's own `Highlight` pair (which IS "this one is picked"), today keeps a
   * SHAPE, and a refused day takes `GrayText`.
   *
   * Today's ring is the case worth having: it is a `box-shadow` in the light theme, and a
   * `box-shadow` is not painted in this mode at all — so the shape is drawn again as an
   * outline, and this is what says the second drawing really arrived.
   */
  test('the calendar keeps the chosen day, today and a refused day apart', async ({
    page,
  }) => {
    // The clock is fixed inside the month the calendars stand in and away from the day they
    // hold, so "today" and "the chosen day" are two different cells whatever day the suite
    // runs on — which is the whole of what this case compares.
    await visit(page, '/date', { media: FORCED, now: '2026-08-12T12:00:00Z' });
    const sys = await systemColors(page);

    const grid = page.getByTestId('calendar-inline');
    const chosen = grid.locator('[data-pct-part="day"][data-pct-chosen]');
    await expect(chosen).toHaveCount(1);
    expect(await styleOf(chosen, 'background-color')).toBe(sys.Highlight);
    expect(await styleOf(chosen, 'color')).toBe(sys.HighlightText);

    // Today's ring. It is a `box-shadow` in the light theme, and chromium and firefox force
    // `box-shadow` to `none` in this mode while webkit leaves it — so the shape is drawn
    // again as an outline and both halves are written out (`lesson-119`).
    const today = grid.locator(
      '[data-pct-part="day"][data-pct-today]:not([data-pct-chosen])',
    );
    await expect(today).toHaveCount(1);
    expect(await styleOf(today, 'outline-style')).toBe('solid');

    // A day outside the bounds. The panel lives outside the host tree, so it is looked for
    // on the page once the button beside the bounded field has opened it.
    await page
      .getByTestId('date-bounded')
      .locator('[data-pct-part="toggle"]')
      .click();
    const refused = page
      .locator('[data-pct-part="panel"]')
      .locator('[data-pct-part="day"][data-pct-disabled]')
      .first();
    await expect(refused).toBeVisible();
    expect(await styleOf(refused, 'color')).toBe(sys.GrayText);
  });

  /**
   * The hardest case: in a list panel an ordinary option, a selected one and the one
   * active from the keyboard differ by background ALONE. After the palette swap all
   * three would be the same rectangle, so the selection was split into two
   * independent channels — the background for the selection, an outline for the
   * keyboard cursor.
   */
  test('in a list panel the selection and the keyboard cursor stay distinguishable', async ({
    page,
  }) => {
    await visit(page, '/select', { media: FORCED });
    const sys = await systemColors(page);

    const trigger = page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]');
    await trigger.click();
    const options = page.locator('[data-pct-part="option"]');
    await expect(options.first()).toBeVisible();

    // The selection: a palette pair of its own, meant in it for exactly list
    // selections.
    await options.nth(1).click();
    await trigger.click();
    const selected = options
      .locator('[data-pct-selected]')
      .or(page.locator('[data-pct-part="option"][data-pct-selected]'));
    expect(await bg(page, '[data-pct-part="option"][data-pct-selected]')).toBe(
      sys.SelectedItem,
    );
    await expect(selected.first()).toBeVisible();

    // An ordinary option stands on the panel surface — so it differs from a selected
    // one.
    expect(
      await bg(page, '[data-pct-part="option"]:not([data-pct-selected])'),
    ).toBe(sys.Canvas);

    // The keyboard cursor: an outline, that is a channel independent of the
    // background. Thanks to that an option both selected and active shows both
    // states at once.
    await trigger.press('ArrowDown');
    const active = page.locator('[data-pct-part="option"][data-pct-active]');
    await expect(active).toHaveCount(1);
    expect(await styleOf(active, 'outline-color')).toBe(sys.Highlight);
    expect(await styleOf(active, 'outline-style')).toBe('solid');
  });

  /**
   * The veil is a translucent black in every theme, and forced colours has no translucent
   * system colour to swap it for. Left alone it would be repainted opaque by the mode's own
   * rules and the page behind it would go on showing through in strips — so the sheet says
   * `Canvas` outright, and the panel keeps its edge in `CanvasText`. Without that edge a
   * dialog in this mode is a rectangle of page on a rectangle of page.
   */
  test('the dialog keeps an edge against the surface it covers', async ({
    page,
  }) => {
    await visit(page, '/dialog', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('open-basic').click();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    expect(await bg(page, '[data-pct-part="backdrop"]')).toBe(sys.Canvas);
    expect(await bg(page, '[data-pct-part="panel"]')).toBe(sys.Canvas);
    // The one thing that separates the two is the border, and it comes from the palette.
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);
  });

  /**
   * A tooltip is an inverted surface, and inversion is the first thing this mode takes away:
   * the panel and the page behind it both become `Canvas`. What is left to tell them apart is
   * an edge, and the sheet draws one here and nowhere else — without it a tooltip in this mode
   * is a rectangle of page floating on a rectangle of page.
   */
  test('the tooltip keeps an edge once its inversion is gone', async ({
    page,
  }) => {
    await visit(page, '/tooltip', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('describes-trigger').hover();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    expect(await bg(page, '[data-pct-part="panel"]')).toBe(sys.Canvas);
    expect(await styleOf(panel, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-style')).toBe('solid');
  });

  /**
   * A popover draws the page's own surface, so this mode changes nothing about the colour —
   * and takes away the shadow that was separating the panel from the page. The edge is what
   * is left, and it has to be the system's rather than the skin's `border-strong`, which the
   * mode does not keep either.
   */
  test('the popover keeps a system edge once the shadow is gone', async ({
    page,
  }) => {
    await visit(page, '/popover', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('panel-trigger').click();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    expect(await bg(page, '[data-pct-part="panel"]')).toBe(sys.Canvas);
    expect(await styleOf(panel, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-style')).toBe('solid');
  });

  /**
   * The row a user is on is the one piece of state a menu carries, and in this mode a
   * background is the only way left to carry it — the skin's `surface-100` is not kept. So the
   * highlighted row is the system's own selected pair — the mapping `field.scss` writes down
   * for a selected list item — and a disabled row is `GrayText`: two
   * states that a screenshot in the ordinary mode would show and this mode would silently
   * flatten into one ([`lesson-70`](../../../docs/lessons.md#lesson-70)).
   */
  test('the menu carries its row on the system colours', async ({ page }) => {
    await visit(page, '/menu', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('actions-trigger').click();
    const panel = page.locator('[role="menu"]').first();
    await expect(panel).toBeVisible();

    expect(await bg(page, '[role="menu"]')).toBe(sys.Canvas);
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);

    const active = page.getByTestId('item-rename');
    expect(await styleOf(active, 'background-color')).toBe(sys.SelectedItem);
    expect(await styleOf(active, 'color')).toBe(sys.SelectedItemText);

    const off = page.getByTestId('item-archive');
    expect(await styleOf(off, 'color')).toBe(sys.GrayText);
    expect(await styleOf(off, 'background-color')).toBe(sys.Canvas);
  });

  /**
   * A message card in this mode is a rectangle of `Canvas` on a page of `Canvas`, so the edge
   * is the whole of what says where it ends — the popover's situation exactly. What is new
   * here is the second reading INSIDE the card: the sentence and the control that acts on it
   * are the same colour in the ordinary mode only because the skin says so, and this mode
   * keeps them apart on its own terms — `CanvasText` for what is read, `LinkText` for what can
   * be pressed for its own sake.
   */
  test('a message keeps its edge, and its action apart from its sentence', async ({
    page,
  }) => {
    await visit(page, '/toast', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('raise-action').click();
    const item = page.locator('[data-pct-part="item"]').first();
    await expect(item).toBeVisible();

    expect(await styleOf(item, 'background-color')).toBe(sys.Canvas);
    expect(await styleOf(item, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(item, 'border-top-style')).toBe('solid');

    const message = item.locator('[data-pct-part="message"]');
    const action = item.locator('[data-pct-part="action"]');
    expect(await styleOf(message, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(action, 'color')).toBe(sys.LinkText);
    expect(await styleOf(action, 'color')).not.toBe(
      await styleOf(message, 'color'),
    );
    expect(
      await styleOf(item.locator('[data-pct-part="close"]'), 'color'),
    ).toBe(sys.CanvasText);
  });

  /**
   * A drawer has no veil, so in this mode the border is the whole of what says where the panel
   * stops — and the mode paints every surface `Canvas`, the page behind it included. A panel
   * that lost its edge would be an unbroken field of one colour with a heading somewhere in
   * the middle of it, which is the state `req-a11y-forced-colors` exists to prevent.
   */
  test('the drawer keeps an edge against a page painted the same colour', async ({
    page,
  }) => {
    await visit(page, '/drawer', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('trigger-nav').click();
    const nav = page.getByTestId('drawer-nav');
    await expect(nav).toHaveAttribute('data-pct-open', '');

    expect(await styleOf(nav, 'background-color')).toBe(sys.Canvas);
    expect(await styleOf(nav, 'border-inline-end-color')).toBe(sys.CanvasText);
    expect(
      await styleOf(nav.locator('[data-pct-part="heading"]'), 'color'),
    ).toBe(sys.CanvasText);
    expect(await styleOf(nav.locator('[data-pct-part="close"]'), 'color')).toBe(
      sys.CanvasText,
    );
  });

  /**
   * The accordion has almost nothing to lose here, and that is the reading worth recording:
   * whether a section is open is announced by the platform rather than drawn, so the mode
   * cannot flatten the one state that matters. What it CAN flatten is the heading row's three
   * colours, and the one this component has to keep apart from the rest is the refused
   * section — the mode has exactly one word for it.
   */
  test('a section nobody may open says GrayText, and the rest say CanvasText', async ({
    page,
  }) => {
    await visit(page, '/accordion', { media: FORCED });
    const sys = await systemColors(page);

    const ordinary = page
      .getByTestId('item-open')
      .locator('[data-pct-part="heading"]');
    const refused = page
      .getByTestId('item-refused')
      .locator('[data-pct-part="heading"]');

    expect(await styleOf(ordinary, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(refused, 'color')).toBe(sys.GrayText);

    // The marker gives its colour back to the row in this mode, and the case exists because
    // it did not at first: with `color` still coming from the token, the engine substituted
    // the marker on its own and a refused section had a `GrayText` title beside a marker in a
    // different colour. `currentColor` in the drawing resolves against the marker's own
    // `color`, which is the thing the skin overrides — so inheriting is what makes the pair
    // one colour.
    expect(
      await styleOf(
        page.getByTestId('item-refused').locator('[data-pct-part="marker"]'),
        'color',
      ),
    ).toBe(sys.GrayText);
  });

  /**
   * The chosen tab is the state this mode is most likely to level: it is told apart by a
   * colour and by an edge, and the mode substitutes both. The edge survives because it is
   * drawn on EVERY tab and only its colour differs — `Canvas` on a `Canvas` page for the ones
   * not chosen, `Highlight` for the one that is — so what the reader is left with is a line
   * that is there against lines that are not, which no palette can flatten.
   */
  test('the chosen tab keeps its mark under the user palette', async ({
    page,
  }) => {
    await visit(page, '/tabs', { media: FORCED });
    const sys = await systemColors(page);

    const strip = page.getByTestId('tabs-basic');
    const chosen = strip.locator('[data-pct-part="tab"][data-pct-chosen]');
    const other = strip
      .locator('[data-pct-part="tab"]:not([data-pct-chosen])')
      .first();

    expect(await styleOf(chosen, 'border-bottom-color')).toBe(sys.Highlight);
    expect(await styleOf(chosen, 'color')).toBe(sys.Highlight);
    expect(await styleOf(other, 'border-bottom-color')).toBe(sys.Canvas);
    expect(await styleOf(chosen, 'border-bottom-color')).not.toBe(
      await styleOf(other, 'border-bottom-color'),
    );

    // A tab nobody can choose reads as unavailable here too, and by the one word the mode
    // has for it.
    expect(
      await styleOf(
        strip.locator('[data-pct-part="tab"][data-pct-disabled]'),
        'color',
      ),
    ).toBe(sys.GrayText);
  });

  /**
   * The pager's one state is "this is the page you are on", and in the ordinary skin it is
   * carried by a fill and a text colour. Both of those are gone in this mode, so the case
   * that matters is whether the substitution keeps the two APART — a current page painted
   * `Canvas` on `CanvasText` like every other button would leave the number the reader is
   * standing on indistinguishable from the ones they are not. `Highlight`/`HighlightText` is
   * the pair the palette has for exactly that, and `aria-current` carries the same fact for
   * anyone not looking at colours at all.
   */
  test('the current page keeps a colour of its own under the user palette', async ({
    page,
  }) => {
    await visit(page, '/pagination', { media: FORCED });
    const sys = await systemColors(page);

    const pager = page.getByTestId('pagination-many');
    const current = pager.locator('[data-pct-part="page"][data-pct-current]');
    const plain = pager
      .locator('[data-pct-part="page"]:not([data-pct-current])')
      .first();

    await expect(current).toHaveAttribute('aria-current', 'page');

    expect(await styleOf(current, 'background-color')).toBe(sys.Highlight);
    expect(await styleOf(current, 'color')).toBe(sys.HighlightText);

    expect(await styleOf(plain, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(plain, 'background-color')).not.toBe(sys.Highlight);

    // A stepper with nowhere to go says the one word the palette has for "refused", and the
    // gap says the one it has for "text" — neither of them borrows the current page's colour.
    expect(
      await styleOf(
        page
          .getByTestId('pagination-few')
          .locator('[data-pct-part="previous"]'),
        'color',
      ),
    ).toBe(sys.GrayText);
    expect(
      await styleOf(
        pager.locator('[data-pct-part="ellipsis"]').first(),
        'color',
      ),
    ).toBe(sys.CanvasText);
  });

  /**
   * The measurement that decided how the bar is drawn at all.
   *
   * In this mode the browser forces every author background to `Canvas` and drops every
   * background IMAGE that is not a `url()` — a gradient among them. So the two shapes a
   * progress bar is usually built from behave differently: a fill painted as an ELEMENT with
   * a background colour can be given a system colour and survives, while a band painted as a
   * moving gradient is gone, and gone in exactly the mode where the contrast matters most
   * (`lesson-134`). Both bars here are the surviving kind, and the groove keeps its extent
   * through an outline rather than a border, since the fill is positioned over it.
   */
  test('a progress bar keeps its fill, its band and the groove they travel', async ({
    page,
  }) => {
    await visit(page, '/progress', { media: FORCED });
    const sys = await systemColors(page);

    const groove = page
      .getByTestId('progress-value')
      .locator('[data-pct-part="track"]');
    const fill = page
      .getByTestId('progress-value')
      .locator('[data-pct-part="fill"]');
    const band = page
      .getByTestId('progress-indeterminate')
      .locator('[data-pct-part="fill"]');

    expect(await styleOf(fill, 'background-color')).toBe(sys.Highlight);
    expect(await styleOf(band, 'background-color')).toBe(sys.Highlight);

    // The groove is the page's own surface in this mode, so what says where it ends is the
    // outline — and the fill has to stay distinguishable from it.
    expect(await styleOf(groove, 'background-color')).toBe(sys.Field);

    // The ring is read on the box that DRAWS it, and that is the part the card names: an
    // outline is erased by an ancestor's clip, so it is written on the clipping box itself.
    // This assertion used to stand on the `track`, where `outline-color` with no outline
    // computes to `currentColor` — `CanvasText` here — so it passed on the fallback and asked
    // nothing. The width is read beside the colour for exactly that reason.
    const clip = page
      .getByTestId('progress-value')
      .locator('[data-pct-part="bar"]');
    expect(await styleOf(clip, 'outline-color')).toBe(sys.CanvasText);
    expect(await styleOf(clip, 'outline-width')).toBe('1px');
    expect(await styleOf(clip, 'outline-style')).toBe('solid');
    expect(await styleOf(groove, 'background-color')).not.toBe(sys.Highlight);
  });

  /**
   * A skeleton is two greys, and two greys are ONE colour in this mode: the browser forces
   * every author background to the user's palette, so a placeholder and the sheen travelling
   * across it arrive as the same rectangle unless something is written for them
   * (`lesson-134`). What is written is the progress bar's division one component over — the
   * box keeps its EXTENT through an outline, and the motion keeps a colour of its own.
   *
   * `GrayText` rather than `Highlight`, and the choice is the point: a wall of highlighted
   * blocks would be a page shouting that nothing has happened yet, while `GrayText` is the
   * palette's own word for "not live", which is what a placeholder is.
   */
  test('a skeleton keeps its extent and its sheen apart in the user palette', async ({
    page,
  }) => {
    await visit(page, '/skeleton', { media: FORCED });
    const sys = await systemColors(page);

    const bar = page
      .getByTestId('skeleton-text')
      .locator('[data-pct-part="track"]')
      .first();
    const sheen = bar.locator('[data-pct-part="fill"]');

    expect(await styleOf(bar, 'background-color')).toBe(sys.Canvas);
    expect(await styleOf(bar, 'outline-color')).toBe(sys.GrayText);
    expect(await styleOf(sheen, 'background-color')).toBe(sys.GrayText);

    // The two have to stay apart, which is the whole reading: the mode had one colour for
    // both of them and the rules above take that back.
    expect(await styleOf(sheen, 'background-color')).not.toBe(
      await styleOf(bar, 'background-color'),
    );
  });

  /**
   * A chip is a pill whose INSIDE is one step of the ramp — exactly the fill this mode
   * drops. What has to survive is the boundary and the control: the border was drawn in the
   * author palette for this moment (0051), the cross takes the palette's own word for a
   * control, and hover answers in a channel that is not the author's fill.
   */
  test('a chip keeps its boundary and its cross in the user palette', async ({
    page,
  }) => {
    await visit(page, '/chips', { media: FORCED });
    const sys = await systemColors(page);

    const chip = page.getByTestId('row').locator('pct-chip').first();
    const cross = chip.locator('[data-pct-part="remove"]');

    expect(await styleOf(chip, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(cross, 'color')).toBe(sys.ButtonText);

    await cross.hover();
    expect(await styleOf(cross, 'background-color')).toBe(sys.Highlight);
    expect(await styleOf(cross, 'color')).toBe(sys.HighlightText);
  });

  /**
   * An avatar's fill is one step of the ramp and its glyphs ride on author colours — both
   * go with the mode. What has to stand is the ring (the box's one surviving boundary,
   * 0052) and the initials as ordinary text in the user palette.
   */
  test('an avatar keeps its ring and its initials in the user palette', async ({
    page,
  }) => {
    await visit(page, '/avatar', { media: FORCED });
    const sys = await systemColors(page);

    const dead = page.getByTestId('dead');
    await expect(dead.locator('[data-pct-part="initials"]')).toBeVisible();

    expect(await styleOf(dead, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(dead, 'color')).toBe(sys.CanvasText);
    expect(
      await styleOf(
        page.getByTestId('nobody').locator('[data-pct-part="silhouette"]'),
        'color',
      ),
    ).toBe(sys.CanvasText);
  });

  /**
   * Both tones of a badge drop to the palette's one word for text in a box — which is the
   * component's own argument made visible: a page that said something by tone alone was
   * already saying nothing here, and the border is what keeps the box a box (0053).
   */
  test('a badge’s two tones become one palette, and the box keeps its edge', async ({
    page,
  }) => {
    await visit(page, '/badge', { media: FORCED });
    const sys = await systemColors(page);

    for (const id of ['tone-neutral', 'tone-danger'] as const) {
      const badge = page.getByTestId(id);
      expect(await styleOf(badge, 'color'), id).toBe(sys.CanvasText);
      expect(await styleOf(badge, 'border-top-color'), id).toBe(sys.CanvasText);
    }
  });

  /**
   * In a trail every anchor wears the palette's one word for a link — the rest colours and
   * the current colour go with the mode together, which is why 0054 gave the current step a
   * WEIGHT: the one channel of the pair that survives. The separator is decoration and
   * takes the text word; the current step spelled as bare text is not a link, so the
   * palette itself tells it apart.
   */
  test('a trail’s links wear LinkText and the current step keeps its weight', async ({
    page,
  }) => {
    await visit(page, '/breadcrumb', { media: FORCED });
    const sys = await systemColors(page);

    const trail = page.getByTestId('trail');
    const rest = trail.locator('.pct-breadcrumb__link').first();
    const current = trail.locator('[aria-current="page"]');

    expect(await styleOf(rest, 'color')).toBe(sys.LinkText);
    expect(await styleOf(current, 'color')).toBe(sys.LinkText);
    expect(await styleOf(current, 'font-weight')).not.toBe(
      await styleOf(rest, 'font-weight'),
    );
    expect(
      await styleOf(
        trail.locator('[data-pct-part="separator"]').nth(1),
        'color',
      ),
    ).toBe(sys.CanvasText);

    // The other spelling of "you are here": bare text is no link, and the palette says so.
    const plain = page.getByTestId('trail-plain').locator('pct-crumb').last();
    expect(await styleOf(plain, 'color')).toBe(sys.CanvasText);
  });

  /**
   * A stepper's two filled markers ride on the accent — exactly what this mode drops.
   * What has to stand: every circle's border, the check as a drawing in the text word
   * (done stays visibly done), the connector's line, and the current step's label WEIGHT
   * — the channel 0055 chose because no palette can take it.
   */
  test('a stepper keeps its circles, its check and the current step’s weight', async ({
    page,
  }) => {
    await visit(page, '/stepper', { media: FORCED });
    const sys = await systemColors(page);

    const journey = page.getByTestId('journey');
    const markers = journey.locator('[data-pct-part="marker"]');
    expect(await styleOf(markers.first(), 'border-top-color')).toBe(
      sys.CanvasText,
    );
    expect(await styleOf(markers.first(), 'color')).toBe(sys.CanvasText);
    await expect(markers.first().locator('svg')).toBeVisible();
    expect(
      await styleOf(
        journey.locator('[data-pct-part="track"]').nth(1),
        'background-color',
      ),
    ).toBe(sys.CanvasText);

    const current = journey.locator('[aria-current="step"]');
    const upcoming = journey.locator('[data-pct-state="upcoming"]').first();
    expect(await styleOf(current, 'font-weight')).not.toBe(
      await styleOf(upcoming, 'font-weight'),
    );
  });

  /**
   * A tree's chosen row rides on the accent — dropped with every author colour. What
   * stands: the chosen row in the palette's own highlight pair (the aria state made
   * visible), the arrow in the text word, and the rows around it on the plain canvas.
   */
  test('a tree’s chosen row stands in Highlight and the arrows in CanvasText', async ({
    page,
  }) => {
    await visit(page, '/tree', { media: FORCED });
    const sys = await systemColors(page);

    const chosen = page
      .locator('pct-tree-item[value="src/app.ts"]')
      .locator('[data-pct-part="label"]');
    expect(await styleOf(chosen, 'background-color')).toBe(sys.Highlight);
    expect(await styleOf(chosen, 'color')).toBe(sys.HighlightText);

    const restingArrow = page
      .locator('pct-tree-item[value="docs"]')
      .locator('[data-pct-part="arrow"]')
      .first();
    expect(await styleOf(restingArrow, 'color')).toBe(sys.CanvasText);
  });

  test('the disabled state says GrayText in every control', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const cases: Record<string, Promise<string>> = {
      button: styleOf(page.getByTestId('disabled-button'), 'color'),
      'text field': styleOf(page.getByTestId('disabled-text'), 'color'),
      'radio dot': styleOf(
        page
          .getByTestId('disabled-radio')
          .locator('[data-pct-part="dot"]')
          .first(),
        'background-color',
      ),
      'checkbox tick': styleOf(
        page
          .getByTestId('disabled-checkbox')
          .locator('[data-pct-part="mark"] svg'),
        'stroke',
      ),
      'switch thumb': styleOf(
        page.getByTestId('disabled-switch').locator('[data-pct-part="thumb"]'),
        'background-color',
      ),
      'slider fill': styleOf(
        page.getByTestId('disabled-slider').locator('[data-pct-part="fill"]'),
        'background-color',
      ),
      'slider thumb': styleOf(
        page.getByTestId('disabled-slider').locator('[data-pct-part="thumb"]'),
        'background-color',
      ),
    };

    for (const [name, measurement] of Object.entries(cases)) {
      expect(await measurement, `${name} does not use GrayText`).toBe(
        sys.GrayText,
      );
    }
  });

  /**
   * The hero gradient is an IMAGE, and the forcing strips colours, not images — left
   * alone it would keep painting over the forced ButtonFace (the skeleton's shimmer,
   * one component over). And the boundary-less variants would melt into the Canvas:
   * `transparent` keeps its alpha through the forcing, so a button whose only edge was
   * a tint has no edge at all until the stylesheet gives it one back.
   */
  test('the hero drops its gradient, and the boundary-less faces get an edge back', async ({
    page,
  }) => {
    await visit(page, '/button', { media: FORCED });
    const sys = await systemColors(page);

    const hero = page.getByTestId('btn-hero');
    expect(await styleOf(hero, 'background-image')).toBe('none');
    expect(await styleOf(hero, 'animation-name')).toBe('none');

    for (const id of ['btn-ghost', 'btn-soft', 'btn-hero'] as const) {
      expect(
        await styleOf(page.getByTestId(id), 'border-color'),
        `${id} has no visible edge`,
      ).toBe(sys.ButtonText);
    }
  });

  /**
   * The tone is a colour, and this mode takes colours away. That is not a gap in the axis but
   * the reason the library refuses to let a tone be the only channel (0076, 0082): under a
   * forced palette all four tones and the untoned button paint the same system colours, and
   * what is left saying which button does what is the label. A page that said "dangerous" by
   * red alone was already saying nothing to these readers, and nothing here can add it back.
   */
  test('a tone is gone under a forced palette, and every face reads the same', async ({
    page,
  }) => {
    await visit(page, '/button', { media: FORCED });
    const sys = await systemColors(page);

    // Not "what colour is it" but "does anything still tell them apart" — the question this
    // whole file asks. The untoned button is the yardstick: whatever the palette hands it is
    // what every toned one has to read as too.
    const paint = async (id: string) => ({
      bg: await styleOf(page.getByTestId(id), 'background-color'),
      fg: await styleOf(page.getByTestId(id), 'color'),
    });

    const plain = await paint('btn-solid');
    expect(plain.fg).toBe(sys.ButtonText);
    for (const id of [
      'btn-danger-solid',
      'btn-warning-solid',
      'btn-success-solid',
      'btn-info-solid',
    ] as const) {
      expect(await paint(id), `${id} kept something of its tone`).toEqual(
        plain,
      );
    }

    // And the soft face, whose tint is the first thing a flattening takes: the edge the
    // stylesheet hands back is the same for a toned button as for an untoned one.
    const quiet = await styleOf(page.getByTestId('btn-soft'), 'border-color');
    expect(quiet).toBe(sys.ButtonText);
    expect(
      await styleOf(page.getByTestId('btn-danger-soft'), 'border-color'),
    ).toBe(quiet);
  });

  /**
   * Forced colours strips colours and keeps IMAGES, so a gradient left alone goes on painting
   * over the forced Canvas — the skeleton's shimmer and the site's own rim in one. All three
   * faces of `pctHero` drop theirs, and the word comes back as a word: `CanvasText` is what
   * the mode paints prose in, and a system colour is the one thing an author rule may still
   * say here (0065).
   */
  test('every face of the hero drops its gradient, and the word comes back', async ({
    page,
  }) => {
    await visit(page, '/hero', { media: FORCED });
    const sys = await systemColors(page);

    const imageOf = (testId: string, pseudo: string | null = null) =>
      page
        .getByTestId(testId)
        .evaluate(
          (el, pseudo) =>
            getComputedStyle(el, pseudo || undefined).backgroundImage,
          pseudo,
        );

    expect(await imageOf('hero-edge', '::after')).toBe('none');
    expect(await imageOf('hero-fill')).toBe('none');
    expect(await imageOf('hero-text')).toBe('none');
    expect(await styleOf(page.getByTestId('hero-text'), 'color')).toBe(
      sys.CanvasText,
    );
  });

  /**
   * The same face on a link, and the mode reads it as a link whatever the stylesheet
   * said: an `<a>` is painted `LinkText` on `Canvas` where a `<button>` gets
   * `ButtonText` on `ButtonFace`. So the edge the boundary-less faces get back has to
   * be the link's colour too, or the control disagrees with itself — and the disabled
   * link keeps `GrayText`, because a system colour is the one thing an author rule may
   * still say here (0071).
   */
  test('a link wearing the face is painted as a link, edge and all', async ({
    page,
  }) => {
    await visit(page, '/button', { media: FORCED });
    const sys = await systemColors(page);

    const hero = page.getByTestId('link-hero');
    expect(await styleOf(hero, 'background-image')).toBe('none');
    expect(await styleOf(hero, 'color')).toBe(sys.LinkText);
    expect(await styleOf(hero, 'border-color')).toBe(sys.LinkText);

    expect(await styleOf(page.getByTestId('link-disabled'), 'color')).toBe(
      sys.GrayText,
    );
  });
});
