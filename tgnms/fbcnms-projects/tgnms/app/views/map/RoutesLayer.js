/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NetworkContext from '../../NetworkContext';
import RouteContext from '../../RouteContext';
import {
  // links
  CIRCLE_RADIUS,
  LINE_CASING_PAINT,
  LINE_LAYOUT,
  LINE_TEXT_LAYOUT,
  LINE_TEXT_PAINT,
  // sites
  LinkRenderType,
  POSITION_CIRCLE_PAINT,
  SELECTED_CIRCLE_STROKE_WIDTH,
} from '../../constants/LayerConstants';
import {Feature, Layer} from 'react-mapbox-gl';
import {TopologyElementType} from '../../constants/NetworkConstants';
import type {Node} from '../../NetworkContext';

const ROUTE_LINE_PAINT = {
  ...LINE_CASING_PAINT,
  'line-color': '#888888',
  'line-opacity': 0.8,
};

const ROUTE_SITE_PAINT = {
  ...POSITION_CIRCLE_PAINT,
  'circle-stroke-color': '#888888',
  'circle-opacity': 0,
};

const ROUTE_SITE_PROPERTIES = {
  circleRadius: CIRCLE_RADIUS,
  strokeWidth: SELECTED_CIRCLE_STROKE_WIDTH,
};

export default function RoutesLayer() {
  const {links, sites} = useRouteFeatures();
  return (
    <>
      <Layer
        type="line"
        key={'routes'}
        id={'routes'}
        /* render below the link layer to avoid blocking click events */
        before={LinkRenderType.NORMAL}
        paint={ROUTE_LINE_PAINT}
        layout={LINE_LAYOUT}>
        {links.map(feature => (
          <Feature {...feature} />
        ))}
      </Layer>
      <Layer
        type="symbol"
        key={'routes-text'}
        id={'routes-text'}
        sourceId={'routes'}
        paint={LINE_TEXT_PAINT}
        layout={LINE_TEXT_LAYOUT}
      />
      {/* render the start and end points of the paths */}
      <Layer
        type="circle"
        key="route-sites"
        id="route-sites"
        paint={ROUTE_SITE_PAINT}>
        {sites.map(feature => (
          <Feature {...feature} />
        ))}
      </Layer>
    </>
  );
}

const EMPTY_FEATURES: RouteFeatures = {
  links: [],
  sites: [],
};

function useRouteFeatures(): RouteFeatures {
  const {selectedElement, siteMap, nodeMap} = React.useContext(NetworkContext);
  const {routeData, selectedNode} = React.useContext(RouteContext);

  const routeOrigin = selectedNode
    ? selectedNode
    : selectedElement && selectedElement.type === TopologyElementType.NODE
    ? selectedElement.name
    : null;

  if (!routeOrigin) {
    return EMPTY_FEATURES;
  }

  const routes = routeData[routeOrigin];
  if (!routes || routes.length < 1) {
    return EMPTY_FEATURES;
  }
  const linkFeatures = buildLinkFeatures(routes, nodeMap, siteMap);
  const siteFeatures = buildSiteFeatures(routes, nodeMap, siteMap);

  return {links: linkFeatures, sites: siteFeatures};
}

function buildLinkFeatures(routes, nodeMap, siteMap) {
  const linkDedupe = new Set();
  const linkLines: Array<LinkFeature> = [];
  routes.forEach(({path}) => {
    let prevNode = nodeMap[path[0]];
    for (let i = 1; i < path.length; i++) {
      const currNode = nodeMap[path[i]];
      const currsite = siteMap[currNode.site_name];
      /* dont rely on this link name, its only for dedupe / uniqueness */
      const linkName =
        prevNode.name < currNode.name
          ? `${prevNode.name}-${currNode.name}`
          : `${currNode.name}-${prevNode.name}`;
      if (
        !linkDedupe.has(linkName) &&
        !(currNode.pop_node && prevNode.pop_node)
      ) {
        const prevSite = siteMap[prevNode.site_name];
        linkLines.push({
          key: linkName,
          coordinates: [
            [prevSite.location.longitude, prevSite.location.latitude],
            [currsite.location.longitude, currsite.location.latitude],
          ],
          properties: {
            text: getPopNodeText(prevNode, currNode),
          },
        });
        linkDedupe.add(linkName);
      }
      prevNode = currNode;
    }
  });
  return linkLines;
}

function buildSiteFeatures(routes, nodeMap, siteMap): Array<SiteFeature> {
  // start and end node will be the same no matter which ecmp path
  const {path} = routes[0];
  const nameA = path[0];
  const nameZ = path[path.length - 1];

  return [nameA, nameZ].map(nodeName => {
    const node = nodeMap[nodeName];
    const {longitude, latitude} = siteMap[node.site_name].location;
    const coordinates = [longitude, latitude];
    return {
      key: `route-site-${nodeName}`,
      coordinates: coordinates,
      properties: ROUTE_SITE_PROPERTIES,
    };
  });
}

function getPopNodeText(prevNode: Node, currNode: Node) {
  if (!prevNode.pop_node && currNode.pop_node) {
    return 'out';
  } else if (prevNode.pop_node && !currNode.pop_node) {
    return 'in';
  }
  return '';
}

type RouteFeatures = {
  links: Array<LinkFeature>,
  sites: Array<SiteFeature>,
};

type LinkFeature = {
  key: string,
  coordinates: Array<[number, number]>,
};

type SiteFeature = {
  key: string,
  coordinates: [number, number],
};
