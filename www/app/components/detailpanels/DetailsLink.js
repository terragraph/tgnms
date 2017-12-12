import React from 'react';
import { render } from 'react-dom';
import { Actions } from '../../constants/NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';
import { availabilityColor } from '../../NetworkHelper.js';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';
import ModalIgnitionState from '../../ModalIgnitionState.js';
import classnames from 'classnames';

export default class DetailsLink extends React.Component {

  state = {
    ignitionStateModalOpen: false,
  }

  constructor(props) {
    super(props);
    this.selectSite = this.selectSite.bind(this);
    this.selectNode = this.selectNode.bind(this);
    this.changeLinkStatus = this.changeLinkStatus.bind(this);
  }

  statusColor(onlineStatus, trueText = 'True', falseText = 'False') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
  }

  selectSite(siteName) {
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    setTimeout(function() {
      Dispatcher.dispatch({
        actionType: Actions.SITE_SELECTED,
        siteSelected: siteName,
      });
    }.bind(this), 1);
  }

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    setTimeout(function() {
      Dispatcher.dispatch({
        actionType: Actions.NODE_SELECTED,
        nodeSelected: nodeName,
      });
    }.bind(this), 1);
  }

  changeLinkStatus(upDown, initiatorIsAnode) {
    let status = upDown ? "up" : "down";
    let iNode = initiatorIsAnode ?
                this.props.link.a_node_name :
                this.props.link.z_node_name;
    let rNode = initiatorIsAnode ?
                this.props.link.z_node_name :
                this.props.link.a_node_name;
    swal({
      title: "Are you sure?",
      text: "This will send a link " + status + " request to e2e-controller",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, do it!",
      closeOnConfirm: false
    },
    function(){
      let promis = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/setlinkStatus/' + this.props.topologyName +
            '/' + iNode +
            '/' + rNode + '/' + status,
          {"credentials": "same-origin"}
        );
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Request successful!",
              text: "Response: "+response.statusText,
              type: "success"
            },
            function(){
              resolve();
            }.bind(this));
          } else {
            swal({
              title: "Request failed!",
              text: "Link status change failed\nReason: "+response.statusText,
              type: "error"
            },
            function(){
              resolve();
            }.bind(this));
          }
        }.bind(this));
      });
    }.bind(this));
  }

  deleteLink(force) {
    let forceDelete = force ? "force" : "no_force";
    swal({
      title: "Are you sure?",
      text: "You will not be able to recover this Link!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, delete it!",
      closeOnConfirm: false
    },
    function(){
      let promis = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/delLink/' + this.props.topologyName +
            '/' + this.props.link.a_node_name +
            '/' + this.props.link.z_node_name + '/' + forceDelete,
          {"credentials": "same-origin"}
        );
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Link Deleted!",
              text: "Response: "+response.statusText,
              type: "success"
            },
            function(){
              Dispatcher.dispatch({
                actionType: Actions.CLEAR_NODE_LINK_SELECTED
              });
              resolve();
            }.bind(this));
          } else {
            swal({
              title: "Failed!",
              text: "Link deletion failed\nReason: "+response.statusText,
              type: "error"
            },
            function(){
              resolve();
            }.bind(this));
          }
        }.bind(this));
      });
    }.bind(this));
  }

  startIPerfTraffic(src, dest) {
    var srcIP = src.status_dump && src.status_dump.ipv6Address;
    var destIP = src.status_dump && src.status_dump.ipv6Address;

    if (!srcIP || !destIP) {
      return;
    }

    swal({
      title: "Are you sure?",
      text: "This will start sending IPerf traffic from\n" + src.name + "\nto\n" + dest.name + '\n\nPlease provide a bitrate (bps):',
      type: "input",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, do it!",
      closeOnConfirm: false,
      inputPlaceholder: "Bitrate (bps)",
      inputValue: 100,
    },
    (inputValue) => {
      const bitrate = parseInt(inputValue, 10);
      if (isNaN(bitrate) || bitrate < 1) {
        swal({
          title: "Invalid bitrate!",
          text: "Please provide a valid bitrate",
          type: "error",
        });
        return;
      }
      let exec = new Request(
        '/controller\/startTraffic/' + this.props.topologyName +
        '/' + src.name +
        '/' + dest.name +
        '/' + srcIP +
        '/' + destIP +
        '/' + bitrate +  // bitrate
        '/' + 100,   // time in seconds
        {"credentials": "same-origin"}
      );
      fetch(exec).then((response) => {
        if (response.status == 200) {
          swal({
            title: "Request successful!",
            text: "Response: "+response.statusText,
            type: "success"
          });
        } else {
          swal({
            title: "Request failed!",
            text: "Starting IPerf failed \nReason: "+response.statusText,
            type: "error"
          });
        }
      });
    });
  }

  stopIPerfTraffic(node) {
    var nodeIP = node.status_dump && node.status_dump.ipv6Address;

    if (!nodeIP) {
      return;
    }

    swal({
      title: "Are you sure?",
      text: "This will stop sending IPerf traffic from " + node.name,
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, do it!",
      closeOnConfirm: false
    },
    () => {
      let exec = new Request(
        '/controller\/stopTraffic/' + this.props.topologyName +
        '/' + node.name,
        {"credentials": "same-origin"}
      );
      fetch(exec).then((response) => {
        if (response.status == 200) {
          swal({
            title: "Request successful!",
            text: "Response: "+response.statusText,
            type: "success"
          });
        } else {
          swal({
            title: "Request failed!",
            text: "Stopping IPerf failed \nReason: "+response.statusText,
            type: "error"
          });
        }
      });
    });
  }

  render() {
    if (!this.props.link || !this.props.link.name) {
      return (<div/>);
    }

    let nodeA = this.props.nodes[this.props.link.a_node_name];
    let nodeZ = this.props.nodes[this.props.link.z_node_name];
    if (!nodeA || !nodeZ) {
      return (<div/>);
    }
    let siteA = nodeA ? nodeA.site_name : "Unkown Site";
    let siteZ = nodeZ ? nodeZ.site_name : "Unkown Site";

    let linkupAttempts = 0;
    if (this.props.link.linkup_attempts && this.props.link.linkup_attempts.buffer) {
      const buf = Buffer.from(this.props.link.linkup_attempts.buffer.data);
      linkupAttempts = parseInt(buf.readUIntBE(0, 8).toString());
    }

    let ignitionStateModal = null;
    if (this.state.ignitionStateModalOpen) {
      ignitionStateModal = (
        <ModalIgnitionState
          isOpen= {true}
          onClose= {() => this.setState({ignitionStateModalOpen: false})}
          link= {this.props.link}
          topologyName= {this.props.topologyName}/>
      );
    }
    let alivePerc = 0;
    if (this.props.link.hasOwnProperty("alive_perc")) {
      alivePerc = parseInt(this.props.link.alive_perc * 1000) / 1000.0;
    }

    const IPerfEnabled =
      nodeA.status_dump &&
      nodeA.status_dump.ipv6Address &&
      nodeZ.status_dump &&
      nodeZ.status_dump.ipv6Address;
    return (
      <div
        id="myModal"
        className="details"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        {ignitionStateModal}
        <div className="details-content">
          <div className="details-header">
            <span className="details-close" onClick={() => {this.props.onClose()}}>&times;</span>
            <h3 style={{marginTop: "0px"}}>
              {this.props.link.pending ? '(Pending) ' : ''}Link Details
            </h3>
          </div>
          <div className="details-body" style={{maxHeight: this.props.maxHeight}}>
            <table className="details-table" style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td colSpan="3"><h4>{this.props.link.name}</h4></td>
                </tr>
                <tr>
                  <td width="100px">A-Node</td>
                  <td>
                    <span className="details-link" onClick={() => {this.selectNode(this.props.link.a_node_name)}}>
                      {this.statusColor(nodeA.status == 2 || nodeA.status == 3, this.props.link.a_node_name, this.props.link.a_node_name)}
                    </span>
                  </td>
                  <td>
                    <span className="details-link" onClick={() => {this.selectSite(siteA)}}>{siteA}</span>
                  </td>
                </tr>
                <tr>
                  <td width="100px">Z-Node</td>
                  <td>
                    <span className="details-link" onClick={() => {this.selectNode(this.props.link.z_node_name)}}>
                      {this.statusColor(nodeZ.status == 2 || nodeZ.status == 3, this.props.link.z_node_name, this.props.link.z_node_name)}
                    </span>
                  </td>
                  <td>
                    <span className="details-link" onClick={() => {this.selectSite(siteZ)}}>{siteZ}</span>
                  </td>
                </tr>
                <tr>
                  <td width="100px">Alive</td>
                  <td colSpan="2">{this.statusColor(this.props.link.is_alive)}</td>
                </tr>
                <tr>
                  <td width="100px">Attempts</td>
                  <td colSpan="2">{linkupAttempts}</td>
                </tr>
                <tr>
                  <td width="100px">Azimuth</td>
                  <td colSpan="2">{parseInt(this.props.link.angle * 100) / 100}&deg;</td>
                </tr>
                <tr>
                  <td width="100px">Length</td>
                  <td colSpan="2">{parseInt(this.props.link.distance * 100) / 100} m</td>
                </tr>
                <tr>
                  <td width="100px">Availability</td>
                  <td colSpan="2">
                    <span style={{color: availabilityColor(alivePerc)}}>
                      {alivePerc}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan="3">
                    <h4>Actions</h4>
                  </td>
                </tr>
                <tr>
                  <td colSpan="3">
                    <div>Send Link Up (pick initiator): <span className="details-link" onClick={() => {this.changeLinkStatus(true, true)}}>A-Node</span> &nbsp;&nbsp;
                    <span className="details-link" onClick={() => {this.changeLinkStatus(true, false)}}>Z-Node</span></div>
                    <div>Send Link Down (pick initiator): <span className="details-link" onClick={() => {this.changeLinkStatus(false, true)}}>A-Node</span> &nbsp;&nbsp;
                    <span className="details-link" onClick={() => {this.changeLinkStatus(false, false)}}>Z-Node</span></div>
                    <hr className="details-separator"/>
                    <div>Start IPerf (pick initiator):&nbsp;
                      <span
                        className={classnames('details-link', {'details-link--disabled': !IPerfEnabled})}
                        onClick={() => {this.startIPerfTraffic(nodeA, nodeZ)}}>
                        A-Node
                      </span> &nbsp;&nbsp;
                      <span
                        className={classnames('details-link', {'details-link--disabled': !IPerfEnabled})}
                        onClick={() => {this.startIPerfTraffic(nodeZ, nodeA)}}>
                        Z-Node
                      </span> &nbsp;&nbsp;
                    </div>
                    <div>Stop IPerf:&nbsp;
                      <span
                        className={classnames('details-link', {'details-link--disabled': !IPerfEnabled})}
                        onClick={() => {this.stopIPerfTraffic(nodeA)}}>
                        A-Node
                      </span> &nbsp;&nbsp;
                      <span
                        className={classnames('details-link', {'details-link--disabled': !IPerfEnabled})}
                        onClick={() => {this.stopIPerfTraffic(nodeZ)}}>
                        Z-Node
                      </span> &nbsp;&nbsp;
                    </div>
                    <hr className="details-separator"/>
                    <div><span className="details-link" onClick={() => this.setState({ignitionStateModalOpen: true})}>Check Ignition State</span></div>
                    <div><span className="details-link" onClick={() => {this.deleteLink(false)}}>Delete Link</span></div>
                    <div><span className="details-link" onClick={() => {this.deleteLink(true)}}>Delete Link (Force)</span></div>
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
