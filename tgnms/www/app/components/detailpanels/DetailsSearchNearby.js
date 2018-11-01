/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {Panel} from 'react-bootstrap';
import React from 'react';
import PropTypes from 'prop-types';

// Thresholds used to indicate a suboptimal responder node
//
// The maximum distance, in meters, to allow between a responder's reported
// position and the nearest site
const DISTANCE_THRESHOLD = 50;
// Minimum signal-to-noise ratio (SNR), in dB, to allow on new links (default of
// 6.1dB is needed to support MCS2 at a PER of 1e-3)
const SNR_THRESHOLD = 6.1;

export default class DetailsSearchNearby extends React.Component {
  static propTypes = {
    topology: PropTypes.object.isRequired,
    maxHeight: PropTypes.number.isRequired,
    node: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onTopologyOperation: PropTypes.func.isRequired,
    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onNearbyNodeUpdate: PropTypes.func.isRequired,
  };
  state = {
    ignitionStateModalOpen: false,
    showActions: true,
    nearbyNodes: [],
    isLoading: true,
    errorMsg: null,
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.onSearchAgain();
  }

  getCombinedAngle(responderNode) {
    return (
      Math.abs(responderNode.bestTxAngle) + Math.abs(responderNode.bestRxAngle)
    );
  }

  compareTopologyScanInfo(responderNodeA, responderNodeB) {
    // Sort metric priorities:
    // 1. Decreasing SNR
    // 2. Increasing combinedAngle
    // 3. Increasing nearestSiteDistance

    if (responderNodeA.bestSnr === responderNodeB.bestSnr) {
      // If SNR is equal, try sorting by combined angle
      const combinedAngleA = this.getCombinedAngle(responderNodeA);
      const combinedAngleB = this.getCombinedAngle(responderNodeB);

      if (combinedAngleA === combinedAngleB) {
        // If combined angle is equal, sort by nearestSiteDistance
        // A - B for increasing nearestSiteDistance
        return (
          responderNodeA.nearestSiteDistance -
          responderNodeB.nearestSiteDistance
        );
      }

      // A - B for increasing combinedAngle
      return combinedAngleA - combinedAngleB;
    }

    // B - A for decreasing SNR
    return responderNodeB.bestSnr - responderNodeA.bestSnr;
  }

  onSearchAgain() {
    const {node, topology} = this.props;
    this.setState({isLoading: true});

    apiServiceRequest(topology.name, 'startTopologyScan', {txNode: node.name})
      .then(response => {
        response.data.responders.sort((a, b) =>
          this.compareTopologyScanInfo(a, b),
        );
        this.setState({
          errorMsg: null,
          isLoading: false,
          nearbyNodes: response.data.responders,
        });
      })
      .catch(error => {
        this.setState({
          errorMsg: getErrorTextFromE2EAck(error),
          isLoading: false,
          nearbyNodes: [],
        });
      });
  }

  // Generates a node name given the site of the responder node. Iterates
  // through i=[1...], creating node names of the form <site_name>.<i> until a
  // name is found that does not already exist.
  genResponderNodeName(responderNodeSite) {
    const {topology} = this.props;
    // find all nodes on site
    const nodesOnSite = topology.nodes
      .filter(node => node.site_name === responderNodeSite)
      .map(node => node.name);
    let i = 0;
    let name;
    do {
      name = `${responderNodeSite}.${++i}`;
    } while (nodesOnSite.includes(name));

    return name;
  }

  addNearbyNode(nearbyNodeMac, nearbyNodeSite) {
    const {onTopologyOperation} = this.props;

    // Node is not in topology
    onTopologyOperation('addNode', {
      defaultNodeName: this.genResponderNodeName(nearbyNodeSite),
      defaultNodeMacAddr: nearbyNodeMac,
      defaultNodeSiteName: nearbyNodeSite,
    });
  }

