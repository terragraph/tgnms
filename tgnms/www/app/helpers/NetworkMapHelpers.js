/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from '../NetworkDispatcher.js';
import {Actions} from '../constants/NetworkConstants.js';
import {LinkType} from '../../thrift/gen-nodejs/Topology_types';
import Leaflet, {Point, LatLng} from 'leaflet';

export const MAX_SECTOR_SIZE = 45; // max size allocated for a node sector, in degrees

const DEFAULT_SEGMENT_OPTIONS = {
  weight: 1,
  color: '#000000',
  fillOpacity: 1,
  radius: 20,
  barThickness: 10,
  level: 1000,
};

const sortkeysByValue = toSort => {
  const kvPairs = Object.keys(toSort).map(key => [key, toSort[key]]);

  kvPairs.sort((a, b) => {
    if (a[1] < b[1]) {
      return -1;
    } else if (a[1] > b[1]) {
      return 1;
    }
    return 0;
  });

  return kvPairs.map(pair => pair[0]); // retrieve keys only
};

const getLinkAnglesForNodes = (nodeList, linksBySector, onlyShowSector) => {
  const anglesBySector = {};

  nodeList.forEach(node => {
    const sectorList = [];
    sectorList.push(node.mac_addr);
    sectorList.push(...node.secondary_mac_addrs);

    sectorList.forEach(mac => {
      if (onlyShowSector && mac !== onlyShowSector) {
        return;
      }

      let linkAngle = node.ant_azimuth;
      // assume 1 DN link per sector, and we retrieve it here
      let dnLinks = [];
      if (linksBySector.hasOwnProperty(mac)) {
        dnLinks = linksBySector[mac].filter(
          link => link.link_type === LinkType.WIRELESS,
        );
      }
      if (dnLinks.length > 0) {
        const link = dnLinks[0];
        linkAngle = link.angle;
        if (mac === link.a_node_mac) {
          anglesBySector[mac] = linkAngle < 0 ? linkAngle + 360 : linkAngle;
        } else if (mac === link.z_node_mac) {
          const angleOfANode = linkAngle < 0 ? linkAngle + 360 : linkAngle;
          anglesBySector[mac] = (angleOfANode + 180) % 360;
        }
      } else if (linkAngle !== 0) {
        anglesBySector[mac] = linkAngle;
      }
    });
  });

  return anglesBySector;
};

const partitionNodeSector = (
  sector,
  ownAngle,
  leftAngle,
  rightAngle,
  padID,
) => {
  // use padID as a identifier for the node in the site
  const leftOffset =
    ownAngle - leftAngle < 0
      ? ownAngle - leftAngle + 360
      : ownAngle - leftAngle;
  const rightOffset =
    rightAngle - ownAngle < 0
      ? rightAngle - ownAngle + 360
      : rightAngle - ownAngle;
  // desired offset from the midpoint to one side. we want to make the sector symmetrical about the link line
  const desiredOffset = Math.min(leftOffset, rightOffset, MAX_SECTOR_SIZE / 2);

  const nodeValues = {};

  /*
  Visualizing the above:
  leftAngle                                                     ownAngle                                      rightAngle
  |----------------------------------------|-----------------------|-----------------------|---------------------------|
                                  ownAngle - desiredOffset                        ownAngle + desiredOffset
  */

  // note: we are leveraging the property that objects in ES6 are iterated in the order of insertion, hence the control structure shown
  if (leftOffset > desiredOffset) {
    nodeValues[padID + '_left'] = ownAngle - desiredOffset - leftAngle;
  }
  nodeValues[sector] = 2 * desiredOffset;
  if (rightOffset > desiredOffset) {
    nodeValues[padID + '_right'] = rightAngle - desiredOffset - ownAngle;
  }

  return nodeValues;
};

