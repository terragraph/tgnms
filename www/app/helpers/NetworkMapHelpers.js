import Leaflet, { Point, LatLng } from 'leaflet';

export const getLinkAnglesForNodes = (nodeNames, links) => {
  // console.log(links);
  // another dumb assumption for now
  const actualLinks = links.filter(link => link.distance > 0 && link.link_type === 1);
  console.log(actualLinks);

  // gets a map of node name to link that extends out of the node
  const anglesByANode = actualLinks.reduce((curLinks, link) => {
    let newLink = {};
    // assume range is -180 to 180. we want to convert to 0 to 360
    const newAngle = link.angle < 0 ? link.angle + 360 : link.angle;
    newLink[link.a_node_name] = newAngle;
    // console.log(link.a_node_name, newAngle);
    return Object.assign(curLinks, newLink);
  }, {});

  const anglesByZNode = actualLinks.reduce((curLinks, link) => {
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
  // so we iterate using the order in sortedNodesByAngle

  let leftAngles = {};
  let rightAngles = {};
  sortedNodesByAngle.forEach((node, idx) => {
    // treat as a circular array
    const ownAngle = linkAnglesForNodes[sortedNodesByAngle[idx]];

    // get the angle for the next sector
    const nextAngle = linkAnglesForNodes[sortedNodesByAngle[(idx + 1) % sortedNodesByAngle.length]];
    const adjNextAngle = nextAngle >= ownAngle ? nextAngle : nextAngle + 360;

    // console.log(node, ownAngle, nextAngle, (ownAngle + ((adjNextAngle - ownAngle) / 2)) % 360);
    rightAngles[node] = (ownAngle + ((adjNextAngle - ownAngle) / 2)) % 360;
  });

  // reuse the rightAngles to get the leftAngles, and then calculate the node values
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
  return {
    nodeValues,
    offset: leftAngles[sortedNodesByAngle[0]] - 90,
  };
  // populate a map representing the angle for the right limit of the node in the chart
  // and one for the left

  // so right - left mod 360 is the amount of space the node should take up
  // and we guarantee that a link that a node is part of is always between the start and end
  // of the node's piece in the pie chart in a site

  // offset: rotate CCW
}

export const getNodeMarker = (siteCoords, nodesInSite, links) => {
  const nodeNames = nodesInSite.map(node => node.name);

  const linkAnglesForNodes = getLinkAnglesForNodes(nodeNames, links);
  const linksForNodesInSite = {};
  nodeNames.forEach(node => {linksForNodesInSite[node] = linkAnglesForNodes[node]});

  const { nodeValues, offset } = getNodeValues(linksForNodesInSite, sortkeysByValue(linksForNodesInSite));

  const chartOptions = {};
  Object.keys(nodeValues).forEach(node => {
    chartOptions[node] = {
      fillColor: '#0000FF',
      fillOpacity: 1,
    }
  });

  const options = {
    data: nodeValues,
    chartOptions: chartOptions,
    // chartOptions: {
    //   'dataPoint1': {
    //     fillColor: '#FF0000',
    //     fillOpacity: 1,
    //     displayText: function (value) {
    //       return value.toFixed(2);
    //     }
    //   },
    //   'dataPoint2': {
    //     fillColor: '#00FF00',
    //     fillOpacity: 1,
    //     displayText: function (value) {
    //       return value.toFixed(2);
    //     }
    //   },
    //   'dataPoint3': {
    //     fillColor: '#0000FF',
    //     fillOpacity: 1,
    //     displayText: function (value) {
    //       return value.toFixed(2);
    //     }
    //   },
    //   'dataPoint4': {
    //     fillColor: '#000000',
    //     fillOpacity: 1,
    //     displayText: function (value) {
    //       return value.toFixed(2);
    //     }
    //   }
    // },
    weight: 1,
    color: '#000000',
    radius: 20,
    opacity: 1,
    fillOpacity: 1,
    rotation: offset,
  };
  // return {};

  return new Leaflet.PieChartMarker(
    new LatLng(siteCoords[0], siteCoords[1]),
    options
  );
}

// TODO: some sites do NOT select properly
