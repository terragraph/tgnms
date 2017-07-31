import React from 'react';
import { render } from 'react-dom';
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import { availabilityColor, polarityColor } from './NetworkHelper.js';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

export default class DetailsSite extends React.Component {

  constructor(props) {
    super(props);
    this.selectLink = this.selectLink.bind(this);
  }

  statusColor(onlineStatus, trueText = 'True', falseText = 'False') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
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

  deleteSite() {
    swal({
      title: "Are you sure?",
      text: "You will not be able to recover this Site!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, delete it!",
      closeOnConfirm: false
    },
    function(){
      let promis = new Promise((resolve, reject) => {
        let exec = new Request(
          '/controller\/delSite/' + this.props.topologyName +
            '/' + this.props.site.name,
          {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Site Deleted!",
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
              text: "Site deletion failed\nReason: "+response.statusText,
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
    if (!this.props.site || !this.props.site.name) {
        return (<div/>);
    }

    let nodesList = [];
    let linksList = [];
    // TODO: - wow this is inefficient
    Object.keys(this.props.nodes).map(nodeName => {
      let node = this.props.nodes[nodeName];
      if (node.site_name == this.props.site.name) {
        nodesList.push(node);

        Object.keys(this.props.links).map(linkName => {
          let link = this.props.links[linkName];
          if (link.link_type == 1 &&
              (nodeName == link.a_node_name || nodeName == link.z_node_name)) {
            // one of our links, calculate the angle of the location
            // we should know which one is local and remote for the angle
            linksList.push(link);
          }
        })
      }
    });

    let nodesRows = [];
    let index = 0;
    nodesList.forEach(node => {
      let headerColumn = (
        <td rowSpan={nodesList.length} colSpan="1" width="100px">Nodes</td>
      );
      nodesRows.push(
        <tr key={node.name}>
          {index == 0 ? headerColumn : ""}
          <td>
            <span className="details-link" onClick={() => {this.selectNode(node.name)}}>
              {this.statusColor(node.status == 2 || node.status == 3, node.name, node.name)}
            </span>
          </td>
          <td>
            {node.node_type == 1 ? 'CN' : 'DN'}
          </td>
          <td>
            {node.is_primary ? 'Primary' : 'Secondary'}
          </td>
          <td>
            <span style={{color: polarityColor(node.polarity)}}>
              {node.polarity == 1 ? 'Odd' : 'Even'}
            </span>
          </td>
        </tr>);
      index++;
    });

    // average availability of all links across site
    let alivePercAvg = 0;
    let linksRows = [];
    index = 0;
    // show link availability average
    linksList.forEach(link => {
      let alivePerc = 0;
      if (link.hasOwnProperty("alive_perc")) {
        alivePerc = parseInt(link.alive_perc * 1000) / 1000.0;
      }
      alivePercAvg += alivePerc;
      if (index == 0) {
        linksRows.push(
          <tr key={link.name}>
            <td rowSpan={linksList.length} width="100px">Links</td>
            <td>
              <span className="details-link" onClick={() => {this.selectLink(link.name)}}>
                {this.statusColor(link.is_alive, link.name, link.name)}
              </span>
            </td>
            <td>
              <span style={{color: availabilityColor(alivePerc)}}>
                {alivePerc}%
              </span>
            </td>
            <td>
              <span>
                {(parseInt(link.angle * 100) / 100)}&deg;
              </span>
            </td>
            <td>
              <span>
                {(parseInt(link.distance * 100) / 100)} m
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
            <td>
              <span style={{color: availabilityColor(alivePerc)}}>
                {alivePerc}%
              </span>
            </td>
            <td>
              <span>
                {(parseInt(link.angle * 100) / 100)}&deg;
              </span>
            </td>
            <td>
              <span>
                {(parseInt(link.distance * 100) / 100)} m
              </span>
            </td>
          </tr>);
      }
      index++;
    });
    alivePercAvg /= linksList.length;
    alivePercAvg = parseInt(alivePercAvg * 1000) / 1000.0;

    return (
      <div id="myModal" className="details">
        <div className="details-content">
          <div className="details-header">
            <span className="details-close" onClick={() => {this.props.onClose()}}>&times;</span>
            <h3 style={{marginTop: "0px"}}>Site Details</h3>
          </div>
          <div className="details-body">
            <table className="details-table" style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td colSpan="5"><h4>{this.props.site.name}</h4></td>
                </tr>
                <tr>
                  <td width="100px">Latitude</td>
                  <td colSpan="4">{this.props.site.location.latitude}</td>
                </tr>
                <tr>
                  <td width="100px">Longitude</td>
                  <td colSpan="4">{this.props.site.location.longitude}</td>
                </tr>
                <tr>
                  <td width="100px">Altitude</td>
                  <td colSpan="4">{this.props.site.location.altitude}</td>
                </tr>
                {nodesRows}
                {linksRows}
                <tr>
                  <td width="100px">Availability</td>
                  <td colSpan="4">
                    <span style={{color: availabilityColor(alivePercAvg)}}>
                      {alivePercAvg}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan="5">
                    <h4>Actions</h4>
                  </td>
                </tr>
                <tr>
                  <td colSpan="5">
                    <div><span className="details-link" onClick={() => {this.deleteSite()}}>Delete Site</span></div>
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