const getNodeValues = (linkAnglesForSectors, sortedSectorsByAngle) => {
  const nodeValues = {};
  const leftAngles = {};
  const rightAngles = {};

  // special case when we have one sector
  if (sortedSectorsByAngle.length === 1) {
    const sector = sortedSectorsByAngle[0];

    nodeValues[sector + '_left'] = (360 - MAX_SECTOR_SIZE) / 2;
    nodeValues[sector] = MAX_SECTOR_SIZE;
    nodeValues[sector + '_right'] = (360 - MAX_SECTOR_SIZE) / 2;

    return {
      nodeValues,
      offset: linkAnglesForSectors[sector] + 90,
    };
  }

  // we iterate using the order in sortedSectorsByAngle (implicitly, we go around the circle of a site)
  // populate a map of node name --> the rightmost angle of a node's sector in the pie chart
  // the rightmost angle is the bisector of the angle between the current node's and next node's links
  sortedSectorsByAngle.forEach((sector, idx) => {
    // treat as a circular array
    const ownAngle = linkAnglesForSectors[sector];

    // get the angle for the next sector
    const nextAngle =
      linkAnglesForSectors[
        sortedSectorsByAngle[(idx + 1) % sortedSectorsByAngle.length]
      ];
    const adjNextAngle = nextAngle >= ownAngle ? nextAngle : nextAngle + 360;

    rightAngles[sector] = (ownAngle + (adjNextAngle - ownAngle) / 2) % 360;
  });

  // populate a map of node name --> the LEFTmost angle of a node's sector in the pie chart
  // the leftmost angle is the bisector of the angle between the current node's and previous node's links
  // we also calculate the relative value of the node's sector in the pie chart through the difference
  // of the node's right-angle and left-angle
  sortedSectorsByAngle.forEach((sector, idx) => {
    const leftIdx = idx === 0 ? sortedSectorsByAngle.length - 1 : idx - 1;

    const rightAngle = rightAngles[sector];
    const leftAngle = rightAngles[sortedSectorsByAngle[leftIdx]];
    const adjLeftAngle = leftAngle > rightAngle ? leftAngle - 360 : leftAngle;

    leftAngles[sector] = adjLeftAngle;
    Object.assign(
      nodeValues,
      partitionNodeSector(
        sector,
        linkAnglesForSectors[sector],
        adjLeftAngle,
        rightAngle,
        sector,
      ),
    );
  });

  // use the left-angle of the first sector to calculate the rotation offset needed for the pie chart
  return {
    nodeValues,
    offset: leftAngles[sortedSectorsByAngle[0]] - 90,
  };
};

export const getNodeMarker = (
  siteCoords,
  nodesInSite,
  linksByNode,
  selectedSector,
  onlyShowSector,
  mouseEnterFunc,
  mouseLeaveFunc,
) => {
  const linksBySector = {};
  Object.keys(linksByNode).forEach(node => {
    linksByNode[node].forEach(link => {
      linksBySector[link.a_node_mac] = linksBySector[link.a_node_mac]
        ? linksBySector[link.a_node_mac].concat(link)
        : [link];
      linksBySector[link.z_node_mac] = linksBySector[link.z_node_mac]
        ? linksBySector[link.z_node_mac].concat(link)
        : [link];
    });
  });

  const nodesBySector = {};
  nodesInSite.forEach(node => {
    nodesBySector[node.mac_addr] = node;
    node.secondary_mac_addrs.forEach(mac => {
      nodesBySector[mac] = node;
    });
  });

  // filter the link angles for only the nodes in the site (the ones that we care about)
  const linkAnglesForSectors = getLinkAnglesForNodes(
    nodesInSite,
    linksBySector,
    onlyShowSector,
  );
  const {nodeValues, offset} = getNodeValues(
    linkAnglesForSectors,
    sortkeysByValue(linkAnglesForSectors),
  );

  const chartOptions = {};
  Object.keys(nodeValues).forEach(mac => {
    const node = nodesBySector[mac];
    const fillColor =
      node && (node.status === 2 || node.status === 3) ? '#44ff44' : '#ff2222';

    chartOptions[mac] = {
      fillColor,
      fillOpacity: 1,
    };
  });

  const options = Object.assign({}, DEFAULT_SEGMENT_OPTIONS, {
    data: nodeValues,
    chartOptions,
    rotation: offset,
  });

  const newMarker = new Leaflet.PieChartMarker(
    new LatLng(siteCoords[0], siteCoords[1]),
    options,
  );

  // TODO: hacky but only way we can bind onClick to each segment
  newMarker.eachLayer(layer => {
    const mac = layer.options.key;
    const node = nodesBySector[mac];

    // per-segment styling
    let segmentOptions = {};
    if (!node) {
      // don't draw the segment for padding
      segmentOptions = {
        opacity: 0,
        fillOpacity: 0,
        weight: 0,
      };
    } else if (mac === selectedSector) {
      segmentOptions = {
        barThickness: 12,
        radiusX: 24,
        radiusY: 24,
        color: '#0000bb',
        weight: 3,
      };
    }

    layer.setStyle(Object.assign({}, layer.options, segmentOptions));

    // remove the pre-built event listeners and then add our own
    layer.off();

    if (nodesBySector.hasOwnProperty(mac)) {
      layer.on('click', e => {
        const mac = e.target.options.key;
        Dispatcher.dispatch({
          actionType: Actions.NODE_SELECTED,
          nodeSelected: nodesBySector[mac].name,
          sectorSelected: mac,
          source: 'map',
        });
      });
    }

    layer.on('mouseout', e => {
      mouseLeaveFunc();
    });
  });

  return newMarker;
};
