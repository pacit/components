/** Opcja listy wyboru. Wartości są napisami — spójnie z `PctRadioGroup`. */
export interface PctSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}
