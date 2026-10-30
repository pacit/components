import { type PctAnyColumn, pctColumnsOf } from './columns';
import { pctMatches, pctMatchParts, pctQuestionWords } from './question';

interface Device {
  name: string;
  room: string;
  power: number;
}

const col = pctColumnsOf<Device>();
const name = col.key('name', { header: 'Name' });
const room = col.key('room', { header: 'Room' });
const power = col.key('power', { header: 'Power' });
const lamp: Device = { name: 'Ceiling Lamp', room: 'Kitchen', power: 7899.7 };
/** The text a table would show: the power as `pl` writes it, with a no-break space. */
const shown = (column: PctAnyColumn<Device>, row: Device) =>
  column.id === 'power' ? `7\u00A0899,7\u00A0kWh` : String(column.value(row));

describe('pctQuestionWords', () => {
  it('folds the case and splits on any space, typed or no-break', () => {
    expect(pctQuestionWords('Kitchen LAMP')).toEqual(['kitchen', 'lamp']);
    expect(pctQuestionWords('7\u00A0899')).toEqual(['7', '899']);
    expect(pctQuestionWords('  kitchen   lamp ')).toEqual(['kitchen', 'lamp']);
  });

  it('reads a question of spaces alone as no words', () => {
    expect(pctQuestionWords('')).toEqual([]);
    expect(pctQuestionWords('   ')).toEqual([]);
  });
});

describe('pctMatches', () => {
  const columns = [name, room, power];
  const ask = (
    question: string,
    list: readonly PctAnyColumn<Device>[] = columns,
  ) => pctMatches(lamp, list, shown, pctQuestionWords(question));

  it('answers every row for no words', () => {
    expect(ask('')).toBe(true);
  });

  it('finds a word in any column, whatever its case', () => {
    expect(ask('kitch')).toBe(true);
    expect(ask('LAMP')).toBe(true);
    expect(ask('garage')).toBe(false);
  });

  it('wants every word, each in a column of its own if need be', () => {
    expect(ask('kitchen lamp')).toBe(true);
    expect(ask('kitchen fan')).toBe(false);
  });

  it('searches the text the cell shows, not the raw value', () => {
    expect(ask('899,7')).toBe(true);
    expect(ask('7899.7')).toBe(false);
  });

  it('does not fold accents', () => {
    expect(
      pctMatches({ ...lamp, room: 'Résumé' }, columns, shown, ['resume']),
    ).toBe(false);
  });

  it('finds an accent stored as two characters by one typed as one', () => {
    // The combining acute after the letter, and the same word composed into one character.
    const decomposed = 'Cafe\u0301';
    const composed = decomposed.normalize('NFC');
    expect(composed).not.toBe(decomposed);
    const row = { ...lamp, room: decomposed };
    expect(pctMatches(row, columns, shown, pctQuestionWords(composed))).toBe(
      true,
    );
    expect(
      pctMatches(
        { ...lamp, room: composed },
        columns,
        shown,
        pctQuestionWords(decomposed),
      ),
    ).toBe(true);
    expect(pctQuestionWords(decomposed)).toEqual([composed.toLowerCase()]);
  });

  it('skips a column whose filter is false', () => {
    const hidden = col.key('room', { header: 'Room', filter: false });
    expect(ask('kitchen', [name, hidden])).toBe(false);
    expect(ask('lamp', [name, hidden])).toBe(true);
  });

  it('asks a column’s own filter once per word, with the raw value', () => {
    const asked: [number, string][] = [];
    const watts = col.key('power', {
      header: 'Power',
      filter: (value, word) => {
        asked.push([value, word]);
        return word === 'big' && value > 1000;
      },
    });
    expect(ask('big', [watts])).toBe(true);
    expect(ask('small', [watts])).toBe(false);
    expect(asked).toEqual([
      [7899.7, 'big'],
      [7899.7, 'small'],
    ]);
  });

  it('reads a cell’s text once for all the words that look at it', () => {
    let reads = 0;
    const counting = (column: PctAnyColumn<Device>, row: Device) => {
      reads++;
      return shown(column, row);
    };
    expect(pctMatches(lamp, [name], counting, ['ceiling', 'lamp'])).toBe(true);
    expect(reads).toBe(1);
  });
});

describe('pctMatchParts', () => {
  const marked = (text: string, words: readonly string[]) =>
    pctMatchParts(text, words).map((part) =>
      part.match ? `[${part.text}]` : part.text,
    );

  it('returns the text whole and unmarked for no words, or none found', () => {
    expect(pctMatchParts('Kitchen', [])).toEqual([
      { text: 'Kitchen', match: false },
    ]);
    expect(pctMatchParts('Kitchen', ['hall'])).toEqual([
      { text: 'Kitchen', match: false },
    ]);
    expect(pctMatchParts('', ['hall'])).toEqual([{ text: '', match: false }]);
  });

  it('marks a word at the start, inside and at the end, in the case the text has', () => {
    expect(pctMatchParts('Kitchen lamp', ['kitch'])).toEqual([
      { text: 'Kitch', match: true },
      { text: 'en lamp', match: false },
    ]);
    expect(marked('Kitchen lamp', ['chen'])).toEqual([
      'Kit',
      '[chen]',
      ' lamp',
    ]);
    expect(marked('Kitchen lamp', ['lamp'])).toEqual(['Kitchen ', '[lamp]']);
    expect(marked('LAMP', ['lamp'])).toEqual(['[LAMP]']);
  });

  it('marks every place a word stands, and every word', () => {
    expect(marked('a lamp, a lamp', ['lamp'])).toEqual([
      'a ',
      '[lamp]',
      ', a ',
      '[lamp]',
    ]);
    expect(marked('Kitchen lamp', ['lamp', 'kit'])).toEqual([
      '[Kit]',
      'chen ',
      '[lamp]',
    ]);
  });

  it('draws places that overlap or touch as one mark, and one inside another as the outer', () => {
    expect(marked('Kitchen', ['kit', 'itch'])).toEqual(['[Kitch]', 'en']);
    expect(marked('Kitchen', ['kit', 'chen'])).toEqual(['[Kitchen]']);
    expect(marked('aaa', ['aa'])).toEqual(['[aaa]']);
    expect(marked('Kitchen!', ['kitchen', 'tch'])).toEqual(['[Kitchen]', '!']);
    expect(marked('1 899,5', ['9'])).toEqual(['1 8', '[99]', ',5']);
  });

  it('leaves a text whose folding changes its length unmarked', () => {
    // A capital dotted I lower-cases to two characters; an accent stored as two composes to one.
    expect(marked('İstanbul', ['stan'])).toEqual(['İstanbul']);
    const decomposed = `Resume${String.fromCharCode(0x301)}`;
    expect(marked(decomposed, ['resum'])).toEqual([decomposed]);
  });

  it('skips an empty word rather than stopping on it', () => {
    expect(marked('Kitchen', ['', 'kit'])).toEqual(['[Kit]', 'chen']);
  });
});
