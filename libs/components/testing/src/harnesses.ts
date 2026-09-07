import { PctHarness } from './harness';

/*
 * One harness per component and directive a card names, as declarations over the parts
 * inventory: the host selector, verbatim the component's own, and the parts it draws. The
 * behaviour is all in `PctHarness`; what stands here is held to the built package by
 * `tools/check-harness.mjs` in both directions, and the union in each `extends` clause —
 * what a consumer's editor offers after `part(` — is held to the same list.
 */

// ── @pacit/components/accordion ─────────────────────────────────────────────────

/** `pct-accordion` — `PctAccordion`. */
export class PctAccordionHarness extends PctHarness<never> {
  static hostSelector = 'pct-accordion';
  static override readonly parts = [] as const;
}

/** `pct-accordion-item` — `PctAccordionItem`. */
export class PctAccordionItemHarness extends PctHarness<
  'heading' | 'item' | 'marker' | 'panel'
> {
  static hostSelector = 'pct-accordion-item';
  static override readonly parts = [
    'heading',
    'item',
    'marker',
    'panel',
  ] as const;
}

// ── @pacit/components/avatar ────────────────────────────────────────────────────

/** `pct-avatar` — `PctAvatar`. */
export class PctAvatarHarness extends PctHarness<
  'image' | 'initials' | 'silhouette'
> {
  static hostSelector = 'pct-avatar';
  static override readonly parts = ['image', 'initials', 'silhouette'] as const;
}

// ── @pacit/components/badge ─────────────────────────────────────────────────────

/** `pct-badge` — `PctBadge`. */
export class PctBadgeHarness extends PctHarness<never> {
  static hostSelector = 'pct-badge';
  static override readonly parts = [] as const;
}

// ── @pacit/components/breadcrumb ────────────────────────────────────────────────

/** `pct-breadcrumb` — `PctBreadcrumb`. */
export class PctBreadcrumbHarness extends PctHarness<'list'> {
  static hostSelector = 'pct-breadcrumb';
  static override readonly parts = ['list'] as const;
}

/** `pct-crumb` — `PctCrumb`. */
export class PctCrumbHarness extends PctHarness<'separator'> {
  static hostSelector = 'pct-crumb';
  static override readonly parts = ['separator'] as const;
}

