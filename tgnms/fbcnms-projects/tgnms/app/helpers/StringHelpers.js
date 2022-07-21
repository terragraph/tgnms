/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

/** Convert the string to title case, ex. "BEEP_BOOP" -> "Beep Boop" */
export function toTitleCase(str?: ?string) {
  if (str === null || str === undefined) {
    return str;
  }
  return str
    .split(/[\s_]/)
    .map(token => token[0].toUpperCase() + token.substr(1).toLowerCase())
    .join(' ');
}

/** Convert the string to sentence case, ex. "BEEP_BOOP" -> "Beep boop" */
export function toSentenceCase(str?: ?string) {
  if (str === null || str === undefined) {
    return str;
  }
  return str
    .split(/[\s_]/)
    .map((token, idx) =>
      idx === 0
        ? token[0].toUpperCase() + token.substr(1).toLowerCase()
        : token.toLowerCase(),
    )
    .join(' ');
}

/** Checks if the given character is a punctuation character. */
export function isPunctuation(c: string) {
  return /[.,:!?]/.test(c);
}

/** Formats the given number as a language-sensitive string. */
export function formatNumber(
  i: ?number | ?string,
  maximumFractionDigits: number = 3,
): string {
  return parseFloat(i).toLocaleString(navigator.language, {
    maximumFractionDigits,
  });
}

/** Format the given number with an exact number of fraction digits */
export function formatNumberFixed(
  i: ?number | ?string,
  fractionDigits: number = 3,
): string {
  return parseFloat(i).toLocaleString(navigator.language, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function isNullOrEmptyString(s: ?string): boolean %checks {
  return s == null || (typeof s === 'string' && s.trim() === '');
}
