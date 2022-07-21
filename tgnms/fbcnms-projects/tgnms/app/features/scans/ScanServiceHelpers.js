/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {getUrlSearchParam} from '@fbcnms/tg-nms/app/helpers/NetworkUrlHelpers';

import type {Location} from 'react-router-dom';

/**
 * Gets the currently selected scan execution from the query string.
 * Use this if scan results are being included in a screen.
 **/
export function getScanId(location: Location): ?string {
  return getUrlSearchParam('scan', location);
}
