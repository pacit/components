import type { TestElement } from '@angular/cdk/testing';
import { PctHarness } from './harness';

/*
 * One harness per component and directive a card names, as declarations over the parts
 * inventory: the host selector, verbatim the component's own, and the parts it draws. The
 * behaviour is in `PctHarness`, but for the reads a component's own shape asks for — the data
 * table's rows, cells and sort presses; what stands here is held to the built package by
 * `tools/check-harness.mjs` in both directions, and the union in each `extends` clause —
 * what a consumer's editor offers after `part(` — is held to the same list.
 */

// ── @pacit/components/accordion ─────────────────────────────────────────────────

/**
 * `pct-accordion` — `PctAccordion`.
 *
 * @since 0.1.0
 */
export class PctAccordionHarness extends PctHarness<never> {
  static override hostSelector = 'pct-accordion';
  static override readonly parts = [] as const;
}

/**
 * `pct-accordion-item` — `PctAccordionItem`.
 *
 * @since 0.1.0
 */
export class PctAccordionItemHarness extends PctHarness<
  'heading' | 'item' | 'marker' | 'panel'
> {
  static override hostSelector = 'pct-accordion-item';
  static override readonly parts = [
    'heading',
    'item',
    'marker',
    'panel',
  ] as const;
}

// ── @pacit/components/avatar ────────────────────────────────────────────────────

/**
 * `pct-avatar` — `PctAvatar`.
 *
 * @since 0.1.0
 */
export class PctAvatarHarness extends PctHarness<
  'image' | 'initials' | 'silhouette'
> {
  static override hostSelector = 'pct-avatar';
  static override readonly parts = ['image', 'initials', 'silhouette'] as const;
}

// ── @pacit/components/badge ─────────────────────────────────────────────────────

/**
 * `pct-badge` — `PctBadge`.
 *
 * @since 0.1.0
 */
export class PctBadgeHarness extends PctHarness<never> {
  static override hostSelector = 'pct-badge';
  static override readonly parts = [] as const;
}

// ── @pacit/components/breadcrumb ────────────────────────────────────────────────

/**
 * `pct-breadcrumb` — `PctBreadcrumb`.
 *
 * @since 0.1.0
 */
export class PctBreadcrumbHarness extends PctHarness<'list'> {
  static override hostSelector = 'pct-breadcrumb';
  static override readonly parts = ['list'] as const;
}

/**
 * `pct-crumb` — `PctCrumb`.
 *
 * @since 0.1.0
 */
export class PctCrumbHarness extends PctHarness<'separator'> {
  static override hostSelector = 'pct-crumb';
  static override readonly parts = ['separator'] as const;
}

/**
 * `a[pctCrumbLink]` — `PctCrumbLink`.
 *
 * @since 0.1.0
 */
