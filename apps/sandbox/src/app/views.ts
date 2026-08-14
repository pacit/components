import { Type } from '@angular/core';

/**
 * The registry of sandbox views — one source for the routing, the navigation and
 * the index page. Adding a view is one entry here.
 */
export type SbxViewGroup = 'components' | 'cross';

export interface SbxView {
  /** The path with no leading slash; `''` is the index page. */
  readonly path: string;
  readonly title: string;
  readonly summary: string;
  readonly group: SbxViewGroup;
  readonly load: () => Promise<Type<unknown>>;
}

export const SBX_VIEW_GROUPS: ReadonlyArray<{
  readonly id: SbxViewGroup;
  readonly label: string;
}> = [
  { id: 'components', label: 'Components' },
  { id: 'cross', label: 'Cross-cutting' },
];

export const SBX_VIEWS: readonly SbxView[] = [
  {
    path: '',
    title: 'Start',
    summary: 'The index of sandbox views.',
    group: 'cross',
    load: () => import('./views/index/index-view').then((m) => m.IndexView),
  },
  {
    path: 'button',
    title: 'Button',
    summary: 'The variants, sizes and states of the button.',
    group: 'components',
    load: () => import('./views/button/button-view').then((m) => m.ButtonView),
  },
  {
    path: 'field',
    title: 'Field',
    summary: 'The field wrapper: label, hint, error, decorations and border.',
    group: 'components',
    load: () => import('./views/field/field-view').then((m) => m.FieldView),
  },
  {
    path: 'text',
    title: 'Text',
    summary: 'A text field on a native <input>, and old-forms compatibility.',
    group: 'components',
    load: () => import('./views/text/text-view').then((m) => m.TextView),
  },
  {
    path: 'number',
    title: 'Number',
    summary:
      'A number field: locale, fractions, stepping, bounds from the schema.',
    group: 'components',
    load: () => import('./views/number/number-view').then((m) => m.NumberView),
  },
  {
    path: 'checkbox',
    title: 'Checkbox',
    summary: 'The checked state, the indeterminate one and the touch area.',
    group: 'components',
    load: () =>
      import('./views/checkbox/checkbox-view').then((m) => m.CheckboxView),
  },
  {
    path: 'radio',
    title: 'Radio',
    summary: 'A radio group: the form control is the container.',
    group: 'components',
    load: () => import('./views/radio/radio-view').then((m) => m.RadioView),
  },
  {
    path: 'select',
    title: 'Select',
    summary: 'A combobox with a panel of its own in a CDK overlay.',
    group: 'components',
    load: () => import('./views/select/select-view').then((m) => m.SelectView),
  },
  {
    path: 'size',
    title: 'Size',
    summary: 'Every component on the shared sm/md/lg axis.',
    group: 'cross',
    load: () => import('./views/size/size-view').then((m) => m.SizeView),
  },
  {
    path: 'states',
    title: 'States',
    summary:
      'The same set of states for every control: disabled, read-only, error, required.',
    group: 'cross',
    load: () => import('./views/states/states-view').then((m) => m.StatesView),
  },
  {
    path: 'all',
    title: 'Everything at once',
    summary:
      'A dense cross-section of every component — for the axe audit and the visual tests.',
    group: 'cross',
    load: () =>
      import('./views/kitchen-sink/kitchen-sink').then((m) => m.KitchenSink),
  },
];

export function viewsOf(group: SbxViewGroup): readonly SbxView[] {
  return SBX_VIEWS.filter((v) => v.group === group);
}
