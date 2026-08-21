import { PctSelectItem, PctSelectOption } from '@pacit/components/select';

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

/**
 * The same countries under headings, with one option standing before the first of them and
 * one group nobody may pick from — what a native `<select>` writes as an `<option>` above the
 * first `<optgroup>` and an `<optgroup disabled>`.
 */
export const COUNTRIES_BY_REGION: readonly PctSelectItem[] = [
  { value: 'any', label: 'Anywhere' },
  {
    label: 'Central Europe',
    options: [
      { value: 'pl', label: 'Poland' },
      { value: 'cz', label: 'Czechia' },
      { value: 'sk', label: 'Slovakia' },
    ],
  },
  {
    label: 'Baltic',
    options: [
      { value: 'lt', label: 'Lithuania' },
      { value: 'lv', label: 'Latvia', disabled: true },
    ],
  },
  {
    label: 'Coming later',
    disabled: true,
    options: [
      { value: 'jp', label: 'Japan' },
      { value: 'kr', label: 'Korea' },
    ],
  },
];
