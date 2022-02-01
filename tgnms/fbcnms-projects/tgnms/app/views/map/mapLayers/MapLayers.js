/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AlertsLayer from './AlertsLayer';
import BuildingsLayer from './BuildingsLayer';
import DrawToggle from '@fbcnms/tg-nms/app/views/map/mapControls/DrawToggle';
import LinksLayer from './LinksLayer';
import McsEstimateLayer from './McsEstimateLayer';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import NodesLayer from './NodesLayer/NodesLayer';
import PlanMapFeaturesLayer from './MapFeaturesLayer/PlanMapFeaturesLayer';
import PolygonLayer from './PolygonLayer';
import React from 'react';
import SitePopupsLayer from './SitePopupsLayer';
import SitesFileFeaturesLayer from './MapFeaturesLayer/SitesFileFeaturesLayer';
import SitesLayer from './SitesLayer';
import TopologyBuilderToggle from '@fbcnms/tg-nms/app/views/map/mapControls/TopologyBuilderToggle';
import {MAPMODE} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {OVERLAY_NONE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants.js';
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
  return selectedElement && selectedElement.type === TOPOLOGY_ELEMENT.LINK
    ? {[selectedElement.name]: linkMap[selectedElement.name]}
    : {};
}

function getSelectedNodeName(selectedElement) {
  return selectedElement && selectedElement.type === TOPOLOGY_ELEMENT.NODE
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
    if (selectedElement.type === TOPOLOGY_ELEMENT.SITE && site) {
      selectedSites[selectedName] = site;
    } else if (selectedElement.type === TOPOLOGY_ELEMENT.NODE && node) {
      // Pick the node's site
      const siteName = node.site_name;
      selectedSites[siteName] = siteMap[siteName];
    } else if (selectedElement.type === TOPOLOGY_ELEMENT.LINK && link) {
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

  const {site_name_popups, alert_popups, buildings_3d} = selectedLayers;
  const {link_lines, site_icons, nodes, area_polygons} = overlays;
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

  const topology =
    networkMapOptions.historicalTopology &&
    Object.keys(networkMapOptions.historicalTopology).length > 0
      ? networkMapOptions.historicalTopology
      : networkConfig.topology;

  return (
    <>
      {buildings_3d ? <BuildingsLayer key="3d-buildings-layer" /> : null}
      {site_icons && site_icons.id !== OVERLAY_NONE.id ? (
        <SitesLayer
          key="sites-layer"
          onSiteMouseEnter={handleFeatureMouseEnter}
          onSiteMouseLeave={handleFeatureMouseLeave}
          topology={topology}
          topologyConfig={topologyConfig}
          ctrlVersion={controller_version}
          selectedSites={selectedSites}
          onSelectSiteChange={siteName =>
            setSelected(TOPOLOGY_ELEMENT.SITE, siteName)
          }
          nodeMap={nodeMap}
          siteToNodesMap={siteToNodesMap}
          plannedSite={plannedSite}
          onPlannedSiteMoved={onPlannedSiteMoved}
          overlay={site_icons}
          nearbyNodes={nearbyNodes}
          hiddenSites={hiddenSites}
          offlineWhitelist={offline_whitelist}
          siteMapOverrides={overlayData.site_icons}
          routes={routes}
        />
      ) : null}
      {link_lines && link_lines.id !== OVERLAY_NONE.id ? (
        <LinksLayer
          key="links-layer"
          onLinkMouseEnter={handleFeatureMouseEnter}
          onLinkMouseLeave={handleFeatureMouseLeave}
          topology={topology}
          topologyConfig={topologyConfig}
          ctrlVersion={controller_version}
          selectedLinks={selectedLinks}
          onSelectLinkChange={linkName =>
            setSelected(TOPOLOGY_ELEMENT.LINK, linkName)
          }
          selectedNodeName={selectedNodeName}
          nodeMap={nodeMap}
          siteMap={siteMap}
          overlay={link_lines}
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

      <NodesLayer overlayData={overlayData.nodes} overlay={nodes} />
      {site_name_popups ? <SitePopupsLayer key="popups-layer" /> : null}
      <PolygonLayer
        key="polygon-layer"
        overlay={area_polygons}
        data={overlayData.area_polygons}
      />
      <TopologyBuilderToggle />
      {isFeatureEnabled('MAP_ANNOTATIONS_ENABLED') && <DrawToggle />}
      {isFeatureEnabled('LINK_BUDGETING_ENABLED') && <McsEstimateLayer />}
      {isFeatureEnabled('ALERTS_LAYER_ENABLED') && alert_popups && (
        <AlertsLayer />
      )}
      {mapMode === MAPMODE.PLANNING && <PlanMapFeaturesLayer />}
      {mapMode === MAPMODE.PLANNING && <SitesFileFeaturesLayer />}
    </>
  );
}
