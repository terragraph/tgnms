/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import type {NetworkList} from '@fbcnms/tg-nms/shared/dto/NetworkState';

export type NetworkListContextType = {|
  networkList: NetworkList,
  waitForNetworkListRefresh: () => any,
  getNetworkName: () => ?string,
  changeNetworkName: (name: string) => any,
|};

export const defaultValue = {
  networkList: {},
  waitForNetworkListRefresh: () => {},
  getNetworkName: () => '',
  changeNetworkName: _ => {},
};

// store topology data
const NetworkListContext = React.createContext<NetworkListContextType>(
  defaultValue,
);

export function useNetworkListContext() {
  const ctx = React.useContext(NetworkListContext);
  return ctx;
}

export default NetworkListContext;
