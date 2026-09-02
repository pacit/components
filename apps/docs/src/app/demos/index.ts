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
