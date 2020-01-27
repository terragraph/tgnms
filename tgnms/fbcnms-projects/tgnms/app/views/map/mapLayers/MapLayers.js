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
import type {NetworkContextType} from '../../../NetworkContext';
import type {Overlay} from '../overlays';
import type {
  PlannedSite,
  Routes,
} from '../../../components/mappanels/MapPanelTypes';
import type {SelectedLayersType} from '../NetworkMapTypes';
import type {SelectedOverlays} from '../../../components/mappanels/MapLayersPanel';

export type Props = {
  context: NetworkContextType,
  selectedLayers: SelectedLayersType,
  plannedSite: ?PlannedSite,
  nearbyNodes: NearbyNodes,
  routes: Routes,
  historicalSiteMap: ?{[string]: string},
  onPlannedSiteMoved: Object => any,
  hiddenSites: Set<string>,
  selectedOverlays: SelectedOverlays,
  historicalOverlay: ?Overlay,
  overlay: Overlay,
};

const onFeatureMouseEnter = mapEvent => {
  // Change cursor when hovering over sites/links
  mapEvent.map.getCanvas().style.cursor = 'pointer';
};

const onFeatureMouseLeave = mapEvent => {
  // Reset cursor when leaving sites/links
  mapEvent.map.getCanvas().style.cursor = '';
};

function getCurrentLinkOverlay(options): $Shape<Overlay> {
  const {historicalOverlay, overlay} = options;

  if (historicalOverlay) {
    return historicalOverlay;
  }
  if (!overlay) {
    return {};
  }
  return overlay;
}

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
    historicalSiteMap,
    onPlannedSiteMoved,
    hiddenSites,
    selectedOverlays,
    historicalOverlay,
    overlay,
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
            context.setSelected(TopologyElementType.LINK, linkName)
          }
          selectedNodeName={selectedNodeName}
          nodeMap={context.nodeMap}
          siteMap={context.siteMap}
          overlay={getCurrentLinkOverlay({
            selectedOverlays,
            historicalOverlay,
            overlay,
          })}
          ignitionState={ignition_state}
          nearbyNodes={nearbyNodes}
          routes={routes}
          offlineWhitelist={offline_whitelist}
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
            context.setSelected(TopologyElementType.SITE, siteName)
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
          historicalSiteColorMap={historicalSiteMap}
        />
      ) : null}
      {site_name_popups ? (
        <SitePopupsLayer
          key="popups-layer"
          topology={context.networkConfig.topology}
        />
      ) : null}
    </>
  );
}
