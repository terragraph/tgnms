/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {LinkTypeValueMap} from '../types/Topology';

export const LINK_TYPE_PRETTY = {
  [LinkTypeValueMap.WIRELESS]: 'Wireless',
  [LinkTypeValueMap.ETHERNET]: 'Ethernet',
  [LinkTypeValueMap.WIRELESS_BACKHAUL]: 'Wireless Backhaul',
  [LinkTypeValueMap.WIRELESS_ACCESS]: 'Wireless Access',
};
