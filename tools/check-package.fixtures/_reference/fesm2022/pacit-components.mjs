/*
 * Kod pakietu w miniaturze. Bramka czyta z niego dwie rzeczy: stałą PCT_VERSION
 * (punkt 4) i użycia `var(--pct-*)` w tekście stylu (punkt 3). Styl jest tu
 * łańcuchem znaków nieprzypadkowo — w prawdziwym artefakcie style komponentów
 * siedzą w bundlu dokładnie w tej postaci.
 */
const PCT_VERSION = '0.0.1';

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export { PCT_VERSION, styles };