/** `a[pctCrumbLink]` — `PctCrumbLink`. */
export class PctCrumbLinkHarness extends PctHarness<never> {
  static hostSelector = 'a[pctCrumbLink]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/button ────────────────────────────────────────────────────

/** `button[pctButton], a[pctButton]` — `PctButton`. */
export class PctButtonHarness extends PctHarness<'label' | 'spinner'> {
  static hostSelector = 'button[pctButton], a[pctButton]';
  static override readonly parts = ['label', 'spinner'] as const;
}

// ── @pacit/components/checkbox ──────────────────────────────────────────────────

/** `pct-checkbox` — `PctCheckbox`. */
export class PctCheckboxHarness extends PctHarness<
  'box' | 'control' | 'error' | 'hint' | 'label' | 'mark'
> {
  static hostSelector = 'pct-checkbox';
  static override readonly parts = [
    'box',
    'control',
    'error',
    'hint',
    'label',
    'mark',
  ] as const;
}

// ── @pacit/components/chips ─────────────────────────────────────────────────────

/** `pct-chip` — `PctChip`. */
export class PctChipHarness extends PctHarness<'label' | 'remove'> {
  static hostSelector = 'pct-chip';
  static override readonly parts = ['label', 'remove'] as const;
}

/** `pct-chips` — `PctChips`. */
export class PctChipsHarness extends PctHarness<never> {
  static hostSelector = 'pct-chips';
  static override readonly parts = [] as const;
}

// ── @pacit/components/container ─────────────────────────────────────────────────

/** `pct-container` — `PctContainer`. */
export class PctContainerHarness extends PctHarness<never> {
  static hostSelector = 'pct-container';
  static override readonly parts = [] as const;
}

// ── @pacit/components/date ──────────────────────────────────────────────────────

/** `pct-calendar` — `PctCalendar`. */
export class PctCalendarHarness extends PctHarness<
  'caption' | 'day' | 'grid' | 'nav' | 'week' | 'weekday'
> {
  static hostSelector = 'pct-calendar';
  static override readonly parts = [
    'caption',
    'day',
    'grid',
    'nav',
    'week',
    'weekday',
  ] as const;
}

/** `pct-date` — `PctDate`. */
export class PctDateHarness extends PctHarness<
  'control' | 'error' | 'hint' | 'label' | 'panel' | 'toggle'
> {
  static hostSelector = 'pct-date';
  static override readonly parts = [
    'control',
    'error',
    'hint',
    'label',
    'panel',
    'toggle',
  ] as const;
}

// ── @pacit/components/dialog ────────────────────────────────────────────────────

/** `pct-dialog` — `PctDialog`. */
export class PctDialogHarness extends PctHarness<
  'backdrop' | 'close' | 'content' | 'header' | 'heading' | 'panel'
> {
  static hostSelector = 'pct-dialog';
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

/** `pct-drawer` — `PctDrawer`. */
export class PctDrawerHarness extends PctHarness<
  'close' | 'content' | 'header' | 'heading'
> {
  static hostSelector = 'pct-drawer';
  static override readonly parts = [
    'close',
    'content',
    'header',
    'heading',
  ] as const;
}

/** `button[pctDrawerTrigger]` — `PctDrawerTrigger`. */
export class PctDrawerTriggerHarness extends PctHarness<never> {
  static hostSelector = 'button[pctDrawerTrigger]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/field ─────────────────────────────────────────────────────

/** `textarea[pctText][pctAutosize]` — `PctAutosize`. */
export class PctAutosizeHarness extends PctHarness<never> {
  static hostSelector = 'textarea[pctText][pctAutosize]';
  static override readonly parts = [] as const;
}

/** `pct-field` — `PctField`. */
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
> {
  static hostSelector = 'pct-field';
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
  ] as const;
}

/** `[pctLabelAux]` — `PctLabelAux`. */
export class PctLabelAuxHarness extends PctHarness<'field-label-aux-item'> {
  static hostSelector = '[pctLabelAux]';
  static override readonly parts = ['field-label-aux-item'] as const;
}

/** `[pctMessageAux]` — `PctMessageAux`. */
export class PctMessageAuxHarness extends PctHarness<'field-message-aux-item'> {
  static hostSelector = '[pctMessageAux]';
  static override readonly parts = ['field-message-aux-item'] as const;
}

/** `input[pctNumber]` — `PctNumber`. */
export class PctNumberHarness extends PctHarness<never> {
  static hostSelector = 'input[pctNumber]';
  static override readonly parts = [] as const;
}

/** `[pctPrefix]` — `PctPrefix`. */
export class PctPrefixHarness extends PctHarness<'field-prefix-item'> {
  static hostSelector = '[pctPrefix]';
  static override readonly parts = ['field-prefix-item'] as const;
}

/** `[pctSuffix]` — `PctSuffix`. */
export class PctSuffixHarness extends PctHarness<'field-suffix-item'> {
  static hostSelector = '[pctSuffix]';
  static override readonly parts = ['field-suffix-item'] as const;
}

/** `input[pctText], textarea[pctText]` — `PctText`. */
export class PctTextHarness extends PctHarness<never> {
  static hostSelector = 'input[pctText], textarea[pctText]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/grid ──────────────────────────────────────────────────────

/** `pct-grid` — `PctGrid`. */
export class PctGridHarness extends PctHarness<never> {
  static hostSelector = 'pct-grid';
  static override readonly parts = [] as const;
}

// ── @pacit/components/hero ──────────────────────────────────────────────────────

/** `[pctHero]` — `PctHero`. */
export class PctHeroHarness extends PctHarness<never> {
  static hostSelector = '[pctHero]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/menu ──────────────────────────────────────────────────────

/** `pct-menu` — `PctMenu`. */
export class PctMenuHarness extends PctHarness<'panel'> {
  static hostSelector = 'pct-menu';
  static override readonly parts = ['panel'] as const;
}

/** `button[pctMenuItem]` — `PctMenuItem`. */
export class PctMenuItemHarness extends PctHarness<'item'> {
  static hostSelector = 'button[pctMenuItem]';
  static override readonly parts = ['item'] as const;
}

/** `[pctMenuTrigger]` — `PctMenuTrigger`. */
export class PctMenuTriggerHarness extends PctHarness<never> {
  static hostSelector = '[pctMenuTrigger]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/pagination ────────────────────────────────────────────────

/** `pct-pagination` — `PctPagination`. */
export class PctPaginationHarness extends PctHarness<
  'ellipsis' | 'list' | 'next' | 'page' | 'previous'
> {
  static hostSelector = 'pct-pagination';
  static override readonly parts = [
    'ellipsis',
    'list',
    'next',
    'page',
    'previous',
  ] as const;
}

// ── @pacit/components/popover ───────────────────────────────────────────────────

/** `pct-popover` — `PctPopover`. */
export class PctPopoverHarness extends PctHarness<
  'content' | 'heading' | 'panel'
> {
  static hostSelector = 'pct-popover';
  static override readonly parts = ['content', 'heading', 'panel'] as const;
}

/** `[pctPopoverTrigger]` — `PctPopoverTrigger`. */
export class PctPopoverTriggerHarness extends PctHarness<never> {
  static hostSelector = '[pctPopoverTrigger]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/progress ──────────────────────────────────────────────────

/** `pct-progress` — `PctProgress`. */
export class PctProgressHarness extends PctHarness<'fill' | 'track'> {
  static hostSelector = 'pct-progress';
  static override readonly parts = ['fill', 'track'] as const;
}

// ── @pacit/components/radio ─────────────────────────────────────────────────────

/** `pct-radio` — `PctRadio`. */
export class PctRadioHarness extends PctHarness<
  'circle' | 'control' | 'dot' | 'label'
> {
  static hostSelector = 'pct-radio';
  static override readonly parts = [
    'circle',
    'control',
    'dot',
    'label',
  ] as const;
}

/** `pct-radio-group` — `PctRadioGroup`. */
export class PctRadioGroupHarness extends PctHarness<
  'group-error' | 'group-hint' | 'group-label' | 'group-options'
> {
  static hostSelector = 'pct-radio-group';
  static override readonly parts = [
    'group-error',
    'group-hint',
    'group-label',
    'group-options',
  ] as const;
}

// ── @pacit/components/select ────────────────────────────────────────────────────

/** `pct-multi-select` — `PctMultiSelect`. */
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
> {
  static hostSelector = 'pct-multi-select';
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
  ] as const;
}

/** `pct-select` — `PctSelect`. */
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
> {
  static hostSelector = 'pct-select';
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
  ] as const;
}

// ── @pacit/components/skeleton ──────────────────────────────────────────────────

/** `pct-skeleton` — `PctSkeleton`. */
export class PctSkeletonHarness extends PctHarness<'fill' | 'track'> {
  static hostSelector = 'pct-skeleton';
  static override readonly parts = ['fill', 'track'] as const;
}

// ── @pacit/components/slider ────────────────────────────────────────────────────

/** `pct-slider` — `PctSlider`. */
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
> {
  static hostSelector = 'pct-slider';
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
  ] as const;
}

// ── @pacit/components/stack ─────────────────────────────────────────────────────

/** `pct-stack` — `PctStack`. */
export class PctStackHarness extends PctHarness<never> {
  static hostSelector = 'pct-stack';
  static override readonly parts = [] as const;
}

// ── @pacit/components/stepper ───────────────────────────────────────────────────

/** `pct-step` — `PctStep`. */
export class PctStepHarness extends PctHarness<'marker' | 'track'> {
  static hostSelector = 'pct-step';
  static override readonly parts = ['marker', 'track'] as const;
}

/** `pct-stepper` — `PctStepper`. */
export class PctStepperHarness extends PctHarness<never> {
  static hostSelector = 'pct-stepper';
  static override readonly parts = [] as const;
}

// ── @pacit/components/switch ────────────────────────────────────────────────────

/** `pct-switch` — `PctSwitch`. */
export class PctSwitchHarness extends PctHarness<
  'control' | 'error' | 'hint' | 'label' | 'thumb' | 'track'
> {
  static hostSelector = 'pct-switch';
  static override readonly parts = [
    'control',
    'error',
    'hint',
    'label',
    'thumb',
    'track',
  ] as const;
}

// ── @pacit/components/tabs ──────────────────────────────────────────────────────

/** `pct-tab` — `PctTab`. */
export class PctTabHarness extends PctHarness<'panel'> {
  static hostSelector = 'pct-tab';
  static override readonly parts = ['panel'] as const;
}

/** `pct-tabs` — `PctTabs`. */
export class PctTabsHarness extends PctHarness<'list' | 'tab'> {
  static hostSelector = 'pct-tabs';
  static override readonly parts = ['list', 'tab'] as const;
}

// ── @pacit/components/theme ─────────────────────────────────────────────────────

/** `[pctTheme]` — `PctTheme`. */
export class PctThemeHarness extends PctHarness<never> {
  static hostSelector = '[pctTheme]';
  static override readonly parts = [] as const;
}

// ── @pacit/components/toast ─────────────────────────────────────────────────────

/** `pct-toast-viewport` — `PctToastViewport`. */
export class PctToastViewportHarness extends PctHarness<
  'action' | 'close' | 'item' | 'message'
> {
  static hostSelector = 'pct-toast-viewport';
  static override readonly parts = [
    'action',
    'close',
    'item',
    'message',
  ] as const;
}

// ── @pacit/components/tooltip ───────────────────────────────────────────────────

/** `[pctTooltip]` — `PctTooltip`. */
export class PctTooltipHarness extends PctHarness<never> {
  static hostSelector = '[pctTooltip]';
  static override readonly parts = [] as const;
}

/** `pct-tooltip` — `PctTooltipPanel`. */
export class PctTooltipPanelHarness extends PctHarness<'panel'> {
  static hostSelector = 'pct-tooltip';
  static override readonly parts = ['panel'] as const;
}

// ── @pacit/components/tree ──────────────────────────────────────────────────────

/** `pct-tree` — `PctTree`. */
export class PctTreeHarness extends PctHarness<never> {
  static hostSelector = 'pct-tree';
  static override readonly parts = [] as const;
}

/** `pct-tree-item` — `PctTreeItem`. */
export class PctTreeItemHarness extends PctHarness<'arrow' | 'label'> {
  static hostSelector = 'pct-tree-item';
  static override readonly parts = ['arrow', 'label'] as const;
}
