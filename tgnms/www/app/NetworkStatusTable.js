/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import ipaddr from 'ipaddr.js';
import {Table} from 'react-bootstrap';
import {render} from 'react-dom';
import React from 'react';

export default class NetworkStatusTable extends React.Component {
  statusColor(onlineStatus, trueText = 'Online', falseText = 'Offline') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
  }

  _getNodeVersions() {
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
            {count} ({parseInt((count / totalReported) * 100)}%)
          </td>
        </tr>,
      );
    });
    return nodeVersions;
  }

  render() {
    let topologyTable;
    if (this.props.instance.topology) {
      const topology = this.props.instance.topology;
      const linksOnline = topology.links.filter(
        link => link.link_type == 1 && link.is_alive,
      ).length;
      const linksWireless = topology.links.filter(link => link.link_type == 1)
        .length;
      // online + online initiator
      const sectorsOnline = topology.nodes.filter(
        node => node.status == 2 || node.status == 3,
      ).length;
      topologyTable = (
        <Table condensed hover>
          <tbody>
            <tr>
              <td>Sectors Online</td>
              <td>
                {sectorsOnline} / {topology.nodes.length}
              </td>
            </tr>
            <tr>
              <td>RF Links Online</td>
              <td>
                {linksOnline} / {linksWireless}
              </td>
            </tr>
            <tr>
              <td>Total Sites</td>
              <td>{topology.sites.length}</td>
            </tr>
          </tbody>
        </Table>
      );
    }

    let controllerErrorRow;
    if (this.props.instance.hasOwnProperty('controller_error')) {
      controllerErrorRow = (
        <tr>
          <td>
            <strong>Controller Error</strong>
          </td>
          <td colSpan={2} style={{fontWeight: 'bold', color: 'red'}}>
            {this.props.instance.controller_error}
          </td>
        </tr>
      );
    }

    const nodeVersions = this._getNodeVersions();

    return (
      <div className="status-table-container">
        <div class="status-table status-table-left">
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
              {controllerErrorRow}
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
            <h3>Node Versions</h3>,
            <Table condensed hover>
              <tbody>{nodeVersions}</tbody>
            </Table>,
          ]}
        </div>
        <div class="status-table status-table-right">
          <h3>Topology</h3>
          {topologyTable}
        </div>
      </div>
    );
  }
}
