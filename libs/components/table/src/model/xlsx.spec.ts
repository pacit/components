import { PCT_XLSX_TYPE, type PctSheet, pctXlsx } from './xlsx';

interface Entry {
  readonly name: string;
  readonly method: number;
  readonly text: string;
  readonly packed: number;
}

/** A CRC-32 by the table, as zlib computes it: another way to the same sum. */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(data: Uint8Array): number {
  let crc = ~0;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return ~crc >>> 0;
}

async function inflate(body: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(body as Uint8Array<ArrayBuffer>);
  void writer.close();
  const chunks: number[] = [];
  const reader = stream.readable.getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read())
    chunks.push(...read.value);
  return new Uint8Array(chunks);
}

/**
 * The zip read back as a program reads it: from the end of its central directory, each entry
 * checked against its local header, inflated by the platform and its CRC summed again.
 */
async function unzip(bytes: Uint8Array): Promise<Entry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  expect(view.getUint16(end + 8, true)).toBe(count);
  const size = view.getUint32(end + 12, true);
  const start = view.getUint32(end + 16, true);
  expect(start + size).toBe(end);
  const decoder = new TextDecoder();
  const entries: Entry[] = [];
  let at = start;
  for (let n = 0; n < count; n++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    expect(view.getUint16(at + 4, true)).toBe(20);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const packed = view.getUint32(at + 20, true);
    const length = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    // The local header says what the central one does, two bytes earlier.
    for (const [local, width] of [
      [4, 2],
      [6, 2],
      [8, 2],
      [10, 2],
      [12, 2],
      [14, 4],
      [18, 4],
      [22, 4],
      [26, 2],
    ]) {
      const read = (from: number) =>
        width === 4 ? view.getUint32(from, true) : view.getUint16(from, true);
      expect(read(offset + local)).toBe(read(at + local + 2));
    }
    // Version 2.0 to extract, no flags, 00:00 on 1980-01-01.
    expect(view.getUint16(at + 6, true)).toBe(20);
    expect(view.getUint16(at + 8, true)).toBe(0);
    expect(view.getUint16(at + 12, true)).toBe(0);
    expect(view.getUint16(at + 14, true)).toBe(0x21);
    const body = bytes.subarray(
      offset + 30 + nameLength,
      offset + 30 + nameLength + packed,
    );
    expect(
      decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength)),
    ).toBe(name);
    const data = method === 8 ? await inflate(body) : body;
    expect(data.length).toBe(length);
    expect(crc32(data)).toBe(crc);
    entries.push({ name, method, text: decoder.decode(data), packed });
    at += 46 + nameLength;
  }
  expect(at).toBe(end);
  return entries;
}

async function partsOf(sheet: PctSheet): Promise<Map<string, string>> {
  return new Map(
    (await unzip(await pctXlsx(sheet))).map((entry) => [
      entry.name,
      entry.text,
    ]),
  );
}

const LAMPS: PctSheet = {
  name: 'Rules',
  columns: [
    { header: 'Name', width: 12 },
    { header: 'Power', width: 8.5 },
  ],
  rows: [
    ['Lamp', 12.5],
    ['Fan', null],
  ],
};

