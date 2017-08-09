import React from 'react';
import { render } from 'react-dom';
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import { availabilityColor } from './NetworkHelper.js';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

export default class DetailsTopology extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    // average availability of all links across site
    let alivePercAvg = 0;
    let linksWithData = 0;
    let wirelessLinksCount = 0;
    Object.keys(this.props.links).forEach(linkName => {
      let link = this.props.links[linkName];
      if (link.link_type != 1) {
        // only wireless links
        return;
      }
      // skip links where mac is not defined on both sides
      if (!this.props.nodes.hasOwnProperty(link.a_node_name) ||
          !this.props.nodes.hasOwnProperty(link.z_node_name)) {
        return;
      }
      let nodeA = this.props.nodes[link.a_node_name];
      let nodeZ = this.props.nodes[link.z_node_name];
      if (nodeA.mac_addr == null || nodeZ.mac_addr == null ||
          !nodeA.mac_addr.length || !nodeZ.mac_addr.length) {
        return;
      }
      let alivePerc = 0;
      if (link.hasOwnProperty("alive_perc")) {
        alivePerc = parseInt(link.alive_perc * 1000) / 1000.0;
        linksWithData++;
      }
      wirelessLinksCount++;
      alivePercAvg += alivePerc;
    });
    alivePercAvg /= wirelessLinksCount;
    alivePercAvg = parseInt(alivePercAvg * 1000) / 1000.0;

    return (
      <div id="myModal" className="details">
        <div className="details-content">
          <div className="details-header">
            <span className="details-close" onClick={() => {this.props.onClose()}}>&times;</span>
            <h3 style={{marginTop: "0px"}}>Overview</h3>
          </div>
          <div className="details-body">
            <table className="details-table" style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td width="150px">Availability (24 Hours)</td>
                  <td>
                    <span style={{color: availabilityColor(alivePercAvg)}}>
                      {linksWithData ? alivePercAvg+'%' : 'No Data'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}
