/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import ipaddr from 'ipaddr.js';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import {render} from 'react-dom';
import React from 'react';

export default class NetworkStatusTable extends React.Component {
  constructor(props) {
    super(props);
  }

  statusColor(onlineStatus, trueText = 'Online', falseText = 'Offline') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
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
        <table
          className="status-table"
          style={{
            width: '25%',
            borderLeft: '1px solid teal',
          }}>
          <tbody>
            <tr>
              <td>Sites</td>
              <td>{topology.sites.length}</td>
            </tr>
            <tr>
              <td>Sectors</td>
              <td>
                {sectorsOnline} / {topology.nodes.length}
              </td>
            </tr>
            <tr>
              <td>RF Links</td>
              <td>
                {linksOnline} / {linksWireless}
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
    let controllerErrorRow;
    if (this.props.instance.hasOwnProperty('controller_error')) {
      controllerErrorRow = (
        <tr>
          <td>Controller Error</td>
          <td colSpan="2" style={{fontWeight: 'bold', color: 'red'}}>
            {this.props.instance.controller_error}
          </td>
        </tr>
      );
    }
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
    let i = 0;
    Object.keys(versionCounts).forEach(version => {
      const count = versionCounts[version];
      const versionHeader = (
        <td rowSpan={Object.keys(versionCounts).length}>Node Versions</td>
      );
      nodeVersions.push(
        <tr key={version}>
          {i == 0 ? versionHeader : null}
          <td>{version}</td>
          <td>
            {parseInt(count / totalReported * 100)}% ({count})
          </td>
        </tr>,
      );
      i++;
    });
    return (
      <div style={{marginLeft: '10px', marginRight: '10px'}}>
        <table className="status-table" style={{width: '75%'}}>
          <tbody>
            <tr>
              <td>Controller</td>
              <td>{this.props.instance.controller_ip}</td>
              <td>{this.statusColor(this.props.instance.controller_online)}</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td>{this.props.instance.controller_version}</td>
              <td>&nbsp;</td>
            </tr>
            {controllerErrorRow}
            <tr>
              <td>Query Service</td>
              <td>-</td>
              <td>
                {this.statusColor(this.props.instance.query_service_online)}
              </td>
            </tr>
            <tr>
              <td>Latitude</td>
              <td>{this.props.instance.latitude}</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>Longitude</td>
              <td>{this.props.instance.longitude}</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>Initial Zoom Level</td>
              <td>{this.props.instance.zoom_level}</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>Site Coordinates Override</td>
              <td>
                {this.statusColor(
                  this.props.instance.site_coords_override,
                  'Enabled',
                  'Disabled',
                )}
              </td>
              <td>&nbsp;</td>
            </tr>
            {nodeVersions}
          </tbody>
        </table>
        {topologyTable}
      </div>
    );
  }
}
