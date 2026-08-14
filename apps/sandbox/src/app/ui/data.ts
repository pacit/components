import { PctSelectOption } from '@pacit/components/select';

/** One list used by several views — so the examples say the same thing. */
export const COUNTRIES: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Poland' },
  { value: 'de', label: 'Germany' },
  { value: 'cz', label: 'Czechia', disabled: true },
  { value: 'sk', label: 'Slovakia' },
  { value: 'ua', label: 'Ukraine' },
  { value: 'lt', label: 'Lithuania' },
];

/** Labels longer than a typical field — for the panel width examples. */
export const LANGUAGES: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Polish' },
  { value: 'en', label: 'English (United Kingdom)' },
  { value: 'pt', label: 'Portuguese (Brazil) — the formal variant' },
  { value: 'zh', label: 'Chinese, simplified (Singapore)' },
];
