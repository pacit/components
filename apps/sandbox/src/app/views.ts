import { Type } from '@angular/core';

/**
 * Rejestr widoków sandboxa — jedno źródło dla routingu, nawigacji i strony
 * wejściowej. Dodanie widoku to jeden wpis tutaj.
 */
export type SbxViewGroup = 'components' | 'cross';

export interface SbxView {
  /** Ścieżka bez wiodącego ukośnika; `''` to strona wejściowa. */
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
  { id: 'components', label: 'Komponenty' },
  { id: 'cross', label: 'Przekrojowe' },
];

export const SBX_VIEWS: readonly SbxView[] = [
  {
    path: '',
    title: 'Start',
    summary: 'Spis widoków sandboxa.',
    group: 'cross',
    load: () => import('./views/index/index-view').then((m) => m.IndexView),
  },
  {
    path: 'button',
    title: 'Button',
    summary: 'Warianty, wielkości i stany przycisku.',
    group: 'components',
    load: () => import('./views/button/button-view').then((m) => m.ButtonView),
  },
  {
    path: 'field',
    title: 'Field',
    summary: 'Obudowa pola: etykieta, podpowiedź, błąd, dekoracje i ramka.',
    group: 'components',
    load: () => import('./views/field/field-view').then((m) => m.FieldView),
  },
  {
    path: 'text',
    title: 'Text',
    summary:
      'Pole tekstowe na natywnym <input> i zgodność ze starymi formularzami.',
    group: 'components',
    load: () => import('./views/text/text-view').then((m) => m.TextView),
  },
  {
    path: 'number',
    title: 'Number',
    summary: 'Pole liczbowe: locale, ułamki, krokowanie, granice ze schematu.',
    group: 'components',
    load: () => import('./views/number/number-view').then((m) => m.NumberView),
  },
  {
    path: 'checkbox',
    title: 'Checkbox',
    summary: 'Zaznaczenie, stan nieokreślony i obszar dotyku.',
    group: 'components',
    load: () =>
      import('./views/checkbox/checkbox-view').then((m) => m.CheckboxView),
  },
  {
    path: 'radio',
    title: 'Radio',
    summary: 'Grupa radiów: kontrolką formularza jest kontener.',
    group: 'components',
    load: () => import('./views/radio/radio-view').then((m) => m.RadioView),
  },
  {
    path: 'select',
    title: 'Select',
    summary: 'Combobox z własnym panelem w nakładce CDK.',
    group: 'components',
    load: () => import('./views/select/select-view').then((m) => m.SelectView),
  },
  {
    path: 'size',
    title: 'Wielkość',
    summary: 'Wszystkie komponenty na wspólnej osi sm/md/lg.',
    group: 'cross',
    load: () => import('./views/size/size-view').then((m) => m.SizeView),
  },
  {
    path: 'states',
    title: 'Stany',
    summary:
      'Ten sam zestaw stanów dla każdej kontrolki: wyłączenie, odczyt, błąd, wymagalność.',
    group: 'cross',
    load: () => import('./views/states/states-view').then((m) => m.StatesView),
  },
  {
    path: 'all',
    title: 'Wszystko naraz',
    summary:
      'Gęsty przekrój wszystkich komponentów — pod audyt axe i testy wizualne.',
    group: 'cross',
    load: () =>
      import('./views/kitchen-sink/kitchen-sink').then((m) => m.KitchenSink),
  },
];

export function viewsOf(group: SbxViewGroup): readonly SbxView[] {
  return SBX_VIEWS.filter((v) => v.group === group);
}
