import { Type } from '@angular/core';

/**
 * The demo registry: one canonical demo per card, lazy — a component page loads its own
 * demo and nothing else's. The demo FILE is also the page's code tab (the content pass
 * highlights the same source this map imports), so the pixels and the snippet cannot
 * drift apart.
 */
export const DEMOS: Readonly<Record<string, () => Promise<Type<unknown>>>> = {
  accordion: () => import('./accordion.demo').then((m) => m.AccordionDemo),
  avatar: () => import('./avatar.demo').then((m) => m.AvatarDemo),
  badge: () => import('./badge.demo').then((m) => m.BadgeDemo),
  breadcrumb: () => import('./breadcrumb.demo').then((m) => m.BreadcrumbDemo),
  button: () => import('./button.demo').then((m) => m.ButtonDemo),
  calendar: () => import('./calendar.demo').then((m) => m.CalendarDemo),
  checkbox: () => import('./checkbox.demo').then((m) => m.CheckboxDemo),
  chips: () => import('./chips.demo').then((m) => m.ChipsDemo),
  container: () => import('./container.demo').then((m) => m.ContainerDemo),
  date: () => import('./date.demo').then((m) => m.DateDemo),
  dialog: () => import('./dialog.demo').then((m) => m.DialogDemo),
  drawer: () => import('./drawer.demo').then((m) => m.DrawerDemo),
  field: () => import('./field.demo').then((m) => m.FieldDemo),
  grid: () => import('./grid.demo').then((m) => m.GridDemo),
  hero: () => import('./hero.demo').then((m) => m.HeroDemo),
  menu: () => import('./menu.demo').then((m) => m.MenuDemo),
  number: () => import('./number.demo').then((m) => m.NumberDemo),
  pagination: () => import('./pagination.demo').then((m) => m.PaginationDemo),
  popover: () => import('./popover.demo').then((m) => m.PopoverDemo),
  progress: () => import('./progress.demo').then((m) => m.ProgressDemo),
  radio: () => import('./radio.demo').then((m) => m.RadioDemo),
  select: () => import('./select.demo').then((m) => m.SelectDemo),
  skeleton: () => import('./skeleton.demo').then((m) => m.SkeletonDemo),
  slider: () => import('./slider.demo').then((m) => m.SliderDemo),
  stack: () => import('./stack.demo').then((m) => m.StackDemo),
  stepper: () => import('./stepper.demo').then((m) => m.StepperDemo),
  switch: () => import('./switch.demo').then((m) => m.SwitchDemo),
  tabs: () => import('./tabs.demo').then((m) => m.TabsDemo),
  text: () => import('./text.demo').then((m) => m.TextDemo),
  textarea: () => import('./textarea.demo').then((m) => m.TextareaDemo),
  theme: () => import('./theme.demo').then((m) => m.ThemeDemo),
  toast: () => import('./toast.demo').then((m) => m.ToastDemo),
  tooltip: () => import('./tooltip.demo').then((m) => m.TooltipDemo),
  tree: () => import('./tree.demo').then((m) => m.TreeDemo),
};

/** One example of a card: the key names the file `<id>.<key>.demo.ts`, the content pass reads its title line. */
export interface DocsExample {
  readonly key: string;
  readonly load: () => Promise<Type<unknown>>;
}

/**
 * The examples registry (site.md "The component page, drawn in words"): several running
 * instances per card, under the Preview. Hand-written like `DEMOS` so every import path is
 * a literal the bundler can split — and the content pass fails the build when a
 * `<id>.<key>.demo.ts` on disk is missing here.
 */
