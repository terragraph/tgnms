/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import BuildingsLayer from './BuildingsLayer';
import LinksLayer from './LinksLayer';
import React from 'react';
import SitePopupsLayer from './SitePopupsLayer';
import SitesLayer from './SitesLayer';
import {TopologyElementType} from '../../../constants/NetworkConstants.js';

import type {NearbyNodes} from '../../../components/mappanels/MapPanelTypes';
import type {NetworkContextType} from '../../../contexts/NetworkContext';
import type {
  Overlay,
  SelectedLayersType,
  SelectedOverlays,
} from '../NetworkMapTypes';
import type {
  PlannedSite,
  Routes,
} from '../../../components/mappanels/MapPanelTypes';

export type Props = {
  context: NetworkContextType,
  selectedLayers: SelectedLayersType,
  plannedSite: ?PlannedSite,
  nearbyNodes: NearbyNodes,
  routes: Routes,
  siteMapOverrides: ?{[string]: string},
  onPlannedSiteMoved: Object => any,
  hiddenSites: Set<string>,
  selectedOverlays: SelectedOverlays,
  overlay: Overlay,
  linkMetricData: ?{[string]: {}},
};

const onFeatureMouseEnter = mapEvent => {
  // Change cursor when hovering over sites/links
  mapEvent.map.getCanvas().style.cursor = 'pointer';
};

const onFeatureMouseLeave = mapEvent => {
  // Reset cursor when leaving sites/links
  mapEvent.map.getCanvas().style.cursor = '';
};

function getSelectedLinks(selectedElement, linkMap) {
  return selectedElement && selectedElement.type === TopologyElementType.LINK
    ? {[selectedElement.name]: linkMap[selectedElement.name]}
    : {};
}

function getSelectedNodeName(selectedElement) {
  return selectedElement && selectedElement.type === TopologyElementType.NODE
    ? selectedElement.name
    : '';
}

function getSelectedSites(selectedElement, siteMap, nodeMap, linkMap) {
  const selectedSites = {};
  if (selectedElement) {
    if (selectedElement.type === TopologyElementType.SITE) {
      selectedSites[selectedElement.name] = siteMap[selectedElement.name];
    } else if (selectedElement.type === TopologyElementType.NODE) {
      // Pick the node's site
      const siteName = nodeMap[selectedElement.name].site_name;
      selectedSites[siteName] = siteMap[siteName];
    } else if (selectedElement.type === TopologyElementType.LINK) {
      // Pick the link's two sites
      const {a_node_name, z_node_name} = linkMap[selectedElement.name];
      const aSiteName = nodeMap[a_node_name].site_name;
      const zSiteName = nodeMap[z_node_name].site_name;
      selectedSites[aSiteName] = siteMap[aSiteName];
      selectedSites[zSiteName] = siteMap[zSiteName];
    }
  }
  return selectedSites;
}

export default function MapLayers(props: Props) {
  const {
    context,
    selectedLayers,
    plannedSite,
    nearbyNodes,
    routes,
    siteMapOverrides,
    onPlannedSiteMoved,
    hiddenSites,
    selectedOverlays,
    overlay,
    linkMetricData,
  } = props;

  const {
    site_icons,
    link_lines,
    site_name_popups,
    buildings_3d,
  } = selectedLayers;

  const {
    networkConfig,
    selectedElement,
    nodeMap,
    linkMap,
    siteMap,
    siteToNodesMap,
    setSelected,
  } = context;

  const {
    controller_version,
    ignition_state,
    topology,
    topologyConfig,
    offline_whitelist,
  } = networkConfig;

  const selectedLinks = getSelectedLinks(selectedElement, linkMap);
  const selectedNodeName = getSelectedNodeName(selectedElement);
  const selectedSites = getSelectedSites(
    selectedElement,
    siteMap,
    nodeMap,
    linkMap,
  );

  return (
    <>
      {buildings_3d ? <BuildingsLayer key="3d-buildings-layer" /> : null}
      {link_lines ? (
        <LinksLayer
          key="links-layer"
          onLinkMouseEnter={onFeatureMouseEnter}
          onLinkMouseLeave={onFeatureMouseLeave}
          topology={topology}
          topologyConfig={topologyConfig}
          ctrlVersion={controller_version}
          selectedLinks={selectedLinks}
          onSelectLinkChange={linkName =>
            setSelected(TopologyElementType.LINK, linkName)
          }
          selectedNodeName={selectedNodeName}
          nodeMap={nodeMap}
          siteMap={siteMap}
          overlay={overlay}
          ignitionState={ignition_state}
          nearbyNodes={nearbyNodes}
          routes={routes}
          offlineWhitelist={offline_whitelist}
          metricData={linkMetricData}
        />
      ) : null}
      {site_icons ? (
        <SitesLayer
          key="sites-layer"
          onSiteMouseEnter={onFeatureMouseEnter}
          onSiteMouseLeave={onFeatureMouseLeave}
          topology={topology}
          topologyConfig={topologyConfig}
          ctrlVersion={controller_version}
          selectedSites={selectedSites}
          onSelectSiteChange={siteName =>
            setSelected(TopologyElementType.SITE, siteName)
          }
          nodeMap={nodeMap}
          siteToNodesMap={siteToNodesMap}
          plannedSite={plannedSite}
          onPlannedSiteMoved={onPlannedSiteMoved}
          overlay={selectedOverlays['site_icons']}
          nearbyNodes={nearbyNodes}
          hiddenSites={hiddenSites}
          routes={routes}
          offlineWhitelist={offline_whitelist}
          siteMapOverrides={siteMapOverrides}
        />
      ) : null}
      {site_name_popups ? (
        <SitePopupsLayer key="popups-layer" topology={networkConfig.topology} />
      ) : null}
    </>
  );
}
