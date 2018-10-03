/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  availabilityColor,
  chartColor,
  polarityColor,
  versionSlicer,
  getPolarityString,
} from '../../helpers/NetworkHelpers.js';
import {ChartColors} from '../../constants/NetworkConstants.js';
import {NodeType} from '../../../thrift/gen-nodejs/Topology_types';
import {Panel} from 'react-bootstrap';
import PieChart from 'react-svg-piechart';
import React from 'react';

export default class DetailsTopology extends React.Component {
  state = {
    expandedVersion: null,
  };

  handleMouseEnterOnSector(sector) {
    this.setState({expandedVersion: sector});
  }

  render() {
    const versionCounts = {};
    let totalReported = 0;
    this.props.topology.nodes.forEach(node => {
      if (
        node.hasOwnProperty('status_dump') &&
        node.status_dump.hasOwnProperty('version')
      ) {
        const version = node.status_dump.version;
        if (!versionCounts.hasOwnProperty(version)) {
          versionCounts[version] = 0;
        }
        versionCounts[version]++;
        totalReported++;
      }
    });
    let i = 0;
    const versionData = [];
    Object.keys(versionCounts)
      .sort()
      .forEach(version => {
        const count = versionCounts[version];
        versionData.push({
          color: chartColor(ChartColors, i),
          label: versionSlicer(version),
          value: count,
        });
        i++;
      });
    // average availability of all links across site
    let alivePercAvg = 0;
    let wirelessLinksCount = 0;
    // split availability metrics by dn/cn
    const alivePercByNodeType = {};
    Object.keys(this.props.links).forEach(linkName => {
      const link = this.props.links[linkName];
      if (link.link_type != 1) {
        // only wireless links
        return;
      }
      // skip links where mac is not defined on both sides
      if (
        !this.props.nodes.hasOwnProperty(link.a_node_name) ||
        !this.props.nodes.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }
      const nodeA = this.props.nodes[link.a_node_name];
      const nodeZ = this.props.nodes[link.z_node_name];
      if (
        nodeA.mac_addr == null ||
        nodeZ.mac_addr == null ||
        !nodeA.mac_addr.length ||
        !nodeZ.mac_addr.length
      ) {
        return;
      }
      let alivePerc = 0;
      if (link.hasOwnProperty('alive_perc')) {
        alivePerc = parseInt(link.alive_perc * 1000, 10) / 1000.0;
      }
      // link availability by node type
      const nodeType =
        nodeA.node_type === NodeType.CN || nodeZ.node_type === NodeType.CN
          ? NodeType.CN
          : NodeType.DN;
      if (!alivePercByNodeType.hasOwnProperty(nodeType)) {
        alivePercByNodeType[nodeType] = [];
      }
      alivePercByNodeType[nodeType].push(alivePerc);
      // global link availability
      alivePercAvg += alivePerc;
      wirelessLinksCount++;
    });

    const nodeTypes = {};
    const polarities = {};
    // { site name, polarity }
    const polarityBySite = {};
    this.props.topology.nodes.forEach(node => {
      // calculate # of dns, cns
      if (!nodeTypes.hasOwnProperty(node.node_type)) {
        nodeTypes[node.node_type] = 0;
      }
      nodeTypes[node.node_type]++;
      // polarities
      let nodePolarity = node.polarity;
      // replace undefined polarities
      if (nodePolarity == undefined || nodePolarity == null) {
        nodePolarity = 0;
      }
      if (!polarities.hasOwnProperty(nodePolarity)) {
        polarities[nodePolarity] = 0;
      }
      polarities[nodePolarity]++;
      // polarity by site
      if (!polarityBySite.hasOwnProperty(node.site_name)) {
        polarityBySite[node.site_name] = nodePolarity;
      } else {
        polarityBySite[node.site_name] =
          polarityBySite[node.site_name] != nodePolarity
            ? 3 /* HYBRID */
            : nodePolarity;
      }
    });
    alivePercAvg /= wirelessLinksCount;
    alivePercAvg = parseInt(alivePercAvg * 1000, 10) / 1000.0;

    const nodeTypeRows = Object.keys(nodeTypes).map((nodeType, nodeIndex) => {
      let nodeTypeName = 'Unknown';
      if (nodeType == NodeType.CN) {
        nodeTypeName = 'CN';
      } else if (nodeType == NodeType.DN) {
        nodeTypeName = 'DN';
      } else {
        nodeTypeName = 'Unknown';
      }
      const nodeTypeCount = nodeTypes[nodeType];
      const nodeTypeCountPerc = parseInt(
        (nodeTypeCount / this.props.topology.nodes.length) * 100,
        10,
      );
      let nodeAlivePerc = 0;
      if (alivePercByNodeType.hasOwnProperty(nodeType)) {
        // sum all individual availability
        nodeAlivePerc = alivePercByNodeType[nodeType].reduce(
          (a, b) => a + b,
          0,
        );
        // divide by # of links
        nodeAlivePerc /= alivePercByNodeType[nodeType].length;
      }
      return (
        <tr key={'nodeType-' + nodeType}>
          {nodeIndex == 0 ? (
            <td width="150px" rowSpan={Object.keys(nodeTypes).length}>
              Node Types
            </td>
          ) : (
            ''
          )}
          <td>{nodeTypeName}</td>
          <td>
            {nodeTypeCount} ({nodeTypeCountPerc}%)
          </td>
          <td>
            <span style={{color: availabilityColor(nodeAlivePerc)}}>
              {nodeAlivePerc > 0
                ? parseInt(nodeAlivePerc * 1000, 10) / 1000.0
                : '0'}
            </span>
          </td>
        </tr>
      );
    });
    // compute polarity by site
    const polarityCountBySite = {};
    Object.values(polarityBySite).forEach(polarity => {
      if (!polarityCountBySite.hasOwnProperty(polarity)) {
        polarityCountBySite[polarity] = 0;
      }
      polarityCountBySite[polarity]++;
    });
    const ruckusApRows = [];
    let totalRuckusAps = 0;
    let totalRuckusClients = 0;
    this.props.topology.sites.forEach(site => {
      if (site.hasOwnProperty('ruckus')) {
        totalRuckusAps++;
        totalRuckusClients += site.ruckus.clientCount;
      }
    });
    // show the stats for aps matched to sites
    // we need to reconcile aps not matched to sites somewhere else
    if (totalRuckusAps) {
      ruckusApRows.push(
        <tr key="ruckus_ap_row">
          <td>Ruckus AP</td>
          <td>{totalRuckusAps} aps</td>
          <td colSpan={2}>{totalRuckusClients} clients</td>
        </tr>,
      );
    }
    const polarityBySiteRows = Object.keys(polarityCountBySite).map(
      (polarity, index) => {
        polarity = parseInt(polarity, 10);
        const polarityName = getPolarityString(polarity);
        const polarityCount = polarityCountBySite[polarity];
        const polarityCountPerc = parseInt(
          (polarityCount / this.props.topology.sites.length) * 100,
          10,
        );
        return (
          <tr key={'polarityBySite-' + polarity}>
            {index == 0 ? (
              <td
                width="150px"
                rowSpan={Object.keys(polarityCountBySite).length}>
                Polarities (Site)
              </td>
            ) : null}
            <td>
              <span style={{color: polarityColor(polarity)}}>
                {polarityName}
              </span>
            </td>
            <td colSpan={2}>
              {polarityCount} ({polarityCountPerc}%)
            </td>
          </tr>
        );
      },
    );
    const polarityRows = Object.keys(polarities).map((polarity, index) => {
      polarity = parseInt(polarity, 10);
      const polarityName = getPolarityString(polarity);
      const polarityCount = polarities[polarity];
      const polarityCountPerc = parseInt(
        (polarityCount / this.props.topology.nodes.length) * 100,
        10,
      );
      return (
        <tr key={'polarity-' + polarity}>
          {index == 0 ? (
            <td width="150px" rowSpan={Object.keys(polarities).length}>
              Polarities (Sector)
            </td>
          ) : null}
          <td>
            <span style={{color: polarityColor(polarity)}}>{polarityName}</span>
          </td>
          <td colSpan={2}>
            {polarityCount} ({polarityCountPerc}%)
          </td>
        </tr>
      );
    });
    const versionPieChart = (
      <PieChart
        data={versionData}
        shrinkOnTouchEnd
        onSectorHover={this.handleMouseEnterOnSector.bind(this)}
        expandOnHover
      />
    );
    const versionRows = versionData.map((element, i) => {
      const versionPerc =
        element.value > 0
          ? parseInt((parseInt(element.value, 10) / totalReported) * 100, 10)
          : 0;
      return (
        <tr key={i}>
          {i == 0 ? (
            <td key="versionPieChart" rowSpan={versionData.length}>
              {versionPieChart}
            </td>
          ) : null}
          <td key={i} style={{color: element.color}} colSpan={2}>
            <span
              style={{
                fontWeight: this.state.expandedVersion === i ? 'bold' : null,
              }}>
              {element.label}
            </span>
          </td>
          <td>
            <span
              style={{
                fontWeight: this.state.expandedVersion === i ? 'bold' : null,
              }}>
              {element.value} ({versionPerc}%)
            </span>
          </td>
        </tr>
      );
    });
    return (
      <Panel
        bsStyle="primary"
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        <Panel.Heading>
          <span
            className="details-close"
            onClick={() => {
              this.props.onClose();
            }}>
            &times;
          </span>
          <Panel.Title componentClass="h3">Overview</Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          <table className="details-table">
            <tbody>
              <tr>
                <td width="150px">Availability (24 Hours)</td>
                <td colSpan={3}>
                  <span style={{color: availabilityColor(alivePercAvg)}}>
                    {wirelessLinksCount ? alivePercAvg + '%' : 'No Data'}
                  </span>
                </td>
              </tr>
              {ruckusApRows}
              {nodeTypeRows}
              {polarityRows}
              {polarityBySiteRows}
              {versionRows}
            </tbody>
          </table>
        </Panel.Body>
      </Panel>
    );
  }
}