export const EXAMPLES: Readonly<Record<string, readonly DocsExample[]>> = {
  button: [
    {
      key: 'faces',
      load: () => import('./button.faces.demo').then((m) => m.ButtonFacesDemo),
    },
    {
      key: 'tones',
      load: () => import('./button.tones.demo').then((m) => m.ButtonTonesDemo),
    },
    {
      key: 'destructive',
      load: () =>
        import('./button.destructive.demo').then(
          (m) => m.ButtonDestructiveDemo,
        ),
    },
    {
      key: 'link',
      load: () => import('./button.link.demo').then((m) => m.ButtonLinkDemo),
    },
    {
      key: 'sizes',
      load: () => import('./button.sizes.demo').then((m) => m.ButtonSizesDemo),
    },
    {
      key: 'states',
      load: () =>
        import('./button.states.demo').then((m) => m.ButtonStatesDemo),
    },
    {
      key: 'toolbar',
      load: () =>
        import('./button.toolbar.demo').then((m) => m.ButtonToolbarDemo),
    },
    {
      key: 'form',
      load: () => import('./button.form.demo').then((m) => m.ButtonFormDemo),
    },
  ],
  hero: [
    {
      key: 'interact',
      load: () =>
        import('./hero.interact.demo').then((m) => m.HeroInteractDemo),
    },
  ],
  tabs: [
    {
      key: 'vertical',
      load: () =>
        import('./tabs.vertical.demo').then((m) => m.TabsVerticalDemo),
    },
    {
      key: 'manual',
      load: () => import('./tabs.manual.demo').then((m) => m.TabsManualDemo),
    },
    {
      key: 'segmented',
      load: () =>
        import('./tabs.segmented.demo').then((m) => m.TabsSegmentedDemo),
    },
  ],
  pagination: [
    {
      key: 'fold',
      load: () =>
        import('./pagination.fold.demo').then((m) => m.PaginationFoldDemo),
    },
    {
      key: 'sizes',
      load: () =>
        import('./pagination.sizes.demo').then((m) => m.PaginationSizesDemo),
    },
  ],
  menu: [
    {
      key: 'placement',
      load: () =>
        import('./menu.placement.demo').then((m) => m.MenuPlacementDemo),
    },
  ],
  accordion: [
    {
      key: 'exclusive',
      load: () =>
        import('./accordion.exclusive.demo').then(
          (m) => m.AccordionExclusiveDemo,
        ),
    },
  ],
  badge: [
    {
      key: 'tones',
      load: () => import('./badge.tones.demo').then((m) => m.BadgeTonesDemo),
    },
    {
      key: 'statuses',
      load: () =>
        import('./badge.statuses.demo').then((m) => m.BadgeStatusesDemo),
    },
  ],
  skeleton: [
    {
      key: 'shapes',
      load: () =>
        import('./skeleton.shapes.demo').then((m) => m.SkeletonShapesDemo),
    },
    {
      key: 'card',
      load: () =>
        import('./skeleton.card.demo').then((m) => m.SkeletonCardDemo),
    },
  ],
  progress: [
    {
      key: 'states',
      load: () =>
        import('./progress.states.demo').then((m) => m.ProgressStatesDemo),
    },
  ],
  tree: [
    {
      key: 'nested',
      load: () => import('./tree.nested.demo').then((m) => m.TreeNestedDemo),
    },
  ],
  breadcrumb: [
    {
      key: 'trail',
      load: () =>
        import('./breadcrumb.trail.demo').then((m) => m.BreadcrumbTrailDemo),
    },
  ],
  avatar: [
    {
      key: 'sizes',
      load: () => import('./avatar.sizes.demo').then((m) => m.AvatarSizesDemo),
    },
  ],
  dialog: [
    {
      key: 'guards',
      load: () =>
        import('./dialog.guards.demo').then((m) => m.DialogGuardsDemo),
    },
  ],
  drawer: [
    {
      key: 'side',
      load: () => import('./drawer.side.demo').then((m) => m.DrawerSideDemo),
    },
  ],
  popover: [
    {
      key: 'placement',
      load: () =>
        import('./popover.placement.demo').then((m) => m.PopoverPlacementDemo),
    },
  ],
  tooltip: [
    {
      key: 'placement',
      load: () =>
        import('./tooltip.placement.demo').then((m) => m.TooltipPlacementDemo),
    },
  ],
  toast: [
    {
      key: 'action',
      load: () => import('./toast.action.demo').then((m) => m.ToastActionDemo),
    },
  ],
  stepper: [
    {
      key: 'steered',
      load: () =>
        import('./stepper.steered.demo').then((m) => m.StepperSteeredDemo),
    },
  ],
  container: [
    {
      key: 'width',
      load: () =>
        import('./container.width.demo').then((m) => m.ContainerWidthDemo),
    },
  ],
  stack: [
    {
      key: 'gaps',
      load: () => import('./stack.gaps.demo').then((m) => m.StackGapsDemo),
    },
  ],
  grid: [
    {
      key: 'width',
      load: () => import('./grid.width.demo').then((m) => m.GridWidthDemo),
    },
  ],
  theme: [
    {
      key: 'islands',
      load: () =>
        import('./theme.islands.demo').then((m) => m.ThemeIslandsDemo),
    },
  ],
  checkbox: [
    {
      key: 'states',
      load: () =>
        import('./checkbox.states.demo').then((m) => m.CheckboxStatesDemo),
    },
  ],
  switch: [
    {
      key: 'states',
      load: () =>
        import('./switch.states.demo').then((m) => m.SwitchStatesDemo),
    },
  ],
  radio: [
    {
      key: 'horizontal',
      load: () =>
        import('./radio.horizontal.demo').then((m) => m.RadioHorizontalDemo),
    },
  ],
  chips: [
    {
      key: 'sizes',
      load: () => import('./chips.sizes.demo').then((m) => m.ChipsSizesDemo),
    },
  ],
  slider: [
    {
      key: 'range',
      load: () => import('./slider.range.demo').then((m) => m.SliderRangeDemo),
    },
  ],
  select: [
    {
      key: 'groups',
      load: () =>
        import('./select.groups.demo').then((m) => m.SelectGroupsDemo),
    },
    {
      key: 'multi',
      load: () => import('./select.multi.demo').then((m) => m.SelectMultiDemo),
    },
  ],
  date: [
    {
      key: 'bounds',
      load: () => import('./date.bounds.demo').then((m) => m.DateBoundsDemo),
    },
  ],
  calendar: [
    {
      key: 'locale',
      load: () =>
        import('./calendar.locale.demo').then((m) => m.CalendarLocaleDemo),
    },
  ],
  field: [
    {
      key: 'affixes',
      load: () =>
        import('./field.affixes.demo').then((m) => m.FieldAffixesDemo),
    },
  ],
  text: [
    {
      key: 'states',
      load: () => import('./text.states.demo').then((m) => m.TextStatesDemo),
    },
  ],
  textarea: [
    {
      key: 'rows',
      load: () =>
        import('./textarea.rows.demo').then((m) => m.TextareaRowsDemo),
    },
  ],
  number: [
    {
      key: 'format',
      load: () =>
        import('./number.format.demo').then((m) => m.NumberFormatDemo),
    },
  ],
};

