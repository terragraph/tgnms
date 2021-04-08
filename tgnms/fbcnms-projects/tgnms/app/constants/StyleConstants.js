/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type {Theme} from '@material-ui/core';

/**
 * constants for height for major parts of the UI. This is mostly used for
 * css hacks.
 */
export const UI_HEIGHTS = {
  APPBAR: 64,
  TOOLBAR: 48,
  SEARCHBAR: 72,
};

export const NETWORK_TABLE_HEIGHTS = {
  TABS: 72,
  MTABLE_GROUPING: 50,
  MTABLE_FILTERING: 60,
  MTABLE_TOOLBAR: 64,
  MTABLE_MAX_HEIGHT: 650,
};

/**
 * HACK! - Figure out how to actually set the height to 100% screen
 */
export function configRootHeightCss(theme: Theme) {
  return `calc(100vh - ${
    theme.spacing() +
    UI_HEIGHTS.APPBAR +
    UI_HEIGHTS.TOOLBAR +
    UI_HEIGHTS.SEARCHBAR
  }px)`;
}