  addNearbyLink(nearbyNodeMac, nodeInTopology) {
    const {node, onTopologyOperation} = this.props;
    const responderNodeName = nodeInTopology.name;

    let node1Name, node2Name;
    if (node.name < responderNodeName) {
      node1Name = node.name;
      node2Name = responderNodeName;
    } else {
      node1Name = responderNodeName;
      node2Name = node.name;
    }
    onTopologyOperation('addLink', {
      defaultLinkNode1: node1Name,
      defaultLinkNode2: node2Name,
      defaultLinkType: 'WIRELESS',
    });
  }

  findNodeInTopology(responderNodeMac) {
    const {topology} = this.props;
    const node = topology.nodes.filter(
      node =>
        node.mac_addr === responderNodeMac ||
        node.wlan_mac_addrs.includes(responderNodeMac),
    );
    return node.length ? node[0] : null;
  }

  findLinkInTopology(aNodeName, zNodeName) {
    const {topology} = this.props;
    const link = topology.links.filter(
      link =>
        (link.a_node_name === aNodeName && link.z_node_name === zNodeName) ||
        (link.a_node_name === zNodeName && link.z_node_name === aNodeName),
    );
    return link.length ? link[0] : null;
  }

  genNearbyNodeHeader(nearbyNode) {
    const {node} = this.props;
    const mac = nearbyNode.responderInfo.addr;
    const site = nearbyNode.nearestSite;
    const nodeInTopology = this.findNodeInTopology(mac);
    const nearbyNodeHeader = [];
    // Show node name if it is in topology
    if (nodeInTopology) {
      nearbyNodeHeader.push(
        <span>
          <strong>&nbsp;({nodeInTopology.name})</strong>
        </span>,
      );
      const linkInTopology = this.findLinkInTopology(
        node.name,
        nodeInTopology.name,
      );
      // Add 'Add Link' button if link is not already in topology
      if (!linkInTopology) {
        nearbyNodeHeader.push(
          <span
            role="link"
            tabIndex="0"
            className="details-link"
            style={{float: 'right'}}
            onClick={() => this.addNearbyLink(mac, nodeInTopology)}>
            Add Link
          </span>,
        );
      }
    } else {
      // Add 'Add Node' button if node not in topology
      nearbyNodeHeader.push(
        <span
          role="link"
          tabIndex="0"
          className="details-link"
          style={{float: 'right'}}
          onClick={() => this.addNearbyNode(mac, site)}>
          Add Node
        </span>,
      );
    }

    return (
      <h5>
        <span>
          <strong>{mac}</strong>
        </span>
        {nearbyNodeHeader}
      </h5>
    );
  }

  genNearbyAdjacenciesTable(nearbyNode) {
    // Construct rows of table
    const adjacenciesRows = nearbyNode.responderInfo.adjs.map(adjNodeMac => {
      const adjNodeSite = nearbyNode.nearestSite;
      const nearbyAdjNodeIntopology = this.findNodeInTopology(adjNodeMac);

      let nearbyNodeNameOrAdd;
      if (nearbyAdjNodeIntopology) {
        nearbyNodeNameOrAdd = (
          <span style={{float: 'right'}}>{nearbyAdjNodeIntopology.name}</span>
        );
      } else {
        nearbyNodeNameOrAdd = (
          <span
            role="link"
            tabIndex="0"
            className="details-link"
            style={{float: 'right'}}
            onClick={() => this.addNearbyNode(adjNodeMac, adjNodeSite)}>
            Add Node
          </span>
        );
      }

      return (
        <tr>
          <td>
            <em style={{float: 'left'}}>{adjNodeMac}</em>
            {nearbyNodeNameOrAdd}
          </td>
        </tr>
      );
    });

    // Don't show anything if no adjacencies
    if (!adjacenciesRows.length) {
      return [];
    }

    // Return table with all of the adjacencies
    return [
      <div style={{padding: '4px 0', fontWeight: 'bold'}}>
        Wired Adjacencies
      </div>,
      <table className="details-table search-nearby">
        <tbody>{adjacenciesRows}</tbody>
      </table>,
    ];
  }