/**
 * The gallery's own scenes (`docs/site.md`, "Information architecture"). A card's stage is
 * 272 × 144px of room and the
 * canonical demos are authored for the component page's 675px one, so seven of the
 * thirty-three overflowed it — measured in chromium at three columns: `button` by 227px,
 * `stepper` by 138px, `theme` by 96px and `chips` by 41px across, `container` by 316px,
 * `grid` by 180px and `calendar` by 68px down. That is the trade `0061` already names:
 * what goes in a fixed-width card is chosen by what fits it.
 *
 * Only those seven are here. Everything else falls back to `DEMOS`, so a component whose
 * demo already fits has ONE scene and cannot drift into having two that disagree — and a
 * card that grows out of its stage is caught by the gallery's measurement spec rather than
 * by a reader noticing a cropped button.
 *
 * These files are `*.card.ts` and not `*.demo.ts` on purpose: the content pass claims every
 * `<id>[.<key>].demo.ts` on disk and fails the build when one is not in `EXAMPLES`, and a
 * card scene is not an example — it is never shown as code, because the gallery has no
 * code tab to show it in.
 */
export const CARD_DEMOS: Readonly<
  Record<string, () => Promise<Type<unknown>>>
> = {
  button: () => import('./cards/button.card').then((m) => m.ButtonCardScene),
  calendar: () =>
    import('./cards/calendar.card').then((m) => m.CalendarCardScene),
  chips: () => import('./cards/chips.card').then((m) => m.ChipsCardScene),
  container: () =>
    import('./cards/container.card').then((m) => m.ContainerCardScene),
  dialog: () => import('./cards/dialog.card').then((m) => m.DialogCardScene),
  drawer: () => import('./cards/drawer.card').then((m) => m.DrawerCardScene),
  grid: () => import('./cards/grid.card').then((m) => m.GridCardScene),
  menu: () => import('./cards/menu.card').then((m) => m.MenuCardScene),
  popover: () => import('./cards/popover.card').then((m) => m.PopoverCardScene),
  stepper: () => import('./cards/stepper.card').then((m) => m.StepperCardScene),
  theme: () => import('./cards/theme.card').then((m) => m.ThemeCardScene),
  toast: () => import('./cards/toast.card').then((m) => m.ToastCardScene),
  tooltip: () => import('./cards/tooltip.card').then((m) => m.TooltipCardScene),
};
