/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import parse from 'csv-parse';
import stringify from 'csv-stringify';

export type CsvColumn<T> = {|
  key: $Keys<T>,
  required?: boolean,
  toCsv?: (val: *) => string,
  fromCsv?: (val: string) => *,
|};

export function arrayToCsv<T: {[string]: *}>(
  columns: Array<CsvColumn<T>>,
  data: Array<T>,
): Promise<string> {
  const rows = data.map(dataRow =>
    columns.map(column => {
      const val = dataRow[column.key];
      if (typeof column.toCsv === 'function') {
        return column.toCsv(val);
      }
      return val;
    }),
  );

  return new Promise((res, rej) => {
    stringify([columns.map(x => x.key), ...rows], (err, output) => {
      if (err) {
        return rej(err);
      }
      return res(output);
    });
  });
}

// https://csv.js.org/parse/options/
const CSV_PARSE_OPTIONS = {
  skip_empty_lines: true,
  rtrim: true,
};
export async function csvToArray<T: {[string]: *}>(
  columns: Array<CsvColumn<T>>,
  csvString: string,
): Promise<Array<T>> {
  const rows = await new Promise((res, rej) => {
    parse(
      csvString,
      {
        ...CSV_PARSE_OPTIONS,
        columns: makeHeaderValidator(columns),
      },
      (parseError, parsed) => {
        if (parseError) {
          return rej(parseError);
        }
        res(parsed);
      },
    );
  });
  return rows;
}

/**
 * Passing a function for parse config's columns parses the header column and
 * lets the user transform it. use this to validate that all headers are
 * present before passing it along unchanged.
 */
function makeHeaderValidator<T: {[string]: *}>(columns: Array<CsvColumn<T>>) {
  return (headerRow: Array<string>) => {
    const headerSet = new Set(headerRow);
    for (const c of columns) {
      if (c.required !== false && !headerSet.has(c.key)) {
        throw new Error(`Missing column ${c.key}`);
      }
    }
    return headerRow;
  };
}
