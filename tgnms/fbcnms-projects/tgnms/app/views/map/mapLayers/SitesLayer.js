/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import {
  CIRCLE_RADIUS,
  INNER_CIRCLE_RADIUS,
  PLANNED_SITE_COLOR,
  PLANNED_SITE_STROKE_COLOR,
  POSITION_CIRCLE_PAINT,
  SEARCH_NEARBY_SITE_COLOR,
  SEARCH_NEARBY_STROKE_COLOR,
  SEARCH_NEARBY_STROKE_WIDTH,
  SELECTED_CIRCLE_STROKE_COLOR,
  SELECTED_CIRCLE_STROKE_WIDTH,
  SiteOverlayColors,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {
  CN_SITE_COLOR,
  POP_SITE_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {Feature, Layer, Popup} from 'react-mapbox-gl';
import {
  LinkTypeValueMap as LinkType,
  NodeTypeValueMap as NodeType,
  PolarityTypeValueMap as PolarityType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {getNodePolarities} from '@fbcnms/tg-nms/app/helpers/TgFeatures';
import {
  hasNodeEverGoneOnline,
  mapboxShouldAcceptClick,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {
  isNodeAlive,
  renderSnrWithIcon,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {
  NearbyNodes,
  TopologyScanByNodeMac,
  TopologyScanInfo,
  TopologyScanResponse,
  TopologyScanRespoonsePerRadio,
} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {
  NodeMap,
  SiteToNodesMap,
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  OfflineWhiteListType,
  TopologyConfig,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {PlannedSite} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {RoutesContext as Routes} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import type {
  SiteType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';

const styles = {
  iconBottom: {
    verticalAlign: 'bottom',
    paddingRight: 4,
  },
};

export type SiteMapStyles = {|[siteName: string]: string|};

export type Props = {
  classes: {[string]: string},
  onSiteMouseEnter?: Object => any,
  onSiteMouseLeave?: Object => any,
  topology: TopologyType,
  topologyConfig: TopologyConfig,
  ctrlVersion: string,
  selectedSites: {[string]: string},
  onSelectSiteChange: string => any,
  offlineWhitelist: ?OfflineWhiteListType,
  nodeMap?: NodeMap,
  siteToNodesMap?: SiteToNodesMap,
  plannedSite?: ?PlannedSite,
  onPlannedSiteMoved?: Object => any,
  overlay: Overlay,
  nearbyNodes: NearbyNodes,
  hiddenSites: Set<string>,
  siteMapOverrides: ?SiteMapStyles,
  routes: Routes,
};

class SitesLayer extends React.Component<Props> {
  getSitePolarityColor(siteNodes) {
    const {ctrlVersion, topologyConfig} = this.props;

    let sitePolarity = null;
    for (const node of siteNodes) {
      const mac2Polarity = getNodePolarities(ctrlVersion, node, topologyConfig);
      let nodePolarity = null;
      for (const mac of Object.keys(mac2Polarity)) {
        const macPolarity = mac2Polarity[mac];
        if (nodePolarity === null) {
          nodePolarity = macPolarity;
        } else if (nodePolarity !== macPolarity) {
          return SiteOverlayColors.polarity.hw_hybrid.color;
        }
      }
      if (sitePolarity === null) {
        sitePolarity = nodePolarity;
      } else if (sitePolarity !== nodePolarity) {
        // Site polarity has been set and doesn't match another nodes polarity
        return SiteOverlayColors.polarity.hw_hybrid.color;
      }
    }

    if (sitePolarity === null) {
      return SiteOverlayColors.polarity.unknown.color;
    }

    sitePolarity = parseInt(sitePolarity, 10);
    switch (sitePolarity) {
      case PolarityType.ODD:
        return SiteOverlayColors.polarity.odd.color;
      case PolarityType.EVEN:
        return SiteOverlayColors.polarity.even.color;
      case PolarityType.HYBRID_ODD:
        return SiteOverlayColors.polarity.hybrid_odd.color;
      case PolarityType.HYBRID_EVEN:
        return SiteOverlayColors.polarity.hybrid_even.color;
      default:
        return SiteOverlayColors.polarity.unknown.color;
    }
  }

  getSiteHealthColor(siteNodes, siteWiredLinks) {
    const {offlineWhitelist} = this.props;
    const healthyNodeCount = siteNodes.filter(node => isNodeAlive(node.status))
      .length;
    const healthyLinkCount = siteWiredLinks.filter(link => link.is_alive)
      .length;

    if (siteNodes.length === 0) {
      return SiteOverlayColors.health.planned.color;
    } else if (
      healthyNodeCount === siteNodes.length &&
      healthyLinkCount === siteWiredLinks.length
    ) {
      return SiteOverlayColors.health.healthy.color;
    } else if (healthyNodeCount === 0) {
      if (
        !siteNodes.some(node => hasNodeEverGoneOnline(node, offlineWhitelist))
      ) {
        return SiteOverlayColors.health.planned.color;
      } else {
        return SiteOverlayColors.health.unhealthy.color;
      }
    } else {
      return SiteOverlayColors.health.partial.color;
    }
  }

  getSiteColor(site: SiteType): string {
    const {
      overlay,
      nodeMap,
      siteToNodesMap,
      topology,
      siteMapOverrides,
      routes,
    } = this.props;

    if (siteMapOverrides) {
      const val = siteMapOverrides[site.name];
      if (typeof val === 'undefined' || val === '') {
        return SiteOverlayColors.health.planned.color;
      }
      // val is a metric value and must be interpolated
      //TODO switch on overlay.type === metric instead
      if (overlay.id === 'custom') {
        const rangeFunc = makeRangeColorFunc(
          overlay.range ?? [],
          overlay.colorRange ?? [],
        );
        return rangeFunc(typeof val === 'string' ? parseFloat(val) : val);
      }
      return val; //val is just the color
    }

    const siteNodes =
      siteToNodesMap && nodeMap
        ? Array.from(siteToNodesMap[site.name]).map(
            nodeName => nodeMap[nodeName],
          )
        : [];

    // if viewing route overlay, only color in route nodes
    if (routes.nodes && routes.nodes.size !== 0) {
      const inRoutes = siteNodes.filter(node => routes.nodes.has(node.name))
        .length;
      if (inRoutes) {
        return SiteOverlayColors.health.healthy.color;
      } else {
        return SiteOverlayColors.health.planned.color;
      }
    }

    let siteColor;
    switch (overlay.id) {
      case 'polarity':
        siteColor = this.getSitePolarityColor(siteNodes);
        break;
      default:
        // use 'health' as default overlay
        // get wired intrasite links to help calculate site health
        const siteNodeSet = new Set(siteNodes.map(node => node.name));
        const siteWiredLinks = topology.links.filter(
          link =>
            link.link_type === LinkType.ETHERNET &&
            siteNodeSet.has(link.a_node_name) &&
            siteNodeSet.has(link.z_node_name),
        );
        siteColor = this.getSiteHealthColor(siteNodes, siteWiredLinks);
        break;
    }
    return siteColor;
  }

  handleSiteClick = site => evt => {
    // Handle clicking on a site
    if (mapboxShouldAcceptClick(evt)) {
      this.props.onSelectSiteChange(site.name);
    }
  };

  render() {
    const {
      classes,
      topology,
      selectedSites,
      nodeMap,
      siteToNodesMap,
      onSiteMouseEnter,
      onSiteMouseLeave,
      plannedSite,
      onPlannedSiteMoved,
      nearbyNodes,
      hiddenSites,
    } = this.props;

    // Draw sites in topology
    const features = [];
    topology.sites
      .filter(site => !hiddenSites.has(site.name))
      .forEach(site => {
        // Add site feature
        const featureParams = {
          coordinates: locToPos(site.location),
          onMouseEnter: onSiteMouseEnter,
          onMouseLeave: onSiteMouseLeave,
          onClick: this.handleSiteClick(site),
          'test-site-name': site.name,
        };
        features.push(
          <Feature
            key={'circle-layer-' + site.name}
            {...featureParams}
            properties={{
              siteColor: this.getSiteColor(site),
              circleRadius: CIRCLE_RADIUS,
              strokeColor: SELECTED_CIRCLE_STROKE_COLOR,
              strokeWidth: selectedSites.hasOwnProperty(site.name)
                ? SELECTED_CIRCLE_STROKE_WIDTH
                : 0,
            }}
            test-site-layer="circle"
          />,
        );

        // Check for special properties, and render "inner" circles if needed
        const siteNodes =
          siteToNodesMap && siteToNodesMap[site.name]
            ? Array.from(siteToNodesMap[site.name])
            : [];
        const hasPop =
          nodeMap !== undefined &&
          siteNodes.find(nodeName => nodeMap[nodeName].pop_node) !== undefined;
        const hasCn =
          nodeMap !== undefined &&
          siteNodes.find(
            nodeName => nodeMap[nodeName].node_type === NodeType.CN,
          ) !== undefined;
        if (hasPop) {
          features.push(
            <Feature
              key={'inner-circle-layer-' + site.name}
              {...featureParams}
              properties={{
                siteColor: POP_SITE_COLOR,
                circleRadius: INNER_CIRCLE_RADIUS,
                strokeWidth: 0,
              }}
              test-site-layer="inner-circle"
            />,
          );
        } else if (hasCn) {
          features.push(
            <Feature
              key={'inner-circle-layer-' + site.name}
              {...featureParams}
              properties={{
                siteColor: CN_SITE_COLOR,
                circleRadius: INNER_CIRCLE_RADIUS,
                strokeWidth: 0,
              }}
              test-site-layer="inner-circle"
            />,
          );
        }
      });

    // Draw planned site
    if (plannedSite) {
      features.push(
        <Feature
          key="planned-site"
          onMouseEnter={onSiteMouseEnter}
          onMouseLeave={onSiteMouseLeave}
          coordinates={locToPos({
            latitude: plannedSite.latitude,
            longitude: plannedSite.longitude,
          })}
          properties={{
            siteColor: PLANNED_SITE_COLOR,
            circleRadius: CIRCLE_RADIUS,
            strokeColor: PLANNED_SITE_STROKE_COLOR,
            strokeWidth: SELECTED_CIRCLE_STROKE_WIDTH,
          }}
          draggable
          onDragEnd={onPlannedSiteMoved}
          test-planned-site-name={plannedSite.name}
        />,
      );
    }

    // Draw "nearby" sites (from topology scan)
    // Also render node popups here
    const nearbyNodePopups = [];
    // node -> responder -> radioMac -> response
    objectEntriesTypesafe<string, TopologyScanByNodeMac>(nearbyNodes).forEach(
      ([_txNode, responderToRadioResponseBySiteMac]) => {
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
          ).forEach(([responderMac, responders]) => {
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
            const location = pos;
            const key = 'nearby-' + responderMac + '-' + addr;
            if (location) {
              features.push(
                <Feature
                  key={key}
                  onMouseEnter={onSiteMouseEnter}
                  onMouseLeave={onSiteMouseLeave}
                  coordinates={locToPos(location)}
                  properties={{
                    siteColor: SEARCH_NEARBY_SITE_COLOR,
                    circleRadius: CIRCLE_RADIUS,
                    strokeColor: SEARCH_NEARBY_STROKE_COLOR,
                    strokeWidth: SEARCH_NEARBY_STROKE_WIDTH,
                  }}
                />,
              );
              nearbyNodePopups.push(
                <Popup key={key + '-popup'} coordinates={locToPos(location)}>
                  <div>
                    {renderSnrWithIcon(firstResponder.bestSnr, {
                      classes: {root: classes.iconBottom},
                    })}
                    {addr}
                  </div>
                </Popup>,
              );
            }
          });
        });
      },
    );

    return (
      <>
        <Layer
          type="circle"
          key={'site-layer'}
          id={'site-layer'}
          paint={POSITION_CIRCLE_PAINT}>
          {features}
        </Layer>

        {nearbyNodePopups}
      </>
    );
  }
}

export default withStyles(styles)(SitesLayer);
