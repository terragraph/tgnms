/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

/** Convert the string to title case, ex. "BEEP_BOOP" -> "Beep Boop" */
export function toTitleCase(str) {
  if (str === null || str === undefined) {
    return str;
  }
  return str
    .split(/[\s_]/)
    .map(token => token[0].toUpperCase() + token.substr(1).toLowerCase())
    .join(' ');
}

/** Convert the string to sentence case, ex. "BEEP_BOOP" -> "Beep boop" */
export function toSentenceCase(str) {
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
export function isPunctuation(c) {
  return /[.,:!?]/.test(c);
}

/** Formats the given number as a language-sensitive string. */
export function formatNumber(i, maximumFractionDigits = 3) {
  return parseFloat(i).toLocaleString(navigator.language, {
    maximumFractionDigits,
  });
}
