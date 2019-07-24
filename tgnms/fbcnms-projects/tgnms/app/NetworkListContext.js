/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import React from 'react';
import type {NetworkConfig} from './NetworkContext';

type NetworkList = {
  [networkName: string]: NetworkConfig,
};

export type NetworkListContextType = {|
  networkList: NetworkList,
  waitForNetworkListRefresh: () => any,
  getNetworkName: () => string,
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

export default NetworkListContext;
