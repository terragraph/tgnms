import React from 'react';
import { render } from 'react-dom';
import { Actions } from '../../constants/NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

export default class DetailsNode extends React.Component {

  constructor(props) {
    super(props);
    this.selectSite = this.selectSite.bind(this);
    this.selectLink = this.selectLink.bind(this);
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

  selectLink(linkName) {
    let link = this.props.links[linkName];
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'links',
    });
    setTimeout(function() {
      Dispatcher.dispatch({
        actionType: Actions.LINK_SELECTED,
        link: link,
        source: "map",
      });
    }.bind(this), 1);
  }

  connectToTerminal(ipv6) {
    if (ipv6 != "Not Available") {
      let myRequest = new Request('/xterm/'+ipv6, {"credentials": "same-origin"});
      window.open(myRequest.url, '_blank');
      window.focus();
    }
  }

  rebootNode(force) {
    let forceReboot = force ? "force" : "no_force";
    swal({
      title: "Are you sure?",
      text: "This action will REBOOT the node!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, reboot it!",
      closeOnConfirm: false
    },
    function(){
      let promis = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/rebootNode/' + this.props.topologyName +
            '/' + this.props.node.name + '/' + forceReboot,
          {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Reboot Request Successful!",
              text: "Response: "+response.statusText,
              type: "success"
            },
            function(){
              resolve();
            }.bind(this));
          } else {
            swal({
              title: "Failed!",
              text: "Node reboot failed\nReason: "+response.statusText,
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

  deleteNode(force) {
    let forceDelete = force ? "force" : "no_force";
    swal({
      title: "Are you sure?",
      text: "You will not be able to recover this Node!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, delete it!",
      closeOnConfirm: false
    },
    function(){
      let promis = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/delNode/' + this.props.topologyName +
            '/' + this.props.node.name + '/' + forceDelete,
          {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Node Deleted!",
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
              text: "Node deletion failed\nReason: "+response.statusText,
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

  renameNode() {
    swal({
      title: "Rename node",
      text: "New node name",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: "Node Name"
    },
    function(inputValue) {
      if (inputValue === false) return false;

      if (inputValue === "") {
        swal.showInputError("Name can't be empty");
        return false
      }

      let promise = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/renameNode/' + this.props.topologyName +
            '/' + this.props.node.name + '/' + inputValue,
          {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Node renamed",
              text: "Response: " + response.statusText,
              type: "success"
            },
            function(){
              resolve();
            }.bind(this));
          } else {
            swal({
              title: "Failed!",
              text: "Renaming node failed.\nReason: " + response.statusText,
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

  setMacAddr(force) {
    let forceSet = force ? "force" : "no_force";
    swal({
      title: "Set MAC Address!",
      text: "New MAC address:",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: "MAC Address"
    },
    function(inputValue){
      if (inputValue === false) return false;

      if (inputValue === "") {
        swal.showInputError("You need to write something!");
        return false
      }

      let promis = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/setMac/' + this.props.topologyName +
            '/' + this.props.node.name + '/' + inputValue + '/' + forceSet,
          {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Mac address set successfully!",
              text: "Response: "+response.statusText,
              type: "success"
            },
            function(){
              resolve();
            }.bind(this));
          } else {
            swal({
              title: "Failed!",
              text: "Setting MAC failed\nReason: "+response.statusText,
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
    if (!this.props.node || !this.props.node.name) {
        return (<div/>);
    }

    let linksList = [];
    Object.keys(this.props.links).map(linkName => {
      let link = this.props.links[linkName];
      if (link.link_type == 1 && (this.props.node.name == link.a_node_name || this.props.node.name == link.z_node_name)) {
        linksList.push(link);
      }
    })

    let linksRows = [];
    let index = 0;
    linksList.forEach(link => {
      if (index == 0) {
        linksRows.push(
          <tr key={link.name}>
            <td rowSpan={linksList.length} width="100px">Links</td>
            <td>
              <span className="details-link" onClick={() => {this.selectLink(link.name)}}>
                {this.statusColor(link.is_alive, link.name, link.name)}
              </span>
            </td>
          </tr>);
      } else {
        linksRows.push(
          <tr key={link.name}>
            <td>
              <span className="details-link" onClick={() => {this.selectLink(link.name)}}>
                {this.statusColor(link.is_alive, link.name, link.name)}
              </span>
            </td>
          </tr>);
      }
      index++;
    })

    var ipv6 = this.props.node.status_dump ? this.props.node.status_dump.ipv6Address :
                                  'Not Available';
    let type = this.props.node.node_type == 2 ? 'DN' : 'CN';
    type += this.props.node.pop_node ? '-POP' : '';

    return (
      <div
        id="myModal"
        className="details"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}
      >
        <div className="details-content">
          <div className="details-header">
            <span className="details-close" onClick={() => {this.props.onClose()}}>&times;</span>
            <h3 style={{marginTop: "0px"}}>
              {this.props.node.pending ? '(Pending) ' : ''}Node Details
            </h3>
          </div>
          <div className="details-body" style={{maxHeight: this.props.maxHeight}}>
            <table className="details-table" style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td colSpan="2">
                    <h4>{this.props.node.name}</h4>
                  </td>
                </tr>
                <tr>
                  <td width="100px">MAC</td>
                  <td>{this.props.node.mac_addr}</td>
                </tr>
                <tr>
                  <td width="100px">IPv6</td>
                  <td>{ipv6}</td>
                </tr>
                <tr>
                  <td width="100px">Type</td>
                  <td>{type}</td>
                </tr>
                <tr>
                  <td width="100px">Site</td>
                  <td>
                    <span className="details-link" onClick={() => {this.selectSite(this.props.node.site_name)}}>{this.props.node.site_name}</span>
                  </td>
                </tr>
                {linksRows}
                <tr>
                  <td colSpan="2">
                    <h4>Actions</h4>
                  </td>
                </tr>
                <tr>
                  <td colSpan="2">
                    <div><span className="details-link" onClick={() => {this.setMacAddr(false)}}>Set Mac Address</span>
                         <span className="details-link" style={{float: 'right'}} onClick={() => {this.setMacAddr(true)}}>(forced)</span></div>
                    <div><span className="details-link" onClick={() => {this.connectToTerminal(ipv6)}}>Connect To Terminal</span></div>
                    <div><span className="details-link" onClick={() => {this.rebootNode(false)}}>Reboot Node</span>
                         <span className="details-link" style={{float: 'right'}} onClick={() => {this.rebootNode(true)}}>(forced)</span></div>
                    <div><span className="details-link" onClick={() => {this.deleteNode(false)}}>Delete Node</span>
                         <span className="details-link" style={{float: 'right'}} onClick={() => {this.deleteNode(true)}}>(forced)</span></div>
                    <div><span className="details-link" onClick={this.renameNode.bind(this)}>Rename Node</span></div>
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
