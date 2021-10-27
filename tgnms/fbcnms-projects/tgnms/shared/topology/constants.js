/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