  genNearbyNodeSiteRow(nearbyNode) {
    const site = nearbyNode.nearestSite;
    const siteDistance = nearbyNode.nearestSiteDistance;

    let nearestSiteRow;
    if (site === '') {
      nearestSiteRow = (
        <td>
          <em>No GPS data reported</em>
        </td>
      );
    } else {
      nearestSiteRow = (
        <td>
          <span style={{float: 'left'}}>{site}</span>
          <span
            style={{
              color: siteDistance > DISTANCE_THRESHOLD ? 'red' : 'initial',
              float: 'right',
            }}>
            {siteDistance.toFixed(3)}m away
          </span>
        </td>
      );
    }

    return (
      <tr>
        <td>Nearest Site</td>
        {nearestSiteRow}
      </tr>
    );
  }

  genNearbyNodeSnrRow(nearbyNode) {
    const {bestSnr, bestTxAngle, bestRxAngle} = nearbyNode;
    return (
      <tr>
        <td>Best SNR</td>
        <td>
          <span
            style={{
              color: bestSnr < SNR_THRESHOLD ? 'red' : 'initial',
            }}>
            {bestSnr}dB
          </span>{' '}
          @ {bestTxAngle.toFixed(3)}&deg; tx, {bestRxAngle.toFixed(3)}&deg; rx
        </td>
      </tr>
    );
  }

  genNearbyNodesRows(nearbyNodes) {
    const {onNearbyNodeUpdate} = this.props;
    const nearbyNodesRows = nearbyNodes.map(nearbyNode => {
      return (
        <div
          onMouseEnter={() => {
            onNearbyNodeUpdate(nearbyNode);
          }}
          onMouseLeave={() => {
            onNearbyNodeUpdate(null);
          }}>
          {this.genNearbyNodeHeader(nearbyNode)}
          <table className="details-table search-nearby">
            <tbody>
              {this.genNearbyNodeSiteRow(nearbyNode)}
              {this.genNearbyNodeSnrRow(nearbyNode)}
            </tbody>
          </table>
          {this.genNearbyAdjacenciesTable(nearbyNode)}
          <hr className="details-separator" />
        </div>
      );
    });

    return nearbyNodesRows;
  }

  render() {
    const {maxHeight, node, onClose, onMouseEnter, onMouseLeave} = this.props;
    const {errorMsg, isLoading, nearbyNodes} = this.state;

    let content;
    if (isLoading) {
      content = <h5>Waiting for results...</h5>;
    } else if (errorMsg) {
      content = <h5 style={{color: 'red'}}>Error: {errorMsg}</h5>;
    } else if (!nearbyNodes.length) {
      content = <h5>No nodes found.</h5>;
    } else {
      const numNodesHeader =
        nearbyNodes.length === 1
          ? 'Found 1 node nearby.'
          : `Found ${nearbyNodes.length} nodes nearby.`;
      content = (
        <div>
          <h5>{numNodesHeader}</h5>
          <hr className="details-separator" />
          {this.genNearbyNodesRows(nearbyNodes)}
        </div>
      );
    }

    return (
      <Panel
        id="SearchNearbyModal"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
        <Panel.Heading>
          <span className="details-close" onClick={onClose}>
            &times;
          </span>
          <Panel.Title componentClass="h3">Search Nearby</Panel.Title>
        </Panel.Heading>
        <Panel.Body className="details" style={{maxHeight, width: '100%'}}>
          <h3 style={{marginTop: '0px'}}>{node.name}</h3>
          <div style={{minWidth: '200px'}}>{content}</div>
          <div className="details-button-panel">
            <button
              className="graph-button"
              onClick={() => this.onSearchAgain()}>
              Search Again
            </button>
          </div>
        </Panel.Body>
      </Panel>
    );
  }
}
