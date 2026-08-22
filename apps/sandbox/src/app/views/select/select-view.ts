import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctField } from '@pacit/components/field';
import {
  pctKeepAll,
  PctMultiSelect,
  PctSelect,
  PctSelectItem,
  PctSelectOption,
  PctSelectOptionTemplate,
} from '@pacit/components/select';
import { COUNTRIES, COUNTRIES_BY_REGION, LANGUAGES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';
import { SelectIcons } from './select-icons';

/**
 * A picker list with a panel of its own (not a native `<select>`): the ARIA
 * "select-only combobox" pattern, the panel in a CDK Overlay.
 */
@Component({
  selector: 'sbx-select-view',
  imports: [
    SbxDemo,
    PctButton,
    PctField,
    PctMultiSelect,
    PctSelect,
    PctSelectOptionTemplate,
    SelectIcons,
  ],
  templateUrl: './select-view.html',
  styleUrl: './select-view.scss',
})
export class SelectView {
  protected readonly countries = COUNTRIES;
  protected readonly regions = COUNTRIES_BY_REGION;
  protected readonly languages = LANGUAGES;
  /** The list a filter has emptied, before there is a filter to empty it. */
  protected readonly none: readonly PctSelectOption[] = [];

  protected readonly country = signal<string | null>('');
  protected readonly scopedCountry = signal<string | null>('');
  protected readonly bareCountry = signal<string | null>('pl');
  protected readonly emptyCountry = signal<string | null>(null);
  protected readonly templateCountry = signal<string | null>('de');
  protected readonly groupedCountry = signal<string | null>('pl');

  /**
   * A list of values, and that is the whole difference: `pct-multi-select` is a tag of its
   * own precisely so this signal cannot be handed to `pct-select` by mistake
   * (decision 0034).
   */
  protected readonly chosenCountries = signal<string[]>(['pl', 'sk']);

  /** The filtering pair: a grouped list narrowed by hand, and a list-valued one beside it. */
  protected readonly filteredCountry = signal<string | null>('lt');
  protected readonly filteredCountries = signal<string[]>(['pl', 'sk']);

  /** The clearing trio: a button trigger, a text one, and a list of answers. */
  protected readonly clearableCountry = signal<string | null>('pl');
  protected readonly clearableFiltered = signal<string | null>('lt');
  protected readonly clearableCountries = signal<string[]>(['pl', 'sk']);

  /**
   * The async trio: a list that is not there yet, the state that says so, and the answer.
   * It starts as a control whose list is on its way, which is the state the card is about.
   */
  protected readonly asyncOptions = signal<readonly PctSelectOption[]>([]);
  protected readonly asyncLoading = signal(true);
  protected readonly asyncCountry = signal<string | null>(null);

  /**
   * How many times the list has been answered — for a reader of the card, and for a test that
   * has to know WHICH answer it is looking at, since two fetches of one list look alike.
   */
  protected readonly answers = signal(0);

  /**
   * The predicate for a list somebody else has already narrowed. A constant and not
   * `() => true` written into the template: an arrow in a binding is a new function on every
   * change detection pass, and every row of the panel would be rebuilt for as long as the
   * page lives.
   */
  protected readonly keepAll = pctKeepAll;

  /**
   * The two actions again, on a channel a pointer does not use. What this card is about can
   * only be seen while the panel is OPEN — the sentence in it, the busy state, the cursor
   * over a list that is replaced underneath — and a press anywhere on the page closes it: the
   * CDK reads a click outside the panel as the question being over. A clock would be the
   * other way out and a worse one: an answer arriving 700 ms later makes every measurement a
   * race against the machine it runs on.
   *
   * `afterNextRender` because there is no `window` where this component first runs: the
   * sandbox is server-rendered.
   */
  constructor() {
    // Taken here rather than inside the callback: `afterNextRender` runs outside the
    // injection context that created the component.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ask = () => this.ask();
      const answer = () => this.answer();
      window.addEventListener('sbx-select-ask', ask);
      window.addEventListener('sbx-select-answer', answer);
      destroyRef.onDestroy(() => {
        window.removeEventListener('sbx-select-ask', ask);
        window.removeEventListener('sbx-select-answer', answer);
      });
    });
  }

  /** The question goes out: the list is gone and the control says it is coming. */
  protected ask(): void {
    this.asyncOptions.set([]);
    this.asyncLoading.set(true);
  }

  /**
   * The answer arrives. Every one of them is a fetch of its own, so the options are ANOTHER
   * instance of the same six rows — which is what a second answer from a server is, and the
   * state in which a cursor kept as a number starts naming a different option.
   */
  protected answer(): void {
    this.asyncOptions.set(COUNTRIES.map((option) => ({ ...option })));
    this.asyncLoading.set(false);
    this.answers.update((n) => n + 1);
  }

  /**
   * A list nobody types by hand: five thousand rows, which is the size at which the question
   * "how many of them exist" stops being theoretical. Built once, in a field rather than in a
   * getter, so the reference is stable and no change detection pass rebuilds it.
   */
  protected readonly manyOptions: readonly PctSelectOption[] = Array.from(
    { length: 5000 },
    (_, i) => ({ value: `r${i}`, label: `Row ${i}` }),
  );

  /** The same five thousand rows under a heading every hundred. */
  protected readonly manyGroups: readonly PctSelectItem[] = Array.from(
    { length: 50 },
    (_, g) => ({
      label: `Section ${g}`,
      options: this.manyOptions.slice(g * 100, g * 100 + 100),
    }),
  );

  protected readonly manyValue = signal<string | null>(null);
  protected readonly manyPlainValue = signal<string | null>(null);
  protected readonly manyFilterValue = signal<string | null>(null);
  protected readonly manyGroupValue = signal<string | null>(null);

  protected readonly widthField = signal<string | null>('pl');
  protected readonly widthAuto = signal<string | null>('pl');
  protected readonly widthFixed = signal<string | null>('pl');
}
