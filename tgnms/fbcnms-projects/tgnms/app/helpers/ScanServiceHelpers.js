/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {getUrlSearchParam} from './NetworkUrlHelpers';

import type {Location} from 'react-router-dom';

/**
 * Gets the currently selected scan execution from the query string.
 * Use this if scan results are being included in a screen.
 **/
export function getScanId(location: Location): ?string {
  return getUrlSearchParam('scan', location);
}
