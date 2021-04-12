/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AlertsLayer from './AlertsLayer';
import BuildingsLayer from './BuildingsLayer';
import DrawLayer from './DrawLayer';
import LinksLayer from './LinksLayer';
import MapFeaturesLayer from './MapFeaturesLayer';
import McsEstimateLayer from './McsEstimateLayer';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import NodesLayer from './NodesLayer/NodesLayer';
import PolygonLayer from './PolygonLayer';
import React from 'react';
import SitePopupsLayer from './SitePopupsLayer';
import SitesLayer from './SitesLayer';
import {MAPMODE} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
import {handleFeatureMouseEnter, handleFeatureMouseLeave} from './helpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {useRouteContext} from '@fbcnms/tg-nms/app/contexts/RouteContext';

import type {NearbyNodes} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

export type Props = {|
  context: NetworkContextType,
  nearbyNodes: NearbyNodes,
  hiddenSites: Set<string>,
|};

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
    const selectedName = selectedElement.name;
    const site = siteMap[selectedName];
    const node = nodeMap[selectedName];
    const link = linkMap[selectedName];
    if (selectedElement.type === TopologyElementType.SITE && site) {
      selectedSites[selectedName] = site;
    } else if (selectedElement.type === TopologyElementType.NODE && node) {
      // Pick the node's site
      const siteName = node.site_name;
      selectedSites[siteName] = siteMap[siteName];
    } else if (selectedElement.type === TopologyElementType.LINK && link) {
      // Pick the link's two sites
      const {a_node_name, z_node_name} = link;
      const aSiteName = nodeMap[a_node_name].site_name;
      const zSiteName = nodeMap[z_node_name].site_name;
      selectedSites[aSiteName] = siteMap[aSiteName];
      selectedSites[zSiteName] = siteMap[zSiteName];
    }
  }
  return selectedSites;
}

export default function MapLayers(props: Props) {
  const {selectedLayers, overlays, overlayData, mapMode} = useMapContext();
  const routes = useRouteContext();
  const {networkMapOptions, updateNetworkMapOptions} = React.useContext(
    NmsOptionsContext,
  );

  const {context, nearbyNodes, hiddenSites} = props;
  const {plannedSite, setLocation} = usePlannedSiteContext();
  const onPlannedSiteMoved = React.useCallback(
    mapEvent => {
      // Update planned site location (based on map event)
      const {lat, lng} = mapEvent.lngLat;
      setLocation({latitude: lat, longitude: lng});
    },
    [setLocation],
  );

  const {
    site_icons,
    link_lines,
    site_name_popups,
    alert_popups,
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

  const handleTemporaryAssetSelect = temporarySelectedAsset => {
    updateNetworkMapOptions({
      temporarySelectedAsset,
    });
  };
  return (
    <>
      {buildings_3d ? <BuildingsLayer key="3d-buildings-layer" /> : null}
      {link_lines && overlays.link_lines ? (
        <LinksLayer
          key="links-layer"
          onLinkMouseEnter={handleFeatureMouseEnter}
          onLinkMouseLeave={handleFeatureMouseLeave}
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
          overlay={overlays.link_lines}
          ignitionState={ignition_state}
          nearbyNodes={nearbyNodes}
          offlineWhitelist={offline_whitelist}
          metricData={overlayData.link_lines}
          routes={routes}
          temporaryTopology={networkMapOptions.temporaryTopology}
          setTemporaryAssetSelect={handleTemporaryAssetSelect}
          temporarySelectedAsset={networkMapOptions.temporarySelectedAsset}
          scanMode={mapMode === MAPMODE.SCAN_SERVICE}
        />
      ) : null}
      {site_icons && overlays.site_icons ? (
        <SitesLayer
          key="sites-layer"
          onSiteMouseEnter={handleFeatureMouseEnter}
          onSiteMouseLeave={handleFeatureMouseLeave}
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
          overlay={overlays.site_icons}
          nearbyNodes={nearbyNodes}
          hiddenSites={hiddenSites}
          offlineWhitelist={offline_whitelist}
          siteMapOverrides={overlayData.site_icons}
          routes={routes}
        />
      ) : null}
      <NodesLayer overlayData={overlayData.nodes} overlay={overlays.nodes} />
      {site_name_popups ? <SitePopupsLayer key="popups-layer" /> : null}
      <PolygonLayer
        key="polygon-layer"
        overlay={overlays.area_polygons}
        data={overlayData.area_polygons}
      />
      {isFeatureEnabled('MAP_ANNOTATIONS_ENABLED') && <DrawLayer />}
      {isFeatureEnabled('LINK_BUDGETING_ENABLED') && <McsEstimateLayer />}
      {isFeatureEnabled('ALERTS_LAYER_ENABLED') && alert_popups && (
        <AlertsLayer />
      )}
      {mapMode === MAPMODE.PLANNING && <MapFeaturesLayer />}
    </>
  );
}
