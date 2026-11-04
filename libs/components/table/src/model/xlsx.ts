/**
 * A cell of a sheet: a text, a number, a boolean, a day or a moment, or nothing. A day and a
 * moment are a wall clock written as the milliseconds `Date.UTC` gives for its fields, so the
 * sheet shows the clock the table showed whatever zone it is opened in.
 *
 * @since next
 */
export type PctSheetCell =
  | string
  | number
  | boolean
  | null
  | { readonly wall: number; readonly time: boolean };

/**
 * A sheet to write: its name, its columns' headers and widths — in characters, as a sheet
 * counts them — and its rows of cells.
 *
 * @since next
 */
export interface PctSheet {
  readonly name: string;
  readonly columns: readonly {
    readonly header: string;
    readonly width: number;
  }[];
  readonly rows: readonly (readonly PctSheetCell[])[];
}

/**
 * A workbook of one sheet as the bytes of an `.xlsx` file, with no library: the file is a zip
 * of six XML parts, written here, and its parts are compressed by the platform's
 * `CompressionStream` where it has one, or stored as they are where it does not. A number is a number and a day a date, in a format the sheet writes in its own
 * locale; the header row is bold and stays in view; a text is inline, so no table of shared
 * strings is needed, and one longer than the 32,767 characters a cell holds is cut there. A
 * character XML cannot hold — a control character — is left out.
 *
 * @example
 * const bytes = await pctXlsx({ name: 'Rules', columns: [{ header: 'Name', width: 20 }], rows: [['Lamp']] });
 * new Blob([bytes], { type: PCT_XLSX_TYPE });
 *
 * @since next
 */
export async function pctXlsx(sheet: PctSheet): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const parts: [string, string][] = [
    ['[Content_Types].xml', contentTypes()],
    ['_rels/.rels', rootRels()],
    ['xl/workbook.xml', workbookOf(sheet.name)],
    ['xl/_rels/workbook.xml.rels', workbookRels()],
    ['xl/styles.xml', styles()],
    ['xl/worksheets/sheet1.xml', sheetOf(sheet)],
  ];
  const files: ZipFile[] = [];
  for (const [name, xml] of parts) {
    const data = encoder.encode(xml);
    const packed = await deflate(data);
    files.push({ name: encoder.encode(name), data, packed });
  }
  return zip(files);
}

/**
 * The media type of an `.xlsx` file, for the `Blob` an application downloads.
 *
 * @since next
 */
export const PCT_XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

function contentTypes(): string {
  return (
    XML +
    element(
      'Types',
      { xmlns: 'http://schemas.openxmlformats.org/package/2006/content-types' },
      element('Default', {
        Extension: 'rels',
        ContentType: 'application/vnd.openxmlformats-package.relationships+xml',
      }) +
        element('Default', {
          Extension: 'xml',
          ContentType: 'application/xml',
        }) +
        element('Override', {
          PartName: '/xl/workbook.xml',
          ContentType: `${TYPE}.sheet.main+xml`,
        }) +
        element('Override', {
          PartName: '/xl/worksheets/sheet1.xml',
          ContentType: `${TYPE}.worksheet+xml`,
        }) +
        element('Override', {
          PartName: '/xl/styles.xml',
          ContentType: `${TYPE}.styles+xml`,
        }),
    )
  );
}

function rootRels(): string {
  return (
    XML +
    element(
      'Relationships',
      { xmlns: RELS },
      element('Relationship', {
        Id: 'rId1',
        Type: `${OFFICE}/officeDocument`,
        Target: 'xl/workbook.xml',
      }),
    )
  );
}

function workbookRels(): string {
  return (
    XML +
    element(
      'Relationships',
      { xmlns: RELS },
      element('Relationship', {
        Id: 'rId1',
        Type: `${OFFICE}/worksheet`,
        Target: 'worksheets/sheet1.xml',
      }) +
        element('Relationship', {
          Id: 'rId2',
          Type: `${OFFICE}/styles`,
          Target: 'styles.xml',
        }),
    )
  );
}

/**
 * Four styles: a cell as it is, the bold header, a day and a moment. The two formats are the
 * sheet's own, 14 and 22, which a spreadsheet writes in the reader's locale.
 */
function styles(): string {
  return (
    XML +
    element(
      'styleSheet',
      { xmlns: MAIN },
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
        '</cellXfs>',
    )
  );
}

/**
 * A sheet's name as a workbook takes it: 31 characters at most, none of `[]:*?/\`, no
 * apostrophe at either end, and not `History`, which Excel keeps for itself.
 */
function workbookOf(name: string): string {
  const cut = name
    .replace(/[[\]:*?/\\]/g, ' ')
    .trim()
    .slice(0, 31)
    .replace(/^'+|'+$/g, '')
    .trim();
  const safe = cut === '' || cut.toLowerCase() === 'history' ? 'Sheet1' : cut;
  return (
    XML +
    element(
      'workbook',
      { xmlns: MAIN, 'xmlns:r': OFFICE },
      element(
        'sheets',
        {},
        element('sheet', { name: escape(safe), sheetId: 1, 'r:id': 'rId1' }),
      ),
    )
  );
}

