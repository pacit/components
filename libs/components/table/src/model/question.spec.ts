import { type PctAnyColumn, pctColumnsOf } from './columns';
import { pctMatches, pctQuestionWords } from './question';

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
