/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {PANELS} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

export const TOPOLOGY_PANEL_OPTIONS = {
  SITE: PANELS.TOPOLOGY_SITE,
  NODE: PANELS.TOPOLOGY_NODE,
  LINK: PANELS.TOPOLOGY_LINK,
  L2_TUNNEL: PANELS.L2_TUNNEL,
  UPLOAD: PANELS.TOPOLOGY_UPLOAD,
};

export type SelectedTopologyPanel = $Values<typeof TOPOLOGY_PANEL_OPTIONS>;

export type TopologyBuilderContext = {|
  selectedTopologyPanel: ?SelectedTopologyPanel,
  setSelectedTopologyPanel: (selectedPanel: ?SelectedTopologyPanel) => void,
|};

const empty = () => {};
const defaultValue: TopologyBuilderContext = {
  selectedTopologyPanel: null,
  setSelectedTopologyPanel: empty,
};

const context = React.createContext<TopologyBuilderContext>(defaultValue);
export default context;

export function useTopologyBuilderContext(): TopologyBuilderContext {
  return React.useContext<TopologyBuilderContext>(context);
}

export function TopologyBuilderContextProvider({
  children,
}: {
  children: React.Node,
}) {
  const [
    selectedTopologyPanel,
    setSelectedTopologyPanel,
  ] = React.useState<?SelectedTopologyPanel>(null);
  return (
    <context.Provider
      value={{
        selectedTopologyPanel,
        setSelectedTopologyPanel,
      }}>
      {children}
    </context.Provider>
  );
}
