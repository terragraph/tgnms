import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ipaddr from 'ipaddr.js';

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
      let linksOnline = topology.links.filter(link =>
          link.link_type == 1 && link.is_alive).length;
      let linksWireless = topology.links.filter(link =>
          link.link_type == 1).length;
      // online + online initiator
      let sectorsOnline = topology.nodes.filter(node =>
          node.status == 2 || node.status == 3).length;
      topologyTable =
        <table className="status-table" style={{
            width: '25%',
            borderLeft: '1px solid teal'
          }}>
          <tbody>
            <tr>
              <td>Sites</td>
              <td>{topology.sites.length}</td>
            </tr>
            <tr>
              <td>Sectors</td>
              <td>{sectorsOnline} / {topology.nodes.length}</td>
            </tr>
            <tr>
              <td>RF Links</td>
              <td>{linksOnline} / {linksWireless}</td>
            </tr>
          </tbody>
        </table>
    }
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
              <td>Aggregator</td>
              <td>{this.props.instance.aggregator_ip}</td>
              <td>{this.statusColor(this.props.instance.aggregator_online)}</td>
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
              <td>{this.statusColor(this.props.instance.site_coords_override,
                                    'Enabled', 'Disabled')}</td>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>
        {topologyTable}
      </div>
    );
  }
}
