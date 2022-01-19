/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import LinkDetailsPanel from '@fbcnms/tg-nms/app/views/map/mappanels/LinkDetailsPanel';
import NodeDetailsPanel from '@fbcnms/tg-nms/app/views/map/mappanels/NodeDetailsPanel/NodeDetailsPanel';
import SiteDetailsPanel from '@fbcnms/tg-nms/app/views/map/mappanels/SiteDetailsPanel';
import Slide from '@material-ui/core/Slide';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {get} from 'lodash';
import {useAzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useRouteContext} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useTheme} from '@material-ui/styles';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

import type {Element} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import type {SearchNearbyProps} from '@fbcnms/tg-nms/app/views/map/NetworkDrawer';

export default function RenderTopologyElement({
  element,
  panelControl,
  searchNearbyProps,
}: {
  element: Element,
  panelControl: PanelStateControl,
  searchNearbyProps: SearchNearbyProps,
}) {
  const {setPanelState, getIsHidden, removePanel, collapseAll} = panelControl;
  const theme = useTheme();
  const azimuthManager = useAzimuthManager();
  const snackbars = useSnackbars();

  const {type, name, expanded} = element;
  const {editSite, editNode, editL2Tunnel} = useTopologyBuilderContext();
  const {
    networkConfig,
    pinnedElements,
    networkName,
    networkLinkHealth,
    networkLinkMetrics,
    nodeMap,
    nodeToLinksMap,
    linkMap,
    siteMap,
    siteToNodesMap,
    toggleExpanded,
    setSelected,
    togglePin,
    removeElement,
  } = useNetworkContext();
  const {
    controller_version,
    ignition_state,
    status_dump,
    topology,
    wireless_controller_stats,
  } = networkConfig;
  const {nextStep} = useTutorialContext();

  const pinned = !!pinnedElements.find(
    el => el.type === type && el.name === name,
  );

  const panelKey = React.useMemo(() => `${type}-${name}`, [name, type]);

  // When this component first mounts, open it
  React.useEffect(() => {
    collapseAll();
    setPanelState(panelKey, PANEL_STATE.OPEN);
  }, [setPanelState, panelKey, collapseAll]);
  useUnmount(() => {
    removePanel(panelKey);
  });

  const handleSelectedNode = React.useCallback(
    nodeName => {
      setSelected(TOPOLOGY_ELEMENT.NODE, nodeName);
      nextStep();
    },
    [nextStep, setSelected],
  );

  const isVisible = !getIsHidden(panelKey);
  const handleClosePanel = () => {
    removePanel(panelKey);
    setTimeout(() => {
      removeElement(type, name);
    }, theme.transitions.duration.leavingScreen + 100 /* to be safe */);
  };
  const routesProps = useRouteContext();

  const onUpdateRoutes = React.useCallback(
    ({
      node,
      links,
      nodes,
    }: {
      node: ?string,
      links: {[string]: number},
      nodes: Set<string>,
    }) => {
      routesProps.onUpdateRoutes({
        node,
        links,
        nodes,
      });
      setPanelState(PANELS.DEFAULT_ROUTES, PANEL_STATE.OPEN);
    },
    [routesProps, setPanelState],
  );
  const node = nodeMap[name];
  const link = linkMap[name];
  const site = siteMap[name];

  if (type === TOPOLOGY_ELEMENT.NODE && node) {
    // hack to get around issues with flow
    const {node: _, ...routesPropsWithoutNode} = {
      ...routesProps,
      onUpdateRoutes,
    };

    return (
      <Slide {...SlideProps} key={name} in={isVisible}>
        <NodeDetailsPanel
          expanded={expanded}
          onPanelChange={() => toggleExpanded(type, name, !expanded)}
          networkName={networkName}
          nodeDetailsProps={{
            ctrlVersion: controller_version,
            node: node,
            statusReport: node
              ? status_dump.statusReports[node.mac_addr]
              : null,
            networkConfig: networkConfig,
            onSelectLink: linkName =>
              setSelected(TOPOLOGY_ELEMENT.LINK, linkName),
            onSelectSite: siteName =>
              setSelected(TOPOLOGY_ELEMENT.SITE, siteName),
            topology,
          }}
          pinned={pinned}
          onPin={() => togglePin(type, name, !pinned)}
          onClose={handleClosePanel}
          onEdit={nodeName => editNode(nodeName)}
          onEditTunnel={tunnelInfo => editL2Tunnel(tunnelInfo)}
          {...searchNearbyProps}
          {...routesPropsWithoutNode}
          node={node}
          nodeToLinksMap={nodeToLinksMap}
          linkMap={linkMap}
          snackbars={snackbars}
        />
      </Slide>
    );
  } else if (type === TOPOLOGY_ELEMENT.LINK && link) {
    return (
      <Slide {...SlideProps} key={name} in={isVisible}>
        <LinkDetailsPanel
          expanded={expanded}
          onPanelChange={() => toggleExpanded(type, name, !expanded)}
          networkName={networkName}
          link={link}
          nodeMap={nodeMap}
          networkLinkHealth={networkLinkHealth}
          networkLinkMetrics={networkLinkMetrics}
          networkConfig={networkConfig}
          ignitionEnabled={
            !(
              ignition_state?.igParams?.linkAutoIgnite != null &&
              ignition_state.igParams.linkAutoIgnite[name] === false
            )
          }
          onClose={handleClosePanel}
          onSelectNode={handleSelectedNode}
          pinned={pinned}
          topology={topology}
          onPin={() => togglePin(type, name, !pinned)}
          azimuthManager={azimuthManager}
        />
      </Slide>
    );
  } else if (type === TOPOLOGY_ELEMENT.SITE && site) {
    const wapStats = get(wireless_controller_stats, [name.toLowerCase()], null);
    return (
      <Slide {...SlideProps} key={name} in={isVisible}>
        <SiteDetailsPanel
          expanded={expanded}
          onPanelChange={() => toggleExpanded(type, name, !expanded)}
          networkName={networkName}
          networkConfig={networkConfig}
          topology={topology}
          site={site}
          siteMap={siteMap}
          siteNodes={siteToNodesMap[name] || new Set()}
          nodeToLinksMap={nodeToLinksMap}
          linkMap={linkMap}
          nodeMap={nodeMap}
          networkLinkHealth={networkLinkHealth}
          wapStats={wapStats}
          onClose={handleClosePanel}
          onSelectNode={handleSelectedNode}
          pinned={pinned}
          onPin={() => togglePin(type, name, !pinned)}
          onEdit={siteName => editSite(siteName)}
          onUpdateRoutes={onUpdateRoutes}
          azimuthManager={azimuthManager}
          snackbars={snackbars}
        />
      </Slide>
    );
  }
  return null;
}
