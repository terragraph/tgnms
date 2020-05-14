/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {getHistoricalDate} from '../helpers/NetworkHelpers';

import type {NetworkMapOptions} from '../views/map/NetworkMapTypes';

export type NmsOptionsContextType = {|
  networkMapOptions: NetworkMapOptions,
  networkTablesOptions: {},
  updateNetworkMapOptions: UpdateNetworkMapOptions,
  updateNetworkTableOptions: () => void,
|};

export type UpdateNetworkMapOptions = ($Shape<NetworkMapOptions>) => void;

export function defaultNetworkMapOptions() {
  const historicalDate = getHistoricalDate(location);

  const now = new Date();
  const defaultDate: Date = historicalDate
    ? new Date(historicalDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const defaultTime: Date = historicalDate
    ? new Date(
        defaultDate.getFullYear(),
        defaultDate.getMonth(),
        defaultDate.getDate(),
      )
    : new Date();

  return {
    selectedLayers: {
      site_icons: true,
      link_lines: true,
      nodes: false,
      area_polygons: false,
      site_name_popups: false,
      buildings_3d: false,
    },
    historicalDate: defaultDate,
    selectedTime: defaultTime,
  };
}

export const defaultValue = {
  networkMapOptions: {},
  networkTablesOptions: {},
  updateNetworkMapOptions: () => {},
  updateNetworkTableOptions: () => {},
};

// store topology data
const NmsOptionsContext = React.createContext<NmsOptionsContextType>(
  defaultValue,
);

export default NmsOptionsContext;

export function NmsOptionsContextProvider({children}: {children: React.Node}) {
  const [networkMapOptions, setNetworkMapOptions] = React.useState(
    defaultNetworkMapOptions(),
  );
  const updateNetworkMapOptions = React.useCallback(
    update => setNetworkMapOptions(curr => ({...curr, ...update})),
    [setNetworkMapOptions],
  );
  return (
    <NmsOptionsContext.Provider
      value={{
        networkMapOptions: networkMapOptions,
        networkTablesOptions: {},
        updateNetworkMapOptions: updateNetworkMapOptions,
        updateNetworkTableOptions: () => {},
      }}>
      {children}
    </NmsOptionsContext.Provider>
  );
}
