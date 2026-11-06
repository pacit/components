import { pctWallClockOf } from '@pacit/components/core';
import type { PctDataTable } from './data-table';
import type { PctAnyColumn } from './model/columns';
import {
  type PctDelimiter,
  pctDelimiterOf,
  pctPlainWriter,
  pctShowsTime,
  pctWriteDelimited,
} from './model/csv';
import { pctSheetText } from './model/formula';
import { PCT_XLSX_TYPE, type PctSheetCell, pctXlsx } from './model/xlsx';

/**
 * What an export writes: the values as another program reads them, or with `formatted` the
 * texts the cells show — a number in its unit, an instant on its clock, a boolean as its word.
 *
 * @since 0.3.1
 */
export interface PctTableExportOptions {
  readonly formatted?: boolean;
}

/**
 * A CSV export: the delimiter — by default the one a spreadsheet of the table's locale reads,
 * `;` where its decimals are written with a comma — and whether the file begins with the
 * byte-order mark that tells a spreadsheet it is UTF-8, which it does by default.
 *
 * @since 0.3.1
 */
export interface PctTableCsvOptions extends PctTableExportOptions {
  readonly delimiter?: PctDelimiter;
  readonly bom?: boolean;
}

/**
 * An `.xlsx` export: the sheet's name, and the columns' widths in pixels by id — the
 * `widths` of a `pctTableColumns` layout — where a sheet should not size them by their text.
 *
 * @since 0.3.1
 */
export interface PctTableXlsxOptions extends PctTableExportOptions {
  readonly sheet?: string;
  readonly widths?: Readonly<Record<string, number>>;
}

/**
 * The table as CSV: a line of headers, then a line for each row the filter let through, in
 * the table's order, with every column the user has not hidden — those a narrow frame moved
 * into the details too, since a file has room for them. A cell that begins with `=`, `+`,
 * `-`, `@` or a tab is a text a spreadsheet would run as a formula, and is written after an
 * apostrophe, which the sheet shows as nothing; a number is never one of them. Downloading
 * the text is the application's: the table offers no button.
 *
 * @example
 * const csv = pctTableCsv(table);
 * const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
 *
 * @since 0.3.1
 */
export function pctTableCsv<T, M extends Record<string, unknown>>(
  table: PctDataTable<T, M>,
  options: PctTableCsvOptions = {},
): string {
  const locale = table.resolvedLocale();
  const columns = exported(table);
  const write = columns.map((column) => {
    // A text column writes what the cell shows: the plain writer is for the other kinds.
    const plain =
      options.formatted || column.kind === undefined || column.kind === 'text'
        ? null
        : pctPlainWriter(column.kind, locale);
    const numeric = plainNumber(column);
    return (row: T) => {
      const text =
        plain === null
          ? table.textOf(row, column.id)
          : plain(column.value(row));
      return numeric ? text : pctSheetText(text);
    };
  });
  const cells = [
    columns.map((column) => column.header),
    ...table.matchedRows().map((row) => write.map((cell) => cell(row))),
  ];
  const text = pctWriteDelimited(
    cells,
    options.delimiter ?? pctDelimiterOf(locale),
  );
  return options.bom === false ? text : `\ufeff${text}`;
}

/**
 * The table as an `.xlsx` workbook of one sheet, with no library: the rows and columns of
 * {@link pctTableCsv}, a number as a number, an instant as a date — of the day, or of the
 * moment where the column shows a time, on the column's zone's wall clock — and a boolean as
 * one; with `formatted`, every cell the text it shows. The header row is bold and frozen, and
 * a column is as wide as its widest text, up to sixty characters, unless `widths` says.
 *
 * @example
 * const file = await pctTableXlsx(table, { sheet: 'Rules' });
 * const url = URL.createObjectURL(file);
 *
 * @since 0.3.1
 */
export async function pctTableXlsx<T, M extends Record<string, unknown>>(
  table: PctDataTable<T, M>,
  options: PctTableXlsxOptions = {},
): Promise<Blob> {
  const columns = exported(table);
  const write = columns.map((column) => sheetWriter(table, column, options));
  const rows = table.matchedRows().map((row) => write.map((cell) => cell(row)));
  const sheet = {
    name: options.sheet ?? (table.caption() || table.ariaLabel()),
    columns: columns.map((column, c) => ({
      header: column.header,
      width: widthOf(options.widths?.[column.id], [
        column.header,
        ...rows.map((row) => textOfCell(row[c])),
      ]),
    })),
    rows,
  };
  const bytes = await pctXlsx(sheet);
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: PCT_XLSX_TYPE });
}

/** The columns an export writes, in the table's order: those the user has not hidden. */
function exported<T, M extends Record<string, unknown>>(
  table: PctDataTable<T, M>,
): readonly PctAnyColumn<T>[] {
  const kept = new Set<string>([
    ...table.shownColumns(),
    ...table.hiddenColumns(),
  ]);
  const byId = new Map(
    (table.columns() as readonly PctAnyColumn<T>[]).map((column) => [
      column.id,
      column,
    ]),
  );
  return (table.columnOrder() as readonly string[])
    .filter((id) => kept.has(id))
    .map((id) => byId.get(id) as PctAnyColumn<T>);
}

function plainNumber<T>(column: PctAnyColumn<T>): boolean {
  return typeof column.kind === 'object' && column.kind.number !== undefined;
}

/** How a column writes its cell of a sheet: a value of its kind, or its text. */
function sheetWriter<T, M extends Record<string, unknown>>(
  table: PctDataTable<T, M>,
  column: PctAnyColumn<T>,
  options: PctTableXlsxOptions,
): (row: T) => PctSheetCell {
  const kind = column.kind;
  const text = (row: T) => table.textOf(row, column.id);
  if (options.formatted || kind === undefined || kind === 'text') return text;
  if (kind === 'boolean')
    return (row) => {
      const value = column.value(row);
      return typeof value === 'boolean' ? value : null;
    };
  const finite = (row: T) => {
    const value = column.value(row);
    return Number.isFinite(value) ? (value as number) : null;
  };
  if (kind.number) return finite;
  const { timeZone } = kind.instant;
  const time = pctShowsTime(kind.instant);
  return (row) => {
    const at = finite(row);
    if (at === null) return null;
    const clock = pctWallClockOf(at, timeZone);
    const wall = Date.UTC(
      clock.year,
      clock.month - 1,
      clock.day,
      time ? clock.hour : 0,
      time ? clock.minute : 0,
      time ? clock.second : 0,
    );
    return { wall, time };
  };
}

/** What a cell shows as text, to size its column by. */
function textOfCell(cell: PctSheetCell): string {
  if (cell === null) return '';
  if (typeof cell === 'object')
    return cell.time ? '0000-00-00 00:00' : '0000-00-00';
  return String(cell);
}

/**
 * A column's width in a sheet's characters: from pixels, at the seven a character of the
 * sheet's default font takes, or from its widest text and two to spare, at most sixty.
 */
function widthOf(pixels: number | undefined, texts: readonly string[]): number {
  if (pixels !== undefined) return Math.round((pixels / 7) * 100) / 100;
  const widest = texts.reduce((most, text) => Math.max(most, text.length), 0);
  return Math.min(widest + 2, 60);
}
