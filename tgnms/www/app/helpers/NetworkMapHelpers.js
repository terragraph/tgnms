import Leaflet, { Point, LatLng } from "leaflet";

import { Actions } from "../constants/NetworkConstants.js";
import Dispatcher from "../NetworkDispatcher.js";

export const MAX_SECTOR_SIZE = 45; // max size allocated for a node sector, in degrees

const DEFAULT_SEGMENT_OPTIONS = {
  weight: 1,
  color: "#000000",
  fillOpacity: 1,
  radius: 20,
  barThickness: 10,
  level: 1000
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

const getLinkAnglesForNodes = (nodeNames, linksByNode) => {
  let anglesByNode = {};

  nodeNames.forEach(node => {
    if (!linksByNode[node]) {
      return;
    }
    // assume 1 DN link per node, and we retrieve it here
    const DNLinks = linksByNode[node].filter(link => link.link_type === 1);
    if (DNLinks.length === 0) {
      return; // skip node with no DN links
    }

    const link = DNLinks[0];
    const linkAngle = link.angle;
    if (node === link.a_node_name) {
      anglesByNode[node] = linkAngle < 0 ? linkAngle + 360 : linkAngle;
    } else if (node === link.z_node_name) {
      const angleOfANode = linkAngle < 0 ? linkAngle + 360 : linkAngle;
      anglesByNode[node] = (angleOfANode + 180) % 360;
    }
  });

  return anglesByNode;
};

const partitionNodeSector = (node, ownAngle, leftAngle, rightAngle, padID) => {
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

  let nodeValues = {};

  /*
  Visualizing the above:
  leftAngle                                                     ownAngle                                      rightAngle
  |----------------------------------------|-----------------------|-----------------------|---------------------------|
                                  ownAngle - desiredOffset                        ownAngle + desiredOffset
  */

  // note: we are leveraging the property that objects in ES6 are iterated in the order of insertion, hence the control structure shown
  if (leftOffset > desiredOffset) {
    nodeValues[padID + "_left"] = ownAngle - desiredOffset - leftAngle;
  }
  nodeValues[node] = 2 * desiredOffset;
  if (rightOffset > desiredOffset) {
    nodeValues[padID + "_right"] = rightAngle - desiredOffset - ownAngle;
  }

  return nodeValues;
};

const getNodeValues = (linkAnglesForNodes, sortedNodesByAngle, nodesByName) => {
  let nodeValues = {};
  let leftAngles = {};
  let rightAngles = {};

  // special case when we have one node
  if (sortedNodesByAngle.length === 1) {
    const node = sortedNodesByAngle[0];
    const nodeMac = nodesByName[node].mac_addr;

    nodeValues[nodeMac + "_left"] = (360 - MAX_SECTOR_SIZE) / 2;
    nodeValues[node] = MAX_SECTOR_SIZE;
    nodeValues[nodeMac + "_right"] = (360 - MAX_SECTOR_SIZE) / 2;

    return {
      nodeValues,
      offset: linkAnglesForNodes[node] + 90
    };
  }

  // we iterate using the order in sortedNodesByAngle (implicitly, we go around the circle of a site)
  // populate a map of node name --> the rightmost angle of a node's sector in the pie chart
  // the rightmost angle is the bisector of the angle between the current node's and next node's links
  sortedNodesByAngle.forEach((node, idx) => {
    // treat as a circular array
    const ownAngle = linkAnglesForNodes[node];

    // get the angle for the next sector
    const nextAngle =
      linkAnglesForNodes[
        sortedNodesByAngle[(idx + 1) % sortedNodesByAngle.length]
      ];
    const adjNextAngle = nextAngle >= ownAngle ? nextAngle : nextAngle + 360;

    rightAngles[node] = (ownAngle + (adjNextAngle - ownAngle) / 2) % 360;
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

    leftAngles[node] = adjLeftAngle;
    Object.assign(
      nodeValues,
      partitionNodeSector(
        node,
        linkAnglesForNodes[node],
        adjLeftAngle,
        rightAngle,
        nodesByName[node].mac_addr
      )
    );
  });

  // use the left-angle of the first sector to calculate the rotation offset needed for the pie chart
  return {
    nodeValues,
    offset: leftAngles[sortedNodesByAngle[0]] - 90
  };
};

export const getNodeMarker = (
  siteCoords,
  nodesInSite,
  linksByNode,
  selectedNode,
  mouseEnterFunc,
  mouseLeaveFunc
) => {
  let nodeNames = [];
  let nodesByName = {};
  let linkAnglesForSiteNodes = {};
  nodesInSite.forEach(node => {
    nodeNames = nodeNames.concat(node.name);
    nodesByName[node.name] = node;
  });

  // filter the link angles for only the nodes in the site (the ones that we care about)
  const linkAnglesForNodes = getLinkAnglesForNodes(nodeNames, linksByNode);

  const { nodeValues, offset } = getNodeValues(
    linkAnglesForNodes,
    sortkeysByValue(linkAnglesForNodes),
    nodesByName
  );

  const chartOptions = {};
  Object.keys(nodeValues).forEach(nodeName => {
    const node = nodesByName[nodeName];
    const fillColor =
      node && (node.status === 2 || node.status === 3) ? "#44ff44" : "#ff2222";

    chartOptions[nodeName] = {
      fillColor: fillColor,
      fillOpacity: 1
    };
  });

  const options = Object.assign({}, DEFAULT_SEGMENT_OPTIONS, {
    data: nodeValues,
    chartOptions: chartOptions,
    rotation: offset
  });

  const newMarker = new Leaflet.PieChartMarker(
    new LatLng(siteCoords[0], siteCoords[1]),
    options
  );

  // TODO: hacky but only way we can bind onClick to each segment
  newMarker.eachLayer(layer => {
    const node = nodesByName[layer.options.key];

    // per-segment styling
    let segmentOptions = {};
    if (!node) {
      // don't draw the segment for padding
      segmentOptions = {
        opacity: 0,
        fillOpacity: 0,
        weight: 0
      };
    } else if (node.name === selectedNode) {
      segmentOptions = {
        barThickness: 12,
        radiusX: 24,
        radiusY: 24,
        color: "#0000bb",
        weight: 3
      };
    }

    layer.setStyle(Object.assign({}, layer.options, segmentOptions));

    // remove the pre-built event listeners and then add our own
    layer.off();

    if (nodesByName.hasOwnProperty(layer.options.key)) {
      layer.on("click", e => {
        const nodeName = e.target.options.key;
        Dispatcher.dispatch({
          actionType: Actions.NODE_SELECTED,
          nodeSelected: nodeName,
          source: "map"
        });
      });
    }

    layer.on("mouseout", e => {
      mouseLeaveFunc();
    });
  });

  return newMarker;
};