function sheetOf(sheet: PctSheet): string {
  const columns = sheet.columns
    .map((column, c) =>
      element('col', {
        min: c + 1,
        max: c + 1,
        // A sheet takes a width of 0 to 255 characters; one that is no number is its default.
        width: Number.isFinite(column.width)
          ? Math.min(Math.max(column.width, 0), 255)
          : 8.43,
        customWidth: 1,
      }),
    )
    .join('');
  const header = sheet.columns.map((column, c) =>
    element(
      'c',
      { r: `${columnName(c)}1`, t: 'inlineStr', s: 1 },
      inline(column.header),
    ),
  );
  const rows = sheet.rows.map((cells, r) =>
    element(
      'row',
      { r: r + 2 },
      cells.map((cell, c) => cellOf(cell, `${columnName(c)}${r + 2}`)).join(''),
    ),
  );
  return (
    XML +
    element(
      'worksheet',
      { xmlns: MAIN },
      element(
        'sheetViews',
        {},
        element(
          'sheetView',
          { workbookViewId: 0 },
          element('pane', {
            ySplit: 1,
            topLeftCell: 'A2',
            activePane: 'bottomLeft',
            state: 'frozen',
          }),
        ),
      ) +
        (columns === '' ? '' : element('cols', {}, columns)) +
        element(
          'sheetData',
          {},
          element('row', { r: 1 }, header.join('')) + rows.join(''),
        ),
    )
  );
}

/** A cell's XML at its reference; an empty cell, and a number that is none, write nothing. */
function cellOf(cell: PctSheetCell, ref: string): string {
  if (cell === null) return '';
  if (typeof cell === 'string')
    return element('c', { r: ref, t: 'inlineStr' }, inline(cell));
  if (typeof cell === 'boolean')
    return element('c', { r: ref, t: 'b' }, element('v', {}, cell ? '1' : '0'));
  if (typeof cell === 'number')
    return Number.isFinite(cell)
      ? element('c', { r: ref }, element('v', {}, String(cell)))
      : '';
  // A sheet counts days from 1899-12-30, the day before its first, which it takes for a leap
  // year that was not: 25 569 days stand between that day and 1970-01-01.
  const serial = cell.wall / 86_400_000 + 25_569;
  return element(
    'c',
    { r: ref, s: cell.time ? 3 : 2 },
    element('v', {}, String(serial)),
  );
}

/** A text as an inline string holds it, its spaces kept. */
function inline(text: string): string {
  return element(
    'is',
    {},
    element('t', { 'xml:space': 'preserve' }, escape(text.slice(0, 32_767))),
  );
}

/**
 * An element of XML: its name, its attributes in their order, and what it holds; with nothing
 * to hold, it closes itself. A value is the caller's to escape.
 */
function element(
  name: string,
  attributes: Readonly<Record<string, string | number>> = {},
  inner?: string,
): string {
  const written = Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
  return inner === undefined
    ? `<${name}${written}/>`
    : `<${name}${written}>${inner}</${name}>`;
}

/** A column's letters: A to Z, then AA. */
function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/** Text as XML holds it: its markup escaped, the characters XML cannot hold left out. */
function escape(text: string): string {
  return (
    text
      // The control characters are what is matched: XML 1.0 has no place for them.
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  );
}

interface ZipFile {
  readonly name: Uint8Array;
  readonly data: Uint8Array;
  /** The data deflated, or `null` where it is stored as it is. */
  readonly packed: Uint8Array | null;
}

/** The data deflated by the platform, raw as a zip holds it; `null` without the stream. */
async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream !== 'function') return null;
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(data as Uint8Array<ArrayBuffer>);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read())
    chunks.push(read.value);
  return join(chunks);
}

/**
 * The files as a zip: each with its local header, then the central directory and its end,
 * as the format's version 2.0 has them. Every file is dated 1980-01-01, the format's first
 * day, so the same rows make the same bytes.
 */
function zip(files: readonly ZipFile[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const body = file.packed ?? file.data;
    const crc = crc32(file.data);
    const common = (header: DataView, at: number) => {
      header.setUint16(at, 20, true); // the version needed to extract: 2.0
      header.setUint16(at + 2, 0, true); // no flags
      header.setUint16(at + 4, file.packed === null ? 0 : 8, true); // stored, or deflated
      header.setUint16(at + 6, 0, true); // 00:00
      header.setUint16(at + 8, 0x21, true); // 1980-01-01
      header.setUint32(at + 10, crc, true);
      header.setUint32(at + 14, body.length, true);
      header.setUint32(at + 18, file.data.length, true);
      header.setUint16(at + 22, file.name.length, true);
    };
    const local = new Uint8Array(30 + file.name.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    common(l, 4);
    local.set(file.name, 30);
    const central = new Uint8Array(46 + file.name.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); // made by version 2.0
    common(c, 6);
    c.setUint32(42, offset, true);
    central.set(file.name, 46);
    locals.push(local, body);
    centrals.push(central);
    offset += local.length + body.length;
  }
  const directory = join(centrals);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, directory.length, true);
  e.setUint32(16, offset, true);
  return join([...locals, directory, end]);
}

function join(chunks: readonly Uint8Array[]): Uint8Array {
  const all = new Uint8Array(chunks.reduce((sum, one) => sum + one.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    all.set(chunk, at);
    at += chunk.length;
  }
  return all;
}

/** The CRC-32 a zip checks each file by: the polynomial 0xEDB88320, bit by bit. */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