describe('pctXlsx', () => {
  it('is read by a CRC that sums the check string as zlib does', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes the six parts of a workbook into a zip a reader opens, each deflated', async () => {
    const entries = await unzip(await pctXlsx(LAMPS));
    expect(entries.map((entry) => entry.name)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]);
    for (const entry of entries) {
      expect(entry.method).toBe(8);
      expect(
        entry.text.startsWith(
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
        ),
      ).toBe(true);
      expect(entry.packed).toBeLessThan(
        new TextEncoder().encode(entry.text).length,
      );
    }
    const parts = new Map(entries.map((entry) => [entry.name, entry.text]));
    // The four fixed parts, byte for byte: a reader refuses a workbook whose types or
    // relations are off by a word.
    const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
    const OFFICE =
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    expect(parts.get('[Content_Types].xml')).toBe(
      XML +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        `<Override PartName="/xl/workbook.xml" ContentType="${TYPE}.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${TYPE}.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="${TYPE}.styles+xml"/>` +
        '</Types>',
    );
    expect(parts.get('_rels/.rels')).toBe(
      XML +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${OFFICE}/officeDocument" Target="xl/workbook.xml"/>` +
        '</Relationships>',
    );
    expect(parts.get('xl/_rels/workbook.xml.rels')).toBe(
      XML +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${OFFICE}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${OFFICE}/styles" Target="styles.xml"/>` +
        '</Relationships>',
    );
    expect(parts.get('xl/styles.xml')).toBe(
      XML +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="4">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="22" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '</cellXfs></styleSheet>',
    );
    expect(parts.get('xl/workbook.xml')).toBe(
      XML +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        `xmlns:r="${OFFICE}">` +
        '<sheets><sheet name="Rules" sheetId="1" r:id="rId1"/></sheets></workbook>',
    );
    expect(
      parts
        .get('xl/worksheets/sheet1.xml')
        ?.startsWith(
          XML +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<sheetViews>',
        ),
    ).toBe(true);
    expect(PCT_XLSX_TYPE).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('writes the same bytes for the same sheet', async () => {
    expect(await pctXlsx(LAMPS)).toEqual(await pctXlsx(LAMPS));
  });

  it('stores the parts as they are where the platform has no compression stream', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    try {
      const entries = await unzip(await pctXlsx(LAMPS));
      for (const entry of entries) {
        expect(entry.method).toBe(0);
        expect(entry.packed).toBe(new TextEncoder().encode(entry.text).length);
      }
      expect(entries[2].text).toContain(
        '<sheet name="Rules" sheetId="1" r:id="rId1"/>',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('writes the header row bold and frozen, and each column its width', async () => {
    const sheet = (await partsOf(LAMPS)).get('xl/worksheets/sheet1.xml');
    expect(sheet).toContain(
      '<sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>',
    );
    expect(sheet).toContain(
      '<cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="8.5" customWidth="1"/></cols>',
    );
    expect(sheet).toContain(
      '<sheetData><row r="1">' +
        '<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Name</t></is></c>' +
        '<c r="B1" t="inlineStr" s="1"><is><t xml:space="preserve">Power</t></is></c>' +
        '</row><row r="2">' +
        '<c r="A2" t="inlineStr"><is><t xml:space="preserve">Lamp</t></is></c>' +
        '<c r="B2"><v>12.5</v></c>' +
        '</row><row r="3">' +
        '<c r="A3" t="inlineStr"><is><t xml:space="preserve">Fan</t></is></c>' +
        '</row></sheetData></worksheet>',
    );
    const bare = (await partsOf({ name: 'Empty', columns: [], rows: [] })).get(
      'xl/worksheets/sheet1.xml',
    );
    expect(bare).not.toContain('<cols');
    expect(bare).toContain('<sheetData><row r="1"></row></sheetData>');
  });

  it('writes a boolean as one, a day and a moment as dates in their formats, and a number that is none as nothing', async () => {
    const sheet = (
      await partsOf({
        name: 'Kinds',
        columns: [],
        rows: [
          [
            true,
            false,
            { wall: Date.UTC(2026, 10, 3), time: false },
            { wall: Date.UTC(2026, 10, 3, 14, 5), time: true },
            Number.NaN,
            Number.POSITIVE_INFINITY,
            -0.25,
          ],
        ],
      })
    ).get('xl/worksheets/sheet1.xml') as string;
    expect(sheet).toContain(
      '<row r="2"><c r="A2" t="b"><v>1</v></c><c r="B2" t="b"><v>0</v></c><c r="C2" s="2"><v>46329</v></c>',
    );
    const moment = /<c r="D2" s="3"><v>([\d.]+)<\/v><\/c>/.exec(sheet);
    // 14:05 is 845 minutes of the day's 1440.
    expect(Number(moment?.[1])).toBeCloseTo(46329 + 845 / 1440, 9);
    expect(sheet).toContain('</c><c r="G2"><v>-0.25</v></c></row>');
    expect(sheet).not.toContain('E2');
    expect(sheet).not.toContain('F2');
  });

  it('escapes markup and leaves out the characters XML cannot hold', async () => {
    const parts = await partsOf({
      name: 'A & B',
      columns: [{ header: '<b>"x"</b>', width: 5 }],
      rows: [
        [
          `a${String.fromCharCode(0)}b${String.fromCharCode(8)}c${String.fromCharCode(11)}${String.fromCharCode(12)}d${String.fromCharCode(14)}${String.fromCharCode(31)}\tq\nq\rq & h`,
        ],
      ],
    });
    expect(parts.get('xl/workbook.xml')).toContain('<sheet name="A &amp; B"');
    const sheet = parts.get('xl/worksheets/sheet1.xml');
    expect(sheet).toContain(
      '<t xml:space="preserve">&lt;b&gt;&quot;x&quot;&lt;/b&gt;</t>',
    );
    expect(sheet).toContain(
      '<t xml:space="preserve">abcd\tq\nq\rq &amp; h</t>',
    );
  });

  it("names the sheet as a workbook takes it: none of []:*?/\\, at most 31 characters, 'Sheet1' when none is left", async () => {
    const name = async (sheet: string) =>
      /<sheet name="([^"]*)"/.exec(
        (await partsOf({ name: sheet, columns: [], rows: [] })).get(
          'xl/workbook.xml',
        ) as string,
      )?.[1];
    expect(await name('a[b]c:d*e?f/g\\h')).toBe('a b c d e f g h');
    expect(await name(` ${'x'.repeat(40)}`)).toBe('x'.repeat(31));
    expect(await name('[]')).toBe('Sheet1');
    expect(await name('')).toBe('Sheet1');
    // Excel refuses an apostrophe at either end, and keeps `History` for itself.
    expect(await name("'Rules'")).toBe('Rules');
    expect(await name("'' Rules ''")).toBe('Rules');
    expect(await name("''")).toBe('Sheet1');
    expect(await name('History')).toBe('Sheet1');
    expect(await name('history')).toBe('Sheet1');
    expect(await name('Histories')).toBe('Histories');
    expect(await name(`'${'x'.repeat(31)}`)).toBe('x'.repeat(30));
  });

  it('holds a width to what a sheet takes, and cuts a text at what a cell holds', async () => {
    const parts = await partsOf({
      name: 'Edges',
      columns: [
        { header: 'Wide', width: 300 },
        { header: 'Narrow', width: -5 },
        { header: 'Odd', width: Number.NaN },
        { header: 'Zero', width: 0 },
      ],
      rows: [['x'.repeat(40_000)]],
    });
    const sheet = parts.get('xl/worksheets/sheet1.xml') as string;
    expect(sheet).toContain(
      '<cols><col min="1" max="1" width="255" customWidth="1"/>' +
        '<col min="2" max="2" width="0" customWidth="1"/>' +
        '<col min="3" max="3" width="8.43" customWidth="1"/>' +
        '<col min="4" max="4" width="0" customWidth="1"/></cols>',
    );
    expect(sheet).toContain(
      `<t xml:space="preserve">${'x'.repeat(32_767)}</t>`,
    );
    expect(sheet).not.toContain('x'.repeat(32_768));
  });

  it('names the columns past Z as a sheet does: AA, then on to ZZ and AAA', async () => {
    const cells = Array.from({ length: 703 }, (_, i) => i);
    const sheet = (
      await partsOf({ name: 'Wide', columns: [], rows: [cells] })
    ).get('xl/worksheets/sheet1.xml') as string;
    for (const [ref, value] of [
      ['A2', 0],
      ['Z2', 25],
      ['AA2', 26],
      ['AZ2', 51],
      ['BA2', 52],
      ['ZZ2', 701],
      ['AAA2', 702],
    ] as const)
      expect(sheet).toContain(`<c r="${ref}"><v>${value}</v></c>`);
  });
});
