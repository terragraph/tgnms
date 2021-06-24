/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {Feature, Layer} from 'react-mapbox-gl';
import {HEALTH_CODES} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {
  INDEX_COLORS,
  LINE_BACKUP_CN_PAINT,
  LINE_CASING_PAINT,
  LINE_LAYOUT,
  LINE_PAINT,
  LINE_TEXT_LAYOUT,
  LINE_TEXT_PAINT,
  LINE_WIRED_INTERSITE_PAINT,
  LinkInterferenceColors,
  LinkOverlayColors,
  LinkRenderType,
  SEARCH_NEARBY_FILL_PAINT,
  SEARCH_NEARBY_LINE_PAINT,
  SUPERFRAME_COLORS,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {
  LinkTypeValueMap as LinkType,
  NodeTypeValueMap as NodeType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  SCAN_MAX_COVERAGE_ANGLE,
  SCAN_MAX_RX_DISTANCE,
  SNR_THRESHOLD_MCS9,
} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {get} from 'lodash';
import {
  getLinkChannel,
  getLinkControlSuperframe,
  getLinkGolay,
} from '@fbcnms/tg-nms/app/helpers/TgFeatures';
import {
  hasLinkEverGoneOnline,
  mapboxShouldAcceptClick,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {
  objectEntriesTypesafe,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {Element} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {GeoCoord} from '@turf/turf';
import type {
  GolayIdxType,
  LinkType as Link,
  LocationType,
  NodeType as Node,
  TemporaryLinkType,
  TemporaryTopologyType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {IgnitionStateType} from '@fbcnms/tg-nms/shared/types/Controller';
import type {
  NearbyNodes,
  TopologyScanByNodeMac,
  TopologyScanInfo,
  TopologyScanResponse,
  TopologyScanRespoonsePerRadio,
} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {
  OfflineWhiteListType,
  TopologyConfig,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {RoutesContext as Routes} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import type {SiteMap} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
const styles = _theme => ({});

export type Props = {
  overlay: Overlay,
  ignitionState: IgnitionStateType,
  siteMap: SiteMap,
  topology: TopologyType,
  temporaryTopology?: ?TemporaryTopologyType,
  setTemporaryAssetSelect?: Element => void,
  temporarySelectedAsset?: ?Element,
  topologyConfig: TopologyConfig,
  selectedLinks: {},
  selectedNodeName: string,
  nearbyNodes: NearbyNodes,
  ctrlVersion: string,
  nodeMap: {
    [string]: Node,
  },
  onSelectLinkChange: string => void,
  onLinkMouseEnter: Object => void,
  onLinkMouseLeave: Object => void,
  offlineWhitelist: ?OfflineWhiteListType,
  metricData: ?{[string]: {}},
  routes: Routes,
  scanMode: boolean,
};

type CnLinkInfoMap = {
  [string]: CnLinkInfo,
};

type CnLinkInfo = {
  links: Array<Link>,
  isBackupAlive: boolean,
  isSelected: boolean,
  is_backup_cn_link: boolean,
};

type TopologyLineMap = {
  [string]: TopologyLayer,
};

type TopologyLayer = {
  paint: {[string]: any},
  features: Array<any>,
};

class LinksLayer extends React.Component<Props> {
  getLinkColor(
    link: Link | TemporaryLinkType,
    values: Array<number> | Object | void,
  ) {
    const {
      overlay,
      ignitionState,
      routes,
      offlineWhitelist,
      temporaryTopology,
      temporarySelectedAsset,
      scanMode,
    } = this.props;
    const {igCandidates} = ignitionState;

    if (routes.links && Object.keys(routes.links).length !== 0) {
      if (routes.links.hasOwnProperty(link.name)) {
        if (routes.links[link.name] !== 0 && scanMode) {
          return LinkInterferenceColors[routes.links[link.name]];
        }
        return LinkOverlayColors.metric.excellent.color;
      } else {
        return LinkOverlayColors.metric.missing.color;
      }
    }

    if (temporarySelectedAsset) {
      if (temporarySelectedAsset.name === link.name) {
        return LinkOverlayColors.metric.marginal.color;
      } else {
        return LinkOverlayColors.metric.missing.color;
      }
    }

    if (temporaryTopology && temporaryTopology.links.length !== 0) {
      if (
        temporaryTopology.links.find(
          tempLink => tempLink.name === link.name,
        ) !== undefined
      ) {
        return LinkOverlayColors.metric.marginal.color;
      } else {
        return LinkOverlayColors.metric.missing.color;
      }
    }

    if (overlay.type === 'metric' || overlay.type === 'health') {
      const clr = this.getMetricLinkColor(link, values);
      if (overlay.id === 'link_health') {
        if (values && clr) {
          values.forEach((value, index) => {
            if (value === HEALTH_CODES.MISSING) {
              clr[index] = LinkOverlayColors.metric.missing.color;
            }
          });
        }
      }
      return clr;
    }
    if (overlay.type === 'golay' && typeof values === 'number') {
      if (values === undefined) {
        return LinkOverlayColors.metric.missing.color;
      }
      return INDEX_COLORS[values];
    }
    if (overlay.type === 'channel' && typeof values === 'number') {
      if (values === undefined) {
        return LinkOverlayColors.metric.missing.color;
      }
      return INDEX_COLORS[values];
    }
    if (overlay.type === 'superframe' && typeof values === 'number') {
      if (values !== undefined && SUPERFRAME_COLORS.hasOwnProperty(values)) {
        return SUPERFRAME_COLORS[values];
      }
      return LinkOverlayColors.metric.missing.color;
    }
    // Link lines not based on metrics (i.e. health)
    if (link.is_alive) {
      return LinkOverlayColors.ignition_status.link_up.color;
    } else if (igCandidates.find(({linkName}) => linkName === link.name)) {
      return LinkOverlayColors.ignition_status.igniting.color;
    } else if (
      // link is offline on purpose
      !link.is_alive &&
      !hasLinkEverGoneOnline(link, offlineWhitelist)
    ) {
      return LinkOverlayColors.ignition_status.planned.color;
    } else {
      return LinkOverlayColors.ignition_status.link_down.color;
    }
  }

  getMetricLinkColor(
    link: Link | TemporaryLinkType,
    metricValues: Array<number> | void,
  ) {
    if (!metricValues) {
      return;
    }
    const {overlay} = this.props;
    const rangeColorFunc = makeRangeColorFunc(
      overlay.range ?? [],
      overlay.colorRange,
    );
    return metricValues.map<string>(metricValue =>
      metricValue !== null
        ? rangeColorFunc(metricValue)
        : LinkOverlayColors.metric.missing.color,
    );
  }

  getMetricValues(
    link: Link | TemporaryLinkType,
    metricData: ?{[string]: *},
  ): Array<number> {
    const {overlay} = this.props;
    const A = get(metricData, [link.name, 'A'], null);
    const Z = get(metricData, [link.name, 'Z'], null);
    if (typeof overlay.aggregate === 'function') {
      const aggregate = overlay.aggregate; // fixes a flow bug
      return [aggregate(A), aggregate(Z)];
    }
    return [get(A, [overlay.id], null), get(Z, [overlay.id], null)];
  }

  getMetricText(
    link: Link,
    metricValues: Array<number>,
  ): Array<string | number> {
    const {overlay} = this.props;
    return metricValues.map((value, index) => {
      if (typeof overlay.formatText === 'function') {
        return overlay.formatText(link, value, index);
      }
      if (
        value === null ||
        typeof value === 'undefined' ||
        overlay.id === 'link_health' ||
        overlay.id === 'link_online'
      ) {
        return '';
      }
      return value;
    });
  }

  getGolayValue(overlay: Overlay, golayValues: GolayIdxType) {
    if (overlay.id === 'golay_tx') {
      if (golayValues && golayValues.txGolayIdx) {
        return golayValues.txGolayIdx;
      } else {
        return undefined;
      }
    } else if (golayValues && golayValues.rxGolayIdx) {
      return golayValues.rxGolayIdx;
    } else {
      return undefined;
    }
  }

  mapLinksToRenderType() {
    // Map some links to a render type (for special cases)
    const {topology, selectedLinks, selectedNodeName} = this.props;

    // Create map of CN nodes (as an optimization)
    const cnNodeMap = {};
    topology.nodes.forEach(node => {
      if (node.node_type === NodeType.CN) {
        cnNodeMap[node.name] = node;
      }
    });
    const getCnNode = link =>
      cnNodeMap.hasOwnProperty(link.a_node_name)
        ? cnNodeMap[link.a_node_name]
        : cnNodeMap.hasOwnProperty(link.z_node_name)
        ? cnNodeMap[link.z_node_name]
        : null;

    // Get info about all links to each CN (in one iteration)
    const cnLinkInfo: CnLinkInfoMap = {};
    topology.links.forEach(link => {
      if (link.link_type === LinkType.ETHERNET) {
        return;
      }
      const cnNode = getCnNode(link);
      if (cnNode) {
        if (!cnLinkInfo.hasOwnProperty(cnNode.name)) {
          cnLinkInfo[cnNode.name] = {
            // List of all links to this CN
            links: [],

            // Is any CN backup link alive?
            isBackupAlive: false,

            // Is this CN or any link to this CN selected?
            isSelected: selectedNodeName === cnNode.name,

            is_backup_cn_link: false,
          };
        }
        const info = cnLinkInfo[cnNode.name];
        info.links.push(link);
        if (link.is_backup_cn_link && link.is_alive) {
          info.isBackupAlive = true;
        }
        if (selectedLinks.hasOwnProperty(link.name)) {
          info.isSelected = true;
        }
      }
    });

    // For backup CN links, only render whichever link is online (or the
    // primary link if all offline) - show all links when any link is selected
    const linkToRenderType = {};
    objectValuesTypesafe<CnLinkInfo>(cnLinkInfo).forEach(
      ({links, isBackupAlive, isSelected}) => {
        links.forEach(link => {
          let renderType;
          if (link.is_backup_cn_link) {
            // Backup CN link
            renderType =
              isSelected || link.is_alive
                ? LinkRenderType.BACKUP_CN
                : LinkRenderType.HIDDEN;
          } else {
            // Primary CN link
            renderType =
              isSelected || link.is_alive || !isBackupAlive
                ? LinkRenderType.NORMAL
                : LinkRenderType.HIDDEN;
          }
          linkToRenderType[link.name] = renderType;
        });
      },
    );
    return linkToRenderType;
  }

  toDegrees(angle: number) {
    return angle * (180 / Math.PI);
  }

  toRadians(angle: number) {
    return (angle * Math.PI) / 180.0;
  }

  calcBearing(p1: [number, number, number], p2: [number, number, number]) {
    // Calculates an initial bearing from p1 to p2
    const lat1 = this.toRadians(p1[0]);
    const lon1 = this.toRadians(p1[1]);
    const lat2 = this.toRadians(p2[0]);
    const lon2 = this.toRadians(p2[1]);

    const y = Math.sin(lat2 - lat1) * Math.cos(lon2);
    const x =
      Math.cos(lon1) * Math.sin(lon2) -
      Math.sin(lon1) * Math.cos(lon2) * Math.cos(lat2 - lat1);
    return this.toDegrees(Math.atan2(y, x));
  }

  calcDestinationPoint(origin: GeoCoord, bearing: number, distance: number) {
    // Calculates a destination point given distance and bearing from origin
    const R = 6371e3; // Earth's radius in meters
    const d = distance / R; // algular distance in radians
    const b = this.toRadians(bearing); // convert to radians
    const lat = this.toRadians(origin[0]); // convert to radians
    const lng = this.toRadians(origin[1]); // convert to radians

    const lng2 = Math.asin(
      Math.sin(lng) * Math.cos(d) + Math.cos(lng) * Math.sin(d) * Math.cos(b),
    );
    const lat2 =
      lat +
      Math.atan2(
        Math.sin(b) * Math.sin(d) * Math.cos(lng),
        Math.cos(d) - Math.sin(lng) * Math.sin(lng2),
      );

    // convert back to degrees
    return [this.toDegrees(lat2), this.toDegrees(lng2)];
  }

  getNearbyCoverageCoordinates(
    txLocation: LocationType,
    responders: Array<TopologyScanInfo>,
  ): Array<GeoCoord> {
    /**
     * Steps:
     * 1. Determine best responder with valid SNR for each TX node that has
     *    nearby nodes.
     * 2. Calculate bearing from TX node to RX node based on geo coordinates.
     * 3. Calculate polygon points based on constant distance and coverage
     *    offset.
     */
    const txPos = locToPos(txLocation);
    const coordinates = [];

    // find best responder with valid coordinates
    let bestResponder = null;
    responders.forEach(responder => {
      if (
        responder.responderInfo &&
        responder.responderInfo.pos &&
        responder.bestSnr >= SNR_THRESHOLD_MCS9
      ) {
        if (!bestResponder || responder.bestSnr > bestResponder.bestSnr) {
          bestResponder = responder;
        }
      }
    });

    // if found, build coverage polygon
    if (bestResponder !== null) {
      const rxPos = locToPos(bestResponder.responderInfo.pos);

      // calculate bearing
      const bearing = this.calcBearing(txPos, rxPos);

      // build list of polygon coordinates
      coordinates.push(txPos);
      for (
        let i = -SCAN_MAX_COVERAGE_ANGLE / 2;
        i <= SCAN_MAX_COVERAGE_ANGLE / 2;
        i += SCAN_MAX_COVERAGE_ANGLE / 10.0
      ) {
        coordinates.push(
          this.calcDestinationPoint(txPos, bearing + i, SCAN_MAX_RX_DISTANCE),
        );
      }
      coordinates.push(txPos);
    }

    return coordinates;
  }

  handleLinkClick = (link: Link) => (evt: Event) => {
    // Handle clicking on a link
    if (mapboxShouldAcceptClick(evt)) {
      this.props.onSelectLinkChange(link.name);
    }
  };

  handleTemporaryLinkClick = (link: TemporaryLinkType) => (evt: Event) => {
    // Handle clicking on a link
    const {setTemporaryAssetSelect} = this.props;
    if (mapboxShouldAcceptClick(evt) && setTemporaryAssetSelect) {
      setTemporaryAssetSelect({
        name: link.name,
        type: 'link',
        expanded: false,
      });
    }
  };

  render() {
    const {
      topology,
      temporaryTopology,
      temporarySelectedAsset,
      nodeMap,
      selectedLinks,
      siteMap,
      onLinkMouseEnter,
      onLinkMouseLeave,
      nearbyNodes,
      overlay,
      metricData,
    } = this.props;
    const linkToRenderType = this.mapLinksToRenderType();

    // Draw links in topology
    const topologyLines: TopologyLineMap = {
      [LinkRenderType.NORMAL]: {paint: LINE_PAINT, features: []},
      [LinkRenderType.BACKUP_CN]: {paint: LINE_BACKUP_CN_PAINT, features: []},
      [LinkRenderType.WIRED_INTERSITE]: {
        paint: LINE_WIRED_INTERSITE_PAINT,
        features: [],
      },
    };
    const lineCasingFeatures = []; // casing around selected links
    topology.links.forEach(link => {
      if (
        !nodeMap.hasOwnProperty(link.a_node_name) ||
        !nodeMap.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }

      const siteA = siteMap[nodeMap[link.a_node_name].site_name];
      const siteZ = siteMap[nodeMap[link.z_node_name].site_name];

      // Skip intra-site Ethernet links
      if (link.link_type === LinkType.ETHERNET) {
        if (siteA.name === siteZ.name) {
          return;
        }
        linkToRenderType[link.name] = LinkRenderType.WIRED_INTERSITE;
      }

      // Determine which array to push to based on the link's role
      // (Mapbox does not support data-driven properties for 'line-dasharray')
      const renderType = linkToRenderType.hasOwnProperty(link.name)
        ? linkToRenderType[link.name]
        : LinkRenderType.NORMAL;
      if (renderType === LinkRenderType.HIDDEN) {
        return;
      }
      const features = topologyLines[renderType].features;

      const featureParams = {
        key: 'link-layer-' + link.name,
        onMouseEnter: onLinkMouseEnter,
        onMouseLeave: onLinkMouseLeave,
        onClick: this.handleLinkClick(link),
        'test-link-name': link.name,
      };
      if (
        overlay.type === 'golay' ||
        overlay.type === 'superframe' ||
        overlay.type === 'channel'
      ) {
        const {ctrlVersion, topologyConfig} = this.props;
        let value = null;
        if (overlay.type === 'golay') {
          const golayValues = getLinkGolay(ctrlVersion, link, topologyConfig);
          value = this.getGolayValue(overlay, golayValues);
        } else if (overlay.type === 'channel') {
          value = getLinkChannel(link, topologyConfig);
        } else {
          value = getLinkControlSuperframe(ctrlVersion, link, topologyConfig);
        }

        const linkColor = this.getLinkColor(link, value);
        features.push(
          <Feature
            {...featureParams}
            key={`link-layer-${link.name}`}
            coordinates={[locToPos(siteA.location), locToPos(siteZ.location)]}
            properties={{
              linkColor,
              text: value,
            }}
          />,
        );
      } else {
        const metricValues = this.getMetricValues(link, metricData);
        const linkColor = this.getLinkColor(link, metricValues);
        if (Array.isArray(linkColor) && linkColor.length === 2) {
          const metricText = this.getMetricText(link, metricValues);

          // Draw 2 partial lines (split at the midpoint)
          const midpoint = [
            (siteA.location.longitude + siteZ.location.longitude) / 2,
            (siteA.location.latitude + siteZ.location.latitude) / 2,
          ];
          features.push(
            <Feature
              {...featureParams}
              key={`link-layer-${link.name}-1`}
              coordinates={[locToPos(siteA.location), midpoint]}
              properties={{
                linkColor: linkColor[0],
                text: metricText[0],
              }}
              test-site-name={siteA.name}
            />,
          );
          features.push(
            <Feature
              {...featureParams}
              key={`link-layer-${link.name}-2`}
              coordinates={[midpoint, locToPos(siteZ.location)]}
              properties={{
                linkColor: linkColor[1],
                text: metricText[1],
              }}
              test-site-name={siteZ.name}
            />,
          );
        } else {
          // Draw single line
          features.push(
            <Feature
              {...featureParams}
              key={`link-layer-${link.name}`}
              coordinates={[locToPos(siteA.location), locToPos(siteZ.location)]}
              properties={{linkColor}}
            />,
          );
        }
      }

      // Draw casing over selected links
      if (selectedLinks.hasOwnProperty(link.name)) {
        lineCasingFeatures.push(
          <Feature
            key={'line-layer-' + link.name}
            onMouseEnter={onLinkMouseEnter}
            onMouseLeave={onLinkMouseLeave}
            coordinates={[locToPos(siteA.location), locToPos(siteZ.location)]}
          />,
        );
      }
    });

    temporaryTopology &&
      temporaryTopology.links.forEach(link => {
        const featureParams = {
          key: 'link-layer-' + link.name,
          onMouseEnter: onLinkMouseEnter,
          onMouseLeave: onLinkMouseLeave,
          onClick: this.handleTemporaryLinkClick(link),

          'test-link-name': link.name,
        };

        const metricValues = this.getMetricValues(link, metricData);
        const linkColor = this.getLinkColor(link, metricValues);
        // Draw single line
        if (link.locationA && link.locationZ) {
          topologyLines[LinkRenderType.NORMAL].features.push(
            <Feature
              {...featureParams}
              key={`link-layer-${link.name}`}
              coordinates={[locToPos(link.locationA), locToPos(link.locationZ)]}
              properties={{linkColor}}
            />,
          );
        }

        // Draw casing over selected links
        if (
          temporarySelectedAsset &&
          temporarySelectedAsset.name === link.name
        ) {
          lineCasingFeatures.push(
            <Feature
              key={'line-layer-' + link.name}
              onMouseEnter={onLinkMouseEnter}
              onMouseLeave={onLinkMouseLeave}
              coordinates={[locToPos(link.locationA), locToPos(link.locationZ)]}
            />,
          );
        }
      });

    // Draw "nearby" site links (from topology scan)
    const searchNearbyLineFeatures = [];

    objectEntriesTypesafe<string, TopologyScanByNodeMac>(nearbyNodes).forEach(
      ([txNode, responderToRadioResponseBySiteMac]) => {
        if (responderToRadioResponseBySiteMac === null) {
          return;
        }
        objectEntriesTypesafe<string, TopologyScanResponse>(
          responderToRadioResponseBySiteMac,
        ).forEach(([_adjNodeMac, groupedResponders]) => {
          if (groupedResponders == null) {
            return;
          }
          objectEntriesTypesafe<string, TopologyScanRespoonsePerRadio>(
            groupedResponders,
          ).forEach(([_responderMac, responders]) => {
            let firstResponder = undefined;
            objectEntriesTypesafe<string, TopologyScanInfo>(responders).forEach(
              ([_radioMac, response]) => {
                firstResponder = response;
              },
            );
            if (firstResponder === undefined || !firstResponder) {
              return;
            }
            const {addr, pos} = firstResponder.responderInfo;
            const txLocation = siteMap[nodeMap[txNode].site_name].location;
            const rxLocation = pos;
            if (rxLocation) {
              searchNearbyLineFeatures.push(
                <Feature
                  key={'nearby-' + txNode + '-' + addr}
                  coordinates={[locToPos(txLocation), locToPos(rxLocation)]}
                />,
              );
            }
          });
        });
      },
    );

    // Draw "nearby" coverage (from topology scan)
    // TODO - re-enable with multi-sector nodes
    const searchNearbyCoverageFeatures = [];
    return (
      <>
        {lineCasingFeatures ? (
          <Layer
            before="site-layer"
            type="line"
            key={'link-casing-layer'}
            id={'link-casing-layer'}
            paint={LINE_CASING_PAINT}>
            {lineCasingFeatures}
          </Layer>
        ) : null}

        {objectEntriesTypesafe<string, TopologyLayer>(topologyLines).map(
          ([id, {paint, features}]) => [
            <Layer
              before="site-layer"
              type="line"
              key={id}
              id={id}
              paint={paint}
              layout={LINE_LAYOUT}>
              {features}
            </Layer>,
            <Layer
              before="site-layer"
              type="symbol"
              key={id + '-text'}
              id={id + '-text'}
              sourceId={id}
              paint={LINE_TEXT_PAINT}
              layout={LINE_TEXT_LAYOUT}
            />,
          ],
        )}

        {searchNearbyCoverageFeatures ? (
          <Layer
            before="site-layer"
            type="fill"
            key={'nearby-fill-layer'}
            id={'nearby-fill-layer'}
            paint={SEARCH_NEARBY_FILL_PAINT}>
            {searchNearbyCoverageFeatures}
          </Layer>
        ) : null}

        {searchNearbyLineFeatures ? (
          <Layer
            before="site-layer"
            type="line"
            key={'nearby-link-layer'}
            id={'nearby-link-layer'}
            paint={SEARCH_NEARBY_LINE_PAINT}
            layout={LINE_LAYOUT}>
            {searchNearbyLineFeatures}
          </Layer>
        ) : null}
      </>
    );
  }
}
export default withStyles(styles)(LinksLayer);
