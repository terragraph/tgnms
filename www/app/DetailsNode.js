import React from 'react';
import { render } from 'react-dom';
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
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
              title: "Deleted!",
              text: "Node deleted successfully",
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
      <div id="myModal" className="details">
        <div className="details-content">
          <div className="details-header">
            <span className="details-close" onClick={() => {this.props.onClose()}}>&times;</span>
            <h3 style={{marginTop: "0px"}}>Node Details</h3>
          </div>
          <div className="details-body">
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
                    <div><span className="details-link" onClick={() => {this.connectToTerminal(ipv6)}}>Connect To Terminal</span></div>
                    <div><span className="details-link" onClick={() => {this.deleteNode(false)}}>Delete Node</span></div>
                    <div><span className="details-link" onClick={() => {this.deleteNode(true)}}>Delete Node (Force)</span></div>
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
