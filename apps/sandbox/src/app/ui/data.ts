import { PctSelectOption } from '@pacit/components/select';

/** Lista używana w kilku widokach — jedna, żeby przykłady mówiły to samo. */
export const COUNTRIES: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Polska' },
  { value: 'de', label: 'Niemcy' },
  { value: 'cz', label: 'Czechy', disabled: true },
  { value: 'sk', label: 'Słowacja' },
  { value: 'ua', label: 'Ukraina' },
  { value: 'lt', label: 'Litwa' },
];
