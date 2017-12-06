import Leaflet, { Point, LatLng } from 'leaflet';

import {Actions} from '../constants/NetworkConstants.js';
import Dispatcher from '../NetworkDispatcher.js';

export const getLinkAnglesForNodes = (nodeNames, links) => {
  const DNLinks = links.filter(link => link.link_type === 1);

  // gets a map of node name to link that extends out of the node
  // first for nodes at the outgoing end of links
  const anglesByANode = DNLinks.reduce((curLinks, link) => {
    let newLink = {};
    // assume range is -180 to 180. we want to convert to 0 to 360
    const newAngle = link.angle < 0 ? link.angle + 360 : link.angle;
    newLink[link.a_node_name] = newAngle;
    // console.log(link.a_node_name, newAngle);
    return Object.assign(curLinks, newLink);
  }, {});

  // then for nodes at the incoming end of links
  const anglesByZNode = DNLinks.reduce((curLinks, link) => {
    let newLink = {};
    // assume range is -180 to 180. we want to convert to 0 to 360
    const newAngleOfA = link.angle < 0 ? link.angle + 360 : link.angle;
    const newAngle = (newAngleOfA + 180) % 360;

    newLink[link.z_node_name] = newAngle; // convert the angle here
    // console.log(link.z_node_name, newAngle);
    return Object.assign(curLinks, newLink);
  }, {});

  // TODO: Kelvin: this is a VERY simple case where we assume each node
  // has EXACTLY 1 link either coming into it or going out of it
  return Object.assign({}, anglesByANode, anglesByZNode);
}

const sortkeysByValue = (toSort) => {
  // outputs the keys of an object such that when the values are retrieved in the order
  // of the keys, they will be sorted

  // [key, value] pairs for the given object
  const kvPairs = Object.keys(toSort).map((key) => {
    return [key, toSort[key]];
  });

  kvPairs.sort((a, b) => {
    if (a[1] < b[1]) {
      return -1;
    } else if (a[1] > b[1]) {
      return 1;
    }
    return 0;
  });

  // just get the keys
  return kvPairs.map(pair => pair[0]);
}

export const getNodeValues = (linkAnglesForNodes, sortedNodesByAngle) => {
  let nodeValues = {};
  let leftAngles = {};
  let rightAngles = {};

  // we iterate using the order in sortedNodesByAngle (implicitly, we go around the circle of a site)
  // populate a map of node name --> the rightmost angle of a node's sector in the pie chart
  // the rightmost angle is the bisector of the angle between the current node's and next node's links
  sortedNodesByAngle.forEach((node, idx) => {
    // treat as a circular array
    const ownAngle = linkAnglesForNodes[sortedNodesByAngle[idx]];

    // get the angle for the next sector
    const nextAngle = linkAnglesForNodes[sortedNodesByAngle[(idx + 1) % sortedNodesByAngle.length]];
    const adjNextAngle = nextAngle >= ownAngle ? nextAngle : nextAngle + 360;

    // console.log(node, ownAngle, nextAngle, (ownAngle + ((adjNextAngle - ownAngle) / 2)) % 360);
    rightAngles[node] = (ownAngle + ((adjNextAngle - ownAngle) / 2)) % 360;
  });

  // populate a map of node name --> the LEFTmost angle of a node's sector in the pie chart
  // the leftmost angle is the bisector of the angle between the current node's and previous node's links
  // we also calculate the relative value of the node's sector in the pie chart through the difference
  // of the node's right-angle and left-angle
  sortedNodesByAngle.forEach((node, idx) => {
    const leftIdx = idx === 0 ? sortedNodesByAngle.length - 1 : idx - 1;

    const rightAngle = rightAngles[node];
    const leftAngle = rightAngles[sortedNodesByAngle[leftIdx]];
    const adjLeftAngle = leftAngle > rightAngle ? leftAngle - 360 : leftAngle;

    // console.log(node, rightAngle, leftAngle, adjLeftAngle, rightAngle - adjLeftAngle);

    leftAngles[node] = adjLeftAngle;
    nodeValues[node] = rightAngle - adjLeftAngle;
  });

  // console.log(linkAnglesForNodes, nodeValues);
  // use the left-angle of the first sector to calculate the rotation offset needed for the pie chart
  return {
    nodeValues,
    offset: leftAngles[sortedNodesByAngle[0]] - 90,
  };
}

export const getNodeMarker = (siteCoords, nodesInSite, links, selectedNode) => {
  let nodeNames = [];
  let nodesByName = {};
  let linksForNodesInSite = {};
  nodesInSite.forEach((node) => {
    nodeNames = nodeNames.concat(node.name);
    nodesByName[node.name] = node;
  });

  // filter the link angles for only the nodes in the site (the ones that we care about)
  const linkAnglesForNodes = getLinkAnglesForNodes(nodeNames, links);
  nodeNames.forEach(node => {linksForNodesInSite[node] = linkAnglesForNodes[node]});

  const { nodeValues, offset } = getNodeValues(linksForNodesInSite, sortkeysByValue(linksForNodesInSite));

  const chartOptions = {};
  Object.keys(nodeValues).forEach(nodeName => {
    const node = nodesByName[nodeName];
    const fillColor = node.status === 1 ? '#ff2222' : '#44ff44';

    chartOptions[nodeName] = {
      fillColor: fillColor,
      fillOpacity: 1,
    };
  });

  const options = {
    data: nodeValues,
    chartOptions: chartOptions,
    weight: 1,
    color: '#000000',
    fillOpacity: 1,
    radius: 20,
    rotation: offset,
    barThickness: 10,
    level: 1000,
  };

  const newMarker = new Leaflet.PieChartMarker(
    new LatLng(siteCoords[0], siteCoords[1]),
    options
  );

  // TODO: hacky but only way we can bind onClick to each segment
  newMarker.eachLayer((layer) => {
    const node = nodesByName[layer.options.key];
    let segmentOptions = {};
    if (node.name === selectedNode) {
      segmentOptions = {
        barThickness: 12,
        radiusX: 24,
        radiusY: 24,
        color: '#0000bb',
        weight: 3
      };
    }

    layer.setStyle(Object.assign({}, layer.options, segmentOptions));

    // create a new options object, and assign it if needed
    layer.off();

    layer.on('click', (e) => {
      const nodeName = e.target.options.key;
      Dispatcher.dispatch({
        actionType: Actions.NODE_SELECTED,
        nodeSelected: nodeName,
      });
    });

    // bind more mouseevents here
    // layer.on('mouseover', () => {});
    // layer.on('mouseout', () => {});
  })
  return newMarker;
}
