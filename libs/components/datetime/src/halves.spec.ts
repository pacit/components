import { pctDateTimeHalves } from './halves';

describe('pctDateTimeHalves — the order a language writes a day with a time in', () => {
  it('stands the day first where the language does, whatever stands between the halves', () => {
    // A comma in English and Polish, a space in French, the word `klo` in Finnish, an Arabic
    // comma in Arabic, and the day's own order reversed in Korean and Hungarian (0090, C1–C2).
    for (const locale of [
      'en-US',
      'en-GB',
      'pl-PL',
      'fr-FR',
      'fi-FI',
      'ar-EG',
      'ko-KR',
      'hu-HU',
      'ja-JP',
      'he-IL',
    ])
      expect([locale, pctDateTimeHalves(locale)]).toEqual([
        locale,
        ['day', 'time'],
      ]);
  });

  it('stands the time first in Vietnamese, the one language of 52 that writes it so', () => {
    expect(pctDateTimeHalves('vi-VN')).toEqual(['time', 'day']);
    expect(pctDateTimeHalves('vi')).toEqual(['time', 'day']);
  });

  it('stands the time first where the day period opens the pair — Ewe, outside the 52', () => {
    // A scan of node's 250 languages found one more that writes the time first, and it opens
    // on the day period rather than the hour.
    expect(pctDateTimeHalves('ee')).toEqual(['time', 'day']);
  });

  it('reads the first field of every kind — the day, the month, the year — as the day’s half', () => {
    // Polish writes the day first, American English the month, Japanese and Hungarian the year.
    expect(pctDateTimeHalves('pl-PL')).toEqual(['day', 'time']);
    expect(pctDateTimeHalves('en-US')).toEqual(['day', 'time']);
    expect(pctDateTimeHalves('ja-JP')).toEqual(['day', 'time']);
    // And a literal before the first field — Arabic's marks, Hebrew's — is passed over.
    expect(pctDateTimeHalves('ar-EG-u-nu-arab')).toEqual(['day', 'time']);
  });

  it('reads the order off the formatter, not off the language’s name', () => {
    // A forced twelve-hour clock moves no half.
    expect(pctDateTimeHalves('vi-VN-u-hc-h12')).toEqual(['time', 'day']);
    expect(pctDateTimeHalves('en-US-u-hc-h23')).toEqual(['day', 'time']);
  });
});
