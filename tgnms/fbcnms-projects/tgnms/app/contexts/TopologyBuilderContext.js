/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {PANELS} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {assign, cloneDeep} from 'lodash';
import {getWirelessLinkNames} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {L2TunnelInputParams} from '@fbcnms/tg-nms/app/views/map/mappanels/L2TunnelInputs';
import type {
  LinkType,
  NodeType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {SetState} from '@fbcnms/tg-nms/app/helpers/ContextHelpers';

export const TOPOLOGY_PANEL_OPTIONS = {
  TOPOLOGY: PANELS.MANUAL_TOPOLOGY,
  L2_TUNNEL: PANELS.L2_TUNNEL,
  UPLOAD: PANELS.TOPOLOGY_UPLOAD,
};

export const EMPTY_TOPOLOGY = {
  site: {name: ''},
  nodes: [],
  links: [],
};

export type InitialParams = {|
  site: $Shape<SiteType>,
  nodes: Array<$Shape<NodeType>>,
  links: Array<$Shape<LinkType>>,
|};

export type SelectedTopologyPanel = $Values<typeof TOPOLOGY_PANEL_OPTIONS>;

export type TopologyBuilderContext = {|
  selectedTopologyPanel: ?SelectedTopologyPanel,
  setSelectedTopologyPanel: SetState<?SelectedTopologyPanel>,
  formType: $Values<typeof FORM_TYPE>,
  elementType: $Values<typeof TOPOLOGY_ELEMENT>,
  initialParams: InitialParams,
  setInitialParams: SetState<$Shape<InitialParams>>,
  createSite: (params: $Shape<InitialParams>) => void,
  editSite: (siteName: string) => void,
  createNode: (params: $Shape<InitialParams>) => void,
  editNode: (nodeName: string) => void,
  createLink: (params: $Shape<InitialParams>) => void,
  newTopology: InitialParams,
  updateTopology: ($Shape<InitialParams>) => void,
  setNewTopology: SetState<$Shape<InitialParams>>,
  nodeConfigs: {[string]: {[string]: string}},
  updateNodeConfigs: ({
    nodeName: string,
    nodeConfig: {[string]: string},
  }) => void,
  editL2Tunnel: (l2Tunnel: L2TunnelInputParams) => void,
  l2TunnelInitialParams: ?L2TunnelInputParams,
  setL2TunnelInitialParams: SetState<?L2TunnelInputParams>,
|};

const empty = () => {};
const defaultValue: TopologyBuilderContext = {
  selectedTopologyPanel: null,
  setSelectedTopologyPanel: empty,
  formType: FORM_TYPE.CREATE,
  elementType: TOPOLOGY_ELEMENT.SITE,
  initialParams: EMPTY_TOPOLOGY,
  setInitialParams: empty,
  createSite: empty,
  editSite: empty,
  createNode: empty,
  editNode: empty,
  createLink: empty,
  newTopology: EMPTY_TOPOLOGY,
  updateTopology: empty,
  setNewTopology: empty,
  nodeConfigs: {},
  updateNodeConfigs: empty,
  editL2Tunnel: empty,
  l2TunnelInitialParams: null,
  setL2TunnelInitialParams: empty,
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

  const {
    networkConfig,
    nodeMap,
    nodeToLinksMap,
    linkMap,
    siteMap,
    siteToNodesMap,
  } = useNetworkContext();
  const {topology} = networkConfig;

  const [formType, setFormType] = React.useState(FORM_TYPE.CREATE);
  const [elementType, setElementType] = React.useState(TOPOLOGY_ELEMENT.SITE);
  const [initialParams, setInitialParams] = React.useState(EMPTY_TOPOLOGY);
  const [newTopology, setNewTopology] = React.useState(EMPTY_TOPOLOGY);
  const [nodeConfigs, setNodeConfigs] = React.useState({});
  const [
    l2TunnelInitialParams,
    setL2TunnelInitialParams,
  ] = React.useState<?L2TunnelInputParams>(null);

  React.useEffect(() => {
    //when clicking submit or close on any topology builder form
    //we want to reset topology after all effects have resolved
    if (selectedTopologyPanel === null) {
      setInitialParams(EMPTY_TOPOLOGY);
      setNewTopology(EMPTY_TOPOLOGY);
      setNodeConfigs({});
    }
  }, [selectedTopologyPanel]);

  const createSite = React.useCallback(params => {
    setSelectedTopologyPanel(TOPOLOGY_PANEL_OPTIONS.TOPOLOGY);
    setFormType(FORM_TYPE.CREATE);
    setElementType(TOPOLOGY_ELEMENT.SITE);
    if (params) {
      setInitialParams(params);
    }
  }, []);

  const editSite = React.useCallback(
    siteName => {
      setSelectedTopologyPanel(TOPOLOGY_PANEL_OPTIONS.TOPOLOGY);
      setFormType(FORM_TYPE.EDIT);
      setElementType(TOPOLOGY_ELEMENT.SITE);
      const site = siteMap[siteName];
      const siteNodes = [...siteToNodesMap[siteName]];
      const nodes = siteNodes.map(name => nodeMap[name]);
      const links = topology.links.filter(
        link =>
          link.link_type === LinkTypeValueMap.WIRELESS &&
          (siteNodes.includes(link.a_node_name) ||
            siteNodes.includes(link.z_node_name)),
      );
      const params = {site, nodes, links};
      setInitialParams(params);
      setNewTopology(params);
    },
    [nodeMap, siteMap, siteToNodesMap, topology],
  );

  const createNode = React.useCallback(params => {
    setSelectedTopologyPanel(TOPOLOGY_PANEL_OPTIONS.TOPOLOGY);
    setFormType(FORM_TYPE.CREATE);
    setElementType(TOPOLOGY_ELEMENT.NODE);
    if (params) {
      setInitialParams(params);
    }
  }, []);

  const editNode = React.useCallback(
    nodeName => {
      setSelectedTopologyPanel(TOPOLOGY_PANEL_OPTIONS.TOPOLOGY);
      setFormType(FORM_TYPE.EDIT);
      setElementType(TOPOLOGY_ELEMENT.NODE);
      const node = nodeMap[nodeName];
      const params = {
        nodes: [node],
        links: getWirelessLinkNames({node, linkMap, nodeToLinksMap}).map(
          linkName => linkMap[linkName],
        ),
        site: {name: node.site_name},
      };
      setInitialParams(params);
      setNewTopology(params);
    },
    [linkMap, nodeMap, nodeToLinksMap],
  );

  const createLink = React.useCallback(params => {
    setSelectedTopologyPanel(TOPOLOGY_PANEL_OPTIONS.TOPOLOGY);
    setFormType(FORM_TYPE.CREATE);
    setElementType(TOPOLOGY_ELEMENT.LINK);
    if (params) {
      setInitialParams(params);
    }
  }, []);

  const updateTopology = React.useCallback(
    updates =>
      setNewTopology(cur => assign(cloneDeep(cur), cloneDeep(updates))),
    [],
  );

  const updateNodeConfigs = React.useCallback(
    updates => {
      const newConfig = cloneDeep(nodeConfigs);
      newConfig[updates.nodeName] = updates.nodeConfig;
      setNodeConfigs(newConfig);
    },
    [nodeConfigs],
  );

  const editL2Tunnel = React.useCallback(l2TunnelInfo => {
    setSelectedTopologyPanel(TOPOLOGY_PANEL_OPTIONS.L2_TUNNEL);
    setL2TunnelInitialParams(l2TunnelInfo);
  }, []);

  return (
    <context.Provider
      value={{
        selectedTopologyPanel,
        setSelectedTopologyPanel,
        formType,
        elementType,
        initialParams,
        setInitialParams,
        createSite,
        editSite,
        createNode,
        editNode,
        createLink,
        newTopology,
        updateTopology,
        setNewTopology,
        nodeConfigs,
        updateNodeConfigs,
        editL2Tunnel,
        l2TunnelInitialParams,
        setL2TunnelInitialParams,
      }}>
      {children}
    </context.Provider>
  );
}
