import React from 'react';
import { render } from 'react-dom';
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

export default class DetailsLink extends React.Component {

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

  changeLinkStatus(upDown) {
    let status = upDown ? "up" : "down";
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
            '/' + this.props.link.a_node_name +
            '/' + this.props.link.z_node_name + '/' + status,
          {"credentials": "same-origin"});
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
          {"credentials": "same-origin"});
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

  render() {
    if (!this.props.link || !this.props.link.name) {
        return (<div/>);
    }

    let nodeA = this.props.nodes[this.props.link.a_node_name];
    let nodeZ = this.props.nodes[this.props.link.z_node_name];
    let siteA = nodeA ? nodeA.site_name : "Unkown Site";
    let siteZ = nodeZ ? nodeZ.site_name : "Unkown Site";

    let linkupAttempts = 0;
    if (this.props.link.linkup_attempts && this.props.link.linkup_attempts.buffer) {
      const buf = Buffer.from(this.props.link.linkup_attempts.buffer.data);
      linkupAttempts = parseInt(buf.readUIntBE(0, 8).toString());
    }
    return (
      <div id="myModal" className="details">
        <div className="details-content">
          <div className="details-header">
            <span className="details-close" onClick={() => {this.props.onClose()}}>&times;</span>
            <h3 style={{marginTop: "0px"}}>Link Details</h3>
          </div>
          <div className="details-body">
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
                  <td colSpan="3">
                    <h4>Actions</h4>
                  </td>
                </tr>
                <tr>
                  <td colSpan="3">
                    <div><span className="details-link" onClick={() => {this.changeLinkStatus(true)}}>Send Link Up</span></div>
                    <div><span className="details-link" onClick={() => {this.changeLinkStatus(false)}}>Send Link Down</span></div>
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
