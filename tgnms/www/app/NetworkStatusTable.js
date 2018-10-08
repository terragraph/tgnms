/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  getTopologyStatusRows,
  getPolarityString,
  polarityColor,
} from './helpers/NetworkHelpers.js';
import {NodeType} from '../thrift/gen-nodejs/Topology_types';
import React from 'react';
import {Table} from 'react-bootstrap';

export default class NetworkStatusTable extends React.Component {
  statusColor(onlineStatus, trueText = 'Online', falseText = 'Offline') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
  }

  _getVersionRows() {
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

    const nodeVersions = [];
    Object.keys(versionCounts).forEach(version => {
      const count = versionCounts[version];
      nodeVersions.push(
        <tr key={version}>
          <td>{version}</td>
          <td style={{whiteSpace: 'nowrap', width: '1%'}}>
            {count} ({parseInt((count / totalReported) * 100, 10)}%)
          </td>
        </tr>,
      );
    });
    return nodeVersions;
  }

  _getTopologyInfoRows(topology) {
    // Compute topology info (node types, polarities)
    const nodeTypes = {};
    const polarities = {};
    const polarityBySite = {};
    topology.nodes.forEach(node => {
      // calculate # of DNs, CNs
      if (!nodeTypes.hasOwnProperty(node.node_type)) {
        nodeTypes[node.node_type] = 0;
      }
      nodeTypes[node.node_type]++;

      // polarities
      const nodePolarity =
        node.polarity === undefined || node.polarity === null
          ? 0
          : node.polarity;
      if (!polarities.hasOwnProperty(nodePolarity)) {
        polarities[nodePolarity] = 0;
      }
      polarities[nodePolarity]++;

      // polarity by site
      if (!polarityBySite.hasOwnProperty(node.site_name)) {
        polarityBySite[node.site_name] = nodePolarity;
      } else {
        polarityBySite[node.site_name] =
          polarityBySite[node.site_name] !== nodePolarity
            ? 3 /* HYBRID */
            : nodePolarity;
      }
    });
    const polarityCountBySite = {};
    Object.values(polarityBySite).forEach(polarity => {
      if (!polarityCountBySite.hasOwnProperty(polarity)) {
        polarityCountBySite[polarity] = 0;
      }
      polarityCountBySite[polarity]++;
    });

    // create node type rows
    const nodeTypeRows = Object.keys(nodeTypes).map((nodeType, nodeIndex) => {
      let nodeTypeName = 'Unknown';
      if (nodeType == NodeType.CN) {
        nodeTypeName = 'CN';
      } else if (nodeType == NodeType.DN) {
        nodeTypeName = 'DN';
      }
      const nodeTypeCount = nodeTypes[nodeType];
      const nodeTypeCountPerc = parseInt(
        (nodeTypeCount / this.props.topology.nodes.length) * 100,
        10,
      );
      return (
        <tr key={'nodeType-' + nodeType}>
          {nodeIndex === 0 ? (
            <td rowSpan={Object.keys(nodeTypes).length}>Node Types</td>
          ) : null}
          <td>{nodeTypeName}</td>
          <td>
            {nodeTypeCount} ({nodeTypeCountPerc}%)
          </td>
        </tr>
      );
    });

    // create polarity rows
    const polarityRows = Object.keys(polarities).map((polarity, index) => {
      polarity = parseInt(polarity, 10);
      const polarityName = getPolarityString(polarity);
      const polarityCount = polarities[polarity];
      const polarityCountPerc = parseInt(
        (polarityCount / topology.nodes.length) * 100,
        10,
      );
      return (
        <tr key={'polarity-' + polarity}>
          {index === 0 ? (
            <td rowSpan={Object.keys(polarities).length}>
              Polarities (Sector)
            </td>
          ) : null}
          <td>
            <span style={{color: polarityColor(polarity)}}>{polarityName}</span>
          </td>
          <td>
            {polarityCount} ({polarityCountPerc}%)
          </td>
        </tr>
      );
    });
    const polarityBySiteRows = Object.keys(polarityCountBySite).map(
      (polarity, index) => {
        polarity = parseInt(polarity, 10);
        const polarityName = getPolarityString(polarity);
        const polarityCount = polarityCountBySite[polarity];
        const polarityCountPerc = parseInt(
          (polarityCount / topology.sites.length) * 100,
          10,
        );
        return (
          <tr key={'polarityBySite-' + polarity}>
            {index === 0 ? (
              <td rowSpan={Object.keys(polarityCountBySite).length}>
                Polarities (Site)
              </td>
            ) : null}
            <td>
              <span style={{color: polarityColor(polarity)}}>
                {polarityName}
              </span>
            </td>
            <td>
              {polarityCount} ({polarityCountPerc}%)
            </td>
          </tr>
        );
      },
    );

    return [...nodeTypeRows, ...polarityRows, ...polarityBySiteRows];
  }

  render() {
    let topologyStatusRows;
    let topologyInfoRows;
    if (this.props.instance.topology) {
      topologyStatusRows = getTopologyStatusRows(this.props.instance.topology);
      topologyInfoRows = this._getTopologyInfoRows(
        this.props.instance.topology,
      );
    }
    const nodeVersions = this._getVersionRows();

    return (
      <div
        className="status-table-container"
        style={{height: this.props.height + 'px'}}>
        <div className="status-table status-table-left">
          <h3>Services</h3>
          <Table condensed hover>
            <tbody>
              <tr>
                <td>
                  <strong>Controller</strong>
                </td>
                <td>{this.props.instance.controller_ip}</td>
                <td style={{width: '1%'}}>
                  {this.statusColor(this.props.instance.controller_online)}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Controller Version</strong>
                </td>
                <td colSpan={2}>{this.props.instance.controller_version}</td>
              </tr>
              {this.props.instance.hasOwnProperty('controller_error') ? (
                <tr>
                  <td>
                    <strong>Controller Error</strong>
                  </td>
                  <td colSpan={2} style={{color: 'red', fontWeight: 'bold'}}>
                    {this.props.instance.controller_error}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td>
                  <strong>Query Service</strong>
                </td>
                <td>-</td>
                <td style={{width: '1%'}}>
                  {this.statusColor(this.props.instance.query_service_online)}
                </td>
              </tr>
            </tbody>
          </Table>
          {nodeVersions.length > 0 && [
            <h3 key="node-version-header">Node Versions</h3>,
            <Table key="node-version-list" condensed hover>
              <tbody>{nodeVersions}</tbody>
            </Table>,
          ]}
        </div>
        <div className="status-table status-table-right">
          {topologyStatusRows !== undefined && [
            <h3 key="topology_status_heading_status">Status</h3>,
            <Table condensed hover key="topology_status_table_status">
              <tbody>{topologyStatusRows}</tbody>
            </Table>,
          ]}
          {topologyInfoRows !== undefined && [
            <h3 key="topology_status_heading_topology">Topology</h3>,
            <Table condensed key="topology_status_table_info">
              <tbody>{topologyInfoRows}</tbody>
            </Table>,
          ]}
        </div>
      </div>
    );
  }
}