export class PctCrumbLinkHarness extends PctHarness<never> {
  static override hostSelector = 'a[pctCrumbLink]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/button ────────────────────────────────────────────────────

/**
 * `button[pctButton], a[pctButton]` — `PctButton`.
 *
 * @since 0.1.0
 */
export class PctButtonHarness extends PctHarness<'label' | 'spinner'> {
  static override hostSelector = 'button[pctButton], a[pctButton]';
  static override readonly parts = ['label', 'spinner'] as const;
}

// ── @pacit/components/chart ─────────────────────────────────────────────────────

/**
 * `pct-chart` — `PctChart`: the plot, its two layers, the grid, the value axes' units and the
 * message of an empty chart.
 *
 * @since next
 */
export class PctChartHarness extends PctHarness<
  'axis' | 'data' | 'grid' | 'message' | 'plot' | 'unit'
> {
  static override hostSelector = 'pct-chart';
  static override readonly parts = [
    'axis',
    'data',
    'grid',
    'message',
    'plot',
    'unit',
  ] as const;
}

/**
 * `pct-line` — `PctLine`. Its drawing is stamped into the chart's data layer, so its parts are
 * found in the document rather than under its own element.
 *
 * @since next
 */
export class PctLineHarness extends PctHarness<'area' | 'series'> {
  static override hostSelector = 'pct-line';
  static override readonly parts = ['area', 'series'] as const;
}

// ── @pacit/components/checkbox ──────────────────────────────────────────────────

/**
 * `pct-checkbox` — `PctCheckbox`.
 *
 * @since 0.1.0
 */
export class PctCheckboxHarness extends PctHarness<
  'box' | 'control' | 'error' | 'hint' | 'label' | 'mark' | 'warning'
> {
  static override hostSelector = 'pct-checkbox';
  static override readonly parts = [
    'box',
    'control',
    'error',
    'hint',
    'label',
    'mark',
    'warning',
  ] as const;
}

// ── @pacit/components/chips ─────────────────────────────────────────────────────

/**
 * `pct-chip` — `PctChip`.
 *
 * @since 0.1.0
 */
export class PctChipHarness extends PctHarness<'label' | 'remove'> {
  static override hostSelector = 'pct-chip';
  static override readonly parts = ['label', 'remove'] as const;
}

/**
 * `pct-chips` — `PctChips`.
 *
 * @since 0.1.0
 */
export class PctChipsHarness extends PctHarness<never> {
  static override hostSelector = 'pct-chips';
  static override readonly parts = [] as const;
}

// ── @pacit/components/container ─────────────────────────────────────────────────

/**
 * `pct-container` — `PctContainer`.
 *
 * @since 0.1.0
 */
export class PctContainerHarness extends PctHarness<never> {
  static override hostSelector = 'pct-container';
  static override readonly parts = [] as const;
}

// ── @pacit/components/date ──────────────────────────────────────────────────────

/**
 * `pct-calendar` — `PctCalendar`.
 *
 * @since 0.1.0
 */
export class PctCalendarHarness extends PctHarness<
  'caption' | 'day' | 'grid' | 'nav' | 'week' | 'weekday'
> {
  static override hostSelector = 'pct-calendar';
  static override readonly parts = [
    'caption',
    'day',
    'grid',
    'nav',
    'week',
    'weekday',
  ] as const;
}

/**
 * `pct-date` — `PctDate`.
 *
 * @since 0.1.0
 */
export class PctDateHarness extends PctHarness<
  'control' | 'error' | 'hint' | 'label' | 'panel' | 'toggle' | 'warning'
> {
  static override hostSelector = 'pct-date';
  static override readonly parts = [
    'control',
    'error',
    'hint',
    'label',
    'panel',
    'toggle',
    'warning',
  ] as const;
}

// ── @pacit/components/datetime ──────────────────────────────────────────────────

/**
 * `pct-datetime` — `PctDatetime`.
 *
 * @since next
 */
export class PctDatetimeHarness extends PctHarness<
  | 'date-control'
  | 'error'
  | 'hint'
  | 'label'
  | 'panel'
  | 'time-control'
  | 'toggle'
  | 'warning'
> {
  static override hostSelector = 'pct-datetime';
  static override readonly parts = [
    'date-control',
    'error',
    'hint',
    'label',
    'panel',
    'time-control',
    'toggle',
    'warning',
  ] as const;
}

// ── @pacit/components/dialog ────────────────────────────────────────────────────

/**
 * `pct-dialog` — `PctDialog`.
 *
 * @since 0.1.0
 */
export class PctDialogHarness extends PctHarness<
  'backdrop' | 'close' | 'content' | 'header' | 'heading' | 'panel'
> {
  static override hostSelector = 'pct-dialog';
  static override readonly parts = [
    'backdrop',
    'close',
    'content',
    'header',
    'heading',
    'panel',
  ] as const;
}

// ── @pacit/components/drawer ────────────────────────────────────────────────────

/**
 * `pct-drawer` — `PctDrawer`.
 *
 * @since 0.1.0
 */
export class PctDrawerHarness extends PctHarness<
  'close' | 'content' | 'header' | 'heading'
> {
  static override hostSelector = 'pct-drawer';
  static override readonly parts = [
    'close',
    'content',
    'header',
    'heading',
  ] as const;
}

/**
 * `button[pctDrawerTrigger]` — `PctDrawerTrigger`.
 *
 * @since 0.1.0
 */
export class PctDrawerTriggerHarness extends PctHarness<never> {
  static override hostSelector = 'button[pctDrawerTrigger]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/field ─────────────────────────────────────────────────────

/**
 * `textarea[pctText][pctAutosize]` — `PctAutosize`.
 *
 * @since 0.1.0
 */
export class PctAutosizeHarness extends PctHarness<never> {
  static override hostSelector = 'textarea[pctText][pctAutosize]';
  static override readonly parts = [] as const;
}

/**
 * `pct-field` — `PctField`.
 *
 * @since 0.1.0
 */
export class PctFieldHarness extends PctHarness<
  | 'field-control'
  | 'field-error'
  | 'field-footer'
  | 'field-header'
  | 'field-hint'
  | 'field-label'
  | 'field-label-aux'
  | 'field-message-aux'
  | 'field-prefix'
  | 'field-row'
  | 'field-suffix'
  | 'field-warning'
> {
  static override hostSelector = 'pct-field';
  static override readonly parts = [
    'field-control',
    'field-error',
    'field-footer',
    'field-header',
    'field-hint',
    'field-label',
    'field-label-aux',
    'field-message-aux',
    'field-prefix',
    'field-row',
    'field-suffix',
    'field-warning',
  ] as const;
}

/**
 * `[pctLabelAux]` — `PctLabelAux`.
 *
 * @since 0.1.0
 */
export class PctLabelAuxHarness extends PctHarness<'field-label-aux-item'> {
  static override hostSelector = '[pctLabelAux]';
  static override readonly parts = ['field-label-aux-item'] as const;
}

/**
 * `[pctMessageAux]` — `PctMessageAux`.
 *
 * @since 0.1.0
 */
export class PctMessageAuxHarness extends PctHarness<'field-message-aux-item'> {
  static override hostSelector = '[pctMessageAux]';
  static override readonly parts = ['field-message-aux-item'] as const;
}

/**
 * `input[pctNumber]` — `PctNumber`.
 *
 * @since 0.1.0
 */
export class PctNumberHarness extends PctHarness<never> {
  static override hostSelector = 'input[pctNumber]';
  static override readonly parts = [] as const;
}

/**
 * `[pctPrefix]` — `PctPrefix`.
 *
 * @since 0.1.0
 */
export class PctPrefixHarness extends PctHarness<'field-prefix-item'> {
  static override hostSelector = '[pctPrefix]';
  static override readonly parts = ['field-prefix-item'] as const;
}

/**
 * `[pctSuffix]` — `PctSuffix`.
 *
 * @since 0.1.0
 */
export class PctSuffixHarness extends PctHarness<'field-suffix-item'> {
  static override hostSelector = '[pctSuffix]';
  static override readonly parts = ['field-suffix-item'] as const;
}

/**
 * `input[pctText], textarea[pctText]` — `PctText`.
 *
 * @since 0.1.0
 */
export class PctTextHarness extends PctHarness<never> {
  static override hostSelector = 'input[pctText], textarea[pctText]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/grid ──────────────────────────────────────────────────────

/**
 * `pct-grid` — `PctGrid`.
 *
 * @since 0.1.0
 */
export class PctGridHarness extends PctHarness<never> {
  static override hostSelector = 'pct-grid';
  static override readonly parts = [] as const;
}

// ── @pacit/components/hero ──────────────────────────────────────────────────────

/**
 * `[pctHero]` — `PctHero`.
 *
 * @since 0.1.0
 */
export class PctHeroHarness extends PctHarness<never> {
  static override hostSelector = '[pctHero]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/icon ──────────────────────────────────────────────────────

/**
 * `pct-icon` — `PctIcon`.
 *
 * @since next
 */
export class PctIconHarness extends PctHarness<never> {
  static override hostSelector = 'pct-icon';
  static override readonly parts = [] as const;
}

// ── @pacit/components/menu ──────────────────────────────────────────────────────

/**
 * `pct-menu` — `PctMenu`.
 *
 * @since 0.1.0
 */
export class PctMenuHarness extends PctHarness<'panel'> {
  static override hostSelector = 'pct-menu';
  static override readonly parts = ['panel'] as const;
}

/**
 * `button[pctMenuItem]` — `PctMenuItem`.
 *
 * @since 0.1.0
 */
export class PctMenuItemHarness extends PctHarness<'item'> {
  static override hostSelector = 'button[pctMenuItem]';
  static override readonly parts = ['item'] as const;
}

/**
 * `[pctMenuTrigger]` — `PctMenuTrigger`.
 *
 * @since 0.1.0
 */
export class PctMenuTriggerHarness extends PctHarness<never> {
  static override hostSelector = '[pctMenuTrigger]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/pagination ────────────────────────────────────────────────

/**
 * `pct-pagination` — `PctPagination`.
 *
 * @since 0.1.0
 */
export class PctPaginationHarness extends PctHarness<
  'ellipsis' | 'list' | 'next' | 'page' | 'previous'
> {
  static override hostSelector = 'pct-pagination';
  static override readonly parts = [
    'ellipsis',
    'list',
    'next',
    'page',
    'previous',
  ] as const;
}

// ── @pacit/components/popover ───────────────────────────────────────────────────

/**
 * `pct-popover` — `PctPopover`.
 *
 * @since 0.1.0
 */
export class PctPopoverHarness extends PctHarness<
  'content' | 'heading' | 'panel'
> {
  static override hostSelector = 'pct-popover';
  static override readonly parts = ['content', 'heading', 'panel'] as const;
}

/**
 * `[pctPopoverTrigger]` — `PctPopoverTrigger`.
 *
 * @since 0.1.0
 */
export class PctPopoverTriggerHarness extends PctHarness<never> {
  static override hostSelector = '[pctPopoverTrigger]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/progress ──────────────────────────────────────────────────

/**
 * `pct-progress` — `PctProgress`.
 *
 * @since 0.1.0
 */
export class PctProgressHarness extends PctHarness<
  'bar' | 'fill' | 'icon' | 'track'
> {
  static override hostSelector = 'pct-progress';
  static override readonly parts = ['bar', 'fill', 'icon', 'track'] as const;
}

// ── @pacit/components/radio ─────────────────────────────────────────────────────

/**
 * `pct-radio` — `PctRadio`.
 *
 * @since 0.1.0
 */
export class PctRadioHarness extends PctHarness<
  'circle' | 'control' | 'dot' | 'label'
> {
  static override hostSelector = 'pct-radio';
  static override readonly parts = [
    'circle',
    'control',
    'dot',
    'label',
  ] as const;
}

/**
 * `pct-radio-group` — `PctRadioGroup`.
 *
 * @since 0.1.0
 */
export class PctRadioGroupHarness extends PctHarness<
  | 'group-error'
  | 'group-hint'
  | 'group-label'
  | 'group-options'
  | 'group-warning'
> {
  static override hostSelector = 'pct-radio-group';
  static override readonly parts = [
    'group-error',
    'group-hint',
    'group-label',
    'group-options',
    'group-warning',
  ] as const;
}

// ── @pacit/components/select ────────────────────────────────────────────────────

/**
 * `pct-multi-select` — `PctMultiSelect`.
 *
 * @since 0.1.0
 */
export class PctMultiSelectHarness extends PctHarness<
  | 'arrow'
  | 'clear'
  | 'empty'
  | 'error'
  | 'group'
  | 'group-label'
  | 'hint'
  | 'label'
  | 'list'
  | 'option'
  | 'option-check'
  | 'panel'
  | 'placeholder'
  | 'trigger'
  | 'value'
  | 'warning'
> {
  static override hostSelector = 'pct-multi-select';
  static override readonly parts = [
    'arrow',
    'clear',
    'empty',
    'error',
    'group',
    'group-label',
    'hint',
    'label',
    'list',
    'option',
    'option-check',
    'panel',
    'placeholder',
    'trigger',
    'value',
    'warning',
  ] as const;
}

/**
 * `pct-select` — `PctSelect`.
 *
 * @since 0.1.0
 */
export class PctSelectHarness extends PctHarness<
  | 'arrow'
  | 'clear'
  | 'empty'
  | 'error'
  | 'group'
  | 'group-label'
  | 'hint'
  | 'label'
  | 'list'
  | 'option'
  | 'option-check'
  | 'panel'
  | 'placeholder'
  | 'trigger'
  | 'value'
  | 'warning'
> {
  static override hostSelector = 'pct-select';
  static override readonly parts = [
    'arrow',
    'clear',
    'empty',
    'error',
    'group',
    'group-label',
    'hint',
    'label',
    'list',
    'option',
    'option-check',
    'panel',
    'placeholder',
    'trigger',
    'value',
    'warning',
  ] as const;
}

// ── @pacit/components/skeleton ──────────────────────────────────────────────────

/**
 * `pct-skeleton` — `PctSkeleton`.
 *
 * @since 0.1.0
 */
export class PctSkeletonHarness extends PctHarness<'fill' | 'track'> {
  static override hostSelector = 'pct-skeleton';
  static override readonly parts = ['fill', 'track'] as const;
}

// ── @pacit/components/slider ────────────────────────────────────────────────────

/**
 * `pct-slider` — `PctSlider`.
 *
 * @since 0.1.0
 */
export class PctSliderHarness extends PctHarness<
  | 'bubble'
  | 'control'
  | 'error'
  | 'fill'
  | 'hint'
  | 'label'
  | 'mark'
  | 'thumb'
  | 'track'
  | 'warning'
> {
  static override hostSelector = 'pct-slider';
  static override readonly parts = [
    'bubble',
    'control',
    'error',
    'fill',
    'hint',
    'label',
    'mark',
    'thumb',
    'track',
    'warning',
  ] as const;
}

// ── @pacit/components/stack ─────────────────────────────────────────────────────

/**
 * `pct-stack` — `PctStack`.
 *
 * @since 0.1.0
 */
export class PctStackHarness extends PctHarness<never> {
  static override hostSelector = 'pct-stack';
  static override readonly parts = [] as const;
}

// ── @pacit/components/stepper ───────────────────────────────────────────────────

/**
 * `pct-step` — `PctStep`.
 *
 * @since 0.1.0
 */
export class PctStepHarness extends PctHarness<'marker' | 'track'> {
  static override hostSelector = 'pct-step';
  static override readonly parts = ['marker', 'track'] as const;
}

/**
 * `pct-stepper` — `PctStepper`.
 *
 * @since 0.1.0
 */
export class PctStepperHarness extends PctHarness<never> {
  static override hostSelector = 'pct-stepper';
  static override readonly parts = [] as const;
}

// ── @pacit/components/switch ────────────────────────────────────────────────────

/**
 * `pct-switch` — `PctSwitch`.
 *
 * @since 0.1.0
 */
export class PctSwitchHarness extends PctHarness<
  'control' | 'error' | 'hint' | 'label' | 'thumb' | 'track' | 'warning'
> {
  static override hostSelector = 'pct-switch';
  static override readonly parts = [
    'control',
    'error',
    'hint',
    'label',
    'thumb',
    'track',
    'warning',
  ] as const;
}

// ── @pacit/components/table ─────────────────────────────────────────────────────

/**
 * `table[pctTable]` — `PctTable`.
 *
 * @since next
 */
export class PctTableHarness extends PctHarness<never> {
  static override hostSelector = 'table[pctTable]';
  static override readonly parts = [] as const;
}

/**
 * `caption[pctCaption]` — `PctTableCaption`.
 *
 * @since next
 */
export class PctTableCaptionHarness extends PctHarness<never> {
  static override hostSelector = 'caption[pctCaption]';
  static override readonly parts = [] as const;
}

/**
 * `th[pctHeader]` — `PctTableHeader`.
 *
 * @since next
 */
export class PctTableHeaderHarness extends PctHarness<'icon' | 'toggle'> {
  static override hostSelector = 'th[pctHeader]';
  static override readonly parts = ['icon', 'toggle'] as const;
}

/**
 * `td[pctCell]` — `PctTableCell`.
 *
 * @since next
 */
export class PctTableCellHarness extends PctHarness<never> {
  static override hostSelector = 'td[pctCell]';
  static override readonly parts = [] as const;
}

/** The rows of data a data table draws: a placeholder row carries no index, a details row a part. */
const DATA_ROWS =
  ':scope > pct-table-frame > table > tbody > tr[data-pct-index]:not([data-pct-part])';

/** The header cells of a data table's own table, not of one nested in a cell. */
const HEADS = ':scope > pct-table-frame > table > thead > tr > th';

/** What a header's label leaves out: a later key's place, and the words only a reader hears. */
const NOT_THE_LABEL =
  '[data-pct-part="place"], .pct-data-table__word, [hidden]';

/**
 * `pct-data-table` — `PctDataTable`.
 *
 * Beside the parts, the table read as a user reads it: the rows in the order they stand, a
 * cell by its row and its header's label, and a press on a header — the table's own, not those
 * of a data table nested in one of its cells, which a harness of its own reads.
 *
 * @since next
 */
export class PctDataTableHarness extends PctHarness<
  'details' | 'disclosure' | 'mark' | 'message' | 'place' | 'placeholder'
> {
  static override hostSelector = 'pct-data-table';
  static override readonly parts = [
    'details',
    'disclosure',
    'mark',
    'message',
    'place',
    'placeholder',
  ] as const;

  /**
   * The headers' labels, in the order the columns stand: the text a user sees, without the
   * place of a later sort key. The column of row numbers is headed `#`.
   *
   * @since next
   */
  async headers(): Promise<string[]> {
    const heads = await this.locatorForAll(HEADS)();
    return Promise.all(
      heads.map((head) => head.text({ exclude: NOT_THE_LABEL })),
    );
  }

  /**
   * The rows of data, in the order the table draws them, each as the texts of its cells: a
   * boolean cell as its word, the row's number first when the table numbers its rows.
   *
   * @since next
   */
  async rows(): Promise<string[][]> {
    const rows = await this.locatorForAll(DATA_ROWS)();
    return Promise.all(
      rows.map(async (_, row) =>
        Promise.all((await this.cellsOf(row)).map((cell) => cell.text())),
      ),
    );
  }

  /**
   * The cell of the row at `row`, counted from 0 among the rows drawn, under the header whose
   * label is `header`; throws naming the labels or the count when there is none.
   *
   * @since next
   */
  async cell(row: number, header: string): Promise<TestElement> {
    const labels = await this.headers();
    const column = labels.indexOf(header);
    if (column < 0)
      throw new Error(
        `PctDataTableHarness: no column is headed "${header}". ` +
          `Headers: ${labels.join(', ')}.`,
      );
    const cells = await this.cellsOf(row);
    if (cells.length === 0)
      throw new Error(
        `PctDataTableHarness: no row ${row}; the table draws ` +
          `${(await this.locatorForAll(DATA_ROWS)()).length}.`,
      );
    return cells[column];
  }

  /**
   * Presses the sort button of the column headed `header`, with Shift held when `shift` is
   * set — the press that adds the column as a later key. Throws when the column does not sort.
   *
   * @since next
   */
  async sortBy(
    header: string,
    options: { shift?: boolean } = {},
  ): Promise<void> {
    const labels = await this.headers();
    const column = labels.indexOf(header);
    // A label no header has is column -1, and `:nth-child(0)` matches nothing.
    const toggle = await this.locatorForOptional(
      `${HEADS}:nth-child(${column + 1}) > button[data-pct-part="toggle"]`,
    )();
    if (!toggle)
      throw new Error(
        `PctDataTableHarness: no column headed "${header}" sorts. ` +
          `Headers: ${labels.join(', ')}.`,
      );
    await toggle.click(options.shift ? { shift: true } : {});
  }

  /**
   * The cells of the row at `row`, in the columns' order. A row's index is its place among the
   * lines, which counts open details too, so it is read off the row rather than assumed.
   */
  private async cellsOf(row: number): Promise<TestElement[]> {
    const line = await (
      await this.locatorForAll(DATA_ROWS)()
    )[row]?.getAttribute('data-pct-index');
    if (line === undefined) return [];
    return this.locatorForAll(
      `${DATA_ROWS.replace('[data-pct-index]', `[data-pct-index="${line}"]`)} > td`,
    )();
  }
}

/**
 * `pct-table-frame` — `PctTableFrame`.
 *
 * @since next
 */
export class PctTableFrameHarness extends PctHarness<never> {
  static override hostSelector = 'pct-table-frame';
  static override readonly parts = [] as const;
}

// ── @pacit/components/tabs ──────────────────────────────────────────────────────

/**
 * `pct-tab` — `PctTab`.
 *
 * @since 0.1.0
 */
export class PctTabHarness extends PctHarness<'panel'> {
  static override hostSelector = 'pct-tab';
  static override readonly parts = ['panel'] as const;
}

/**
 * `pct-tabs` — `PctTabs`.
 *
 * @since 0.1.0
 */
export class PctTabsHarness extends PctHarness<'list' | 'tab'> {
  static override hostSelector = 'pct-tabs';
  static override readonly parts = ['list', 'tab'] as const;
}

// ── @pacit/components/theme ─────────────────────────────────────────────────────

/**
 * `[pctTheme]` — `PctTheme`.
 *
 * @since 0.1.0
 */
export class PctThemeHarness extends PctHarness<never> {
  static override hostSelector = '[pctTheme]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/time ──────────────────────────────────────────────────────

/**
 * `pct-time` — `PctTime`.
 *
 * @since next
 */
export class PctTimeHarness extends PctHarness<
  'control' | 'error' | 'hint' | 'label' | 'panel' | 'toggle' | 'warning'
> {
  static override hostSelector = 'pct-time';
  static override readonly parts = [
    'control',
    'error',
    'hint',
    'label',
    'panel',
    'toggle',
    'warning',
  ] as const;
}

/**
 * `pct-time-columns` — `PctTimeColumns`.
 *
 * @since next
 */
export class PctTimeColumnsHarness extends PctHarness<'column' | 'option'> {
  static override hostSelector = 'pct-time-columns';
  static override readonly parts = ['column', 'option'] as const;
}

// ── @pacit/components/toast ─────────────────────────────────────────────────────

/**
 * `pct-toast-viewport` — `PctToastViewport`.
 *
 * @since 0.1.0
 */
export class PctToastViewportHarness extends PctHarness<
  'action' | 'close' | 'icon' | 'item' | 'message'
> {
  static override hostSelector = 'pct-toast-viewport';
  static override readonly parts = [
    'action',
    'close',
    'icon',
    'item',
    'message',
  ] as const;
}

// ── @pacit/components/tooltip ───────────────────────────────────────────────────

/**
 * `[pctTooltip]` — `PctTooltip`.
 *
 * @since 0.1.0
 */
export class PctTooltipHarness extends PctHarness<never> {
  static override hostSelector = '[pctTooltip]';
  static override readonly parts = [] as const;
}

/**
 * `pct-tooltip` — `PctTooltipPanel`.
 *
 * @since 0.1.0
 */
export class PctTooltipPanelHarness extends PctHarness<'panel'> {
  static override hostSelector = 'pct-tooltip';
  static override readonly parts = ['panel'] as const;
}

// ── @pacit/components/tree ──────────────────────────────────────────────────────

/**
 * `pct-tree` — `PctTree`.
 *
 * @since 0.1.0
 */
export class PctTreeHarness extends PctHarness<never> {
  static override hostSelector = 'pct-tree';
  static override readonly parts = [] as const;
}

/**
 * `pct-tree-item` — `PctTreeItem`.
 *
 * @since 0.1.0
 */
export class PctTreeItemHarness extends PctHarness<'arrow' | 'label'> {
  static override hostSelector = 'pct-tree-item';
  static override readonly parts = ['arrow', 'label'] as const;
}
