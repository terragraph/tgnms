import React from "react";
import { render } from "react-dom";
import { Actions } from "../../constants/NetworkConstants.js";
import Dispatcher from "../../NetworkDispatcher.js";
import { availabilityColor, polarityColor, uptimeSec } from "../../NetworkHelper.js";
import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

export default class DetailsSite extends React.Component {
  constructor(props) {
    super(props);
    this.selectLink = this.selectLink.bind(this);
    this.state = {
      showNodes: true,
      showLinks: true,
      showRuckus: true,
      showActions: true,
    }
  }

  statusColor(onlineStatus, trueText = "True", falseText = "False") {
    return (
      <span style={{ color: onlineStatus ? "forestgreen" : "firebrick" }}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
  }

  selectLink(linkName) {
    let link = this.props.links[linkName];
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: "links"
    });
    setTimeout(
      function() {
        Dispatcher.dispatch({
          actionType: Actions.LINK_SELECTED,
          link: link,
          source: "map"
        });
      }.bind(this),
      1
    );
  }

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: "nodes"
    });
    setTimeout(
      function() {
        Dispatcher.dispatch({
          actionType: Actions.NODE_SELECTED,
          nodeSelected: nodeName,
          source: "map"
        });
      }.bind(this),
      1
    );
  }

  addSite() {
    let newSite = {
      name: this.props.site.name,
      lat: this.props.site.location.latitude,
      long: this.props.site.location.longitude,
      alt: this.props.site.location.altitude
    };
    let postData = {
      topology: this.props.topologyName,
      newSite: newSite
    };
    swal(
      {
        title: "Are you sure?",
        text: "You are adding a site to this topology!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, add it!",
        closeOnConfirm: false
      },
      function() {
        var request = new XMLHttpRequest();
        request.onload = function() {
          if (!request) {
            return;
          }
          if (request.status == 200) {
            swal({
              title: "Site Added!",
              text: "Response: " + request.statusText,
              type: "success"
            });
          } else {
            swal({
              title: "Failed!",
              text: "Adding a site failed\nReason: " + request.statusText,
              type: "error"
            });
          }
        }.bind(this);
        try {
          request.open("POST", "/controller/addSite", true);
          request.send(JSON.stringify(postData));
        } catch (e) {}
      }.bind(this)
    );
  }

  renameSite() {
    swal(
      {
        title: "Rename site",
        text: "New site name",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "Site Name"
      },
      function(inputValue) {
        if (inputValue === false) return false;

        if (inputValue === "") {
          swal.showInputError("Name can't be empty");
          return false;
        }

        let promise = new Promise((resolve, reject) => {
          let exec = new Request(
            "/controller/renameSite/" +
              this.props.topologyName +
              "/" +
              this.props.site.name +
              "/" +
              inputValue,
            { credentials: "same-origin" }
          );
          fetch(exec).then(
            function(response) {
              if (response.status == 200) {
                swal(
                  {
                    title: "Site renamed",
                    text: "Response: " + response.statusText,
                    type: "success"
                  },
                  function() {
                    resolve();
                  }.bind(this)
                );
              } else {
                swal(
                  {
                    title: "Failed!",
                    text:
                      "Renaming site failed.\nReason: " + response.statusText,
                    type: "error"
                  },
                  function() {
                    resolve();
                  }.bind(this)
                );
              }
            }.bind(this)
          );
        });
      }.bind(this)
    );
  }

  deleteSite() {
    swal(
      {
        title: "Are you sure?",
        text: "You will not be able to recover this Site!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: false
      },
      function() {
        let promis = new Promise((resolve, reject) => {
          let exec = new Request(
            "/controller/delSite/" +
              this.props.topologyName +
              "/" +
              this.props.site.name,
            { credentials: "same-origin" }
          );
          fetch(exec).then(
            function(response) {
              if (response.status == 200) {
                swal(
                  {
                    title: "Site Deleted!",
                    text: "Response: " + response.statusText,
                    type: "success"
                  },
                  function() {
                    Dispatcher.dispatch({
                      actionType: Actions.CLEAR_NODE_LINK_SELECTED
                    });
                    resolve();
                  }.bind(this)
                );
              } else {
                swal(
                  {
                    title: "Failed!",
                    text:
                      "Site deletion failed\nReason: " + response.statusText,
                    type: "error"
                  },
                  function() {
                    resolve();
                  }.bind(this)
                );
              }
            }.bind(this)
          );
        });
      }.bind(this)
    );
  }

  formatGolay(golayIdx) {
    if (golayIdx) {
      return Buffer.from(golayIdx.buffer.data).readUIntBE(0, 8);
    } else {
      return "N/A";
    }
  }

  genNodeType(nodeType, isPrimary) {
    let type = nodeType == 1 ? "CN " : "DN ";
    type += isPrimary ? "(Primary)" : "(Secondary)"
    return type;
  }

  onHeadingClick(showTable) {
    let show = this.state[showTable]
    this.setState({[showTable]: !show});
  }

  render() {
    if (!this.props.site || !this.props.site.name) {
      return <div />;
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
          if (
            link.link_type == 1 &&
            (nodeName == link.a_node_name || nodeName == link.z_node_name)
          ) {
            // one of our links, calculate the angle of the location
            // we should know which one is local and remote for the angle
            linksList.push(link);
          }
        });
      }
    });

    let nodesRows = [];
    nodesList.forEach(node => {
      let headerColumn = (
        <td rowSpan={nodesList.length} colSpan="1" width="100px">
          Nodes
        </td>
      );
      let txGolayIdx = null;
      let rxGolayIdx = null;
      if (node.golay_idx) {
        txGolayIdx = node.golay_idx.txGolayIdx;
        rxGolayIdx = node.golay_idx.rxGolayIdx;
      }
      nodesRows.push(
        <tr key={node.name}>
          <td>
            <span
              className="details-link"
              onClick={() => {
                this.selectNode(node.name);
              }}
            >
              {this.statusColor(
                node.status == 2 || node.status == 3,
                node.name,
                node.name
              )}
            </span>
          </td>
          <td>{this.genNodeType(node.node_type, node.is_primary)}</td>
          <td>
            <span style={{ color: polarityColor(node.polarity) }}>
              {node.polarity == 1
                ? "Odd"
                : node.polarity == 2 ? "Even" : "Not Set"}
            </span>
          </td>
          <td title="txGolayIdx">{this.formatGolay(txGolayIdx)}</td>
          <td title="rxGolayIdx">{this.formatGolay(rxGolayIdx)}</td>
        </tr>
      );
    });

    // average availability of all links across site
    let alivePercAvg = 0;
    let linksRows = [];
    // show link availability average
    linksList.forEach(link => {
      let alivePerc = 0;
      if (link.hasOwnProperty("alive_perc")) {
        alivePerc = parseInt(link.alive_perc * 1000) / 1000.0;
      }
      alivePercAvg += alivePerc;
      linksRows.push(
        <tr key={link.name}>
          <td>
            <span
              className="details-link"
              onClick={() => {
                this.selectLink(link.name);
              }}
            >
              {this.statusColor(link.is_alive, link.name, link.name)}
            </span>
          </td>
          <td>
            <span style={{ color: availabilityColor(alivePerc) }}>
              {alivePerc}%
            </span>
          </td>
          <td>
            <span>{parseInt(link.angle * 100) / 100}&deg;</span>
          </td>
          <td>
            <span>{parseInt(link.distance * 100) / 100} m</span>
          </td>
        </tr>
      );
    });
    let ruckusRows = [];
    if (this.props.site.hasOwnProperty('ruckus')) {
      ruckusRows.push(
        <tr key="ruckus">
          <td>Ruckus AP</td>
          <td>{this.props.site.ruckus.clientCount} clients</td>
          <td>{uptimeSec(this.props.site.ruckus.uptime)}</td>
          <td>{this.props.site.ruckus.connectionState}</td>
          <td>{this.props.site.ruckus.registrationState}</td>
        </tr>
      );
    }
    alivePercAvg /= linksList.length;
    alivePercAvg = parseInt(alivePercAvg * 1000) / 1000.0;
    let actionsList = [];
    if (this.props.site.hasOwnProperty("pending") && this.props.site.pending) {
      actionsList.push(
        <tr>
          <td>
            <span
              className="details-link"
              onClick={() => {
                this.addSite();
              }}
            >
              Add Site
            </span>
          </td>
        </tr>
      );
    } else {
      actionsList.push(
        <tr>
          <td>
            <div>
              <span
                className="details-link"
                onClick={() => {
                  this.deleteSite();
                }}
              >
                Delete Site
              </span>
            </div>
          </td>
        </tr>
      );
      actionsList.push(
        <tr>
          <td>
            <div>
              <span
                className="details-link"
                onClick={() => {
                  this.renameSite();
                }}
              >
                Rename Site
              </span>
            </div>
          </td>
        </tr>
      );
    }
    return (
      <div
        id="myModal"
        className="details"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}
      >
        <div className="details-content">
          <div className="details-header">
            <span
              className="details-close"
              onClick={() => {
                this.props.onClose();
              }}
            >
              &times;
            </span>
            <h3>
              {this.props.site.pending ? "(Pending) " : ""}Site Details
            </h3>
          </div>
          <div
            className="details-body"
            style={{ maxHeight: this.props.maxHeight }}
          >
            <div>
              <h3>{this.props.site.name}</h3>
              <table className="details-table" style={{ width: "100%", border: "0px solid black" }}>
                <tbody>
                  <tr>
                    <td width="100px">Lat / Lng</td>
                    <td colSpan="2">{this.props.site.location.latitude} / {this.props.site.location.longitude}</td>
                  </tr>
                  <tr>
                    <td width="100px">Altitude</td>
                    <td colSpan="3">{this.props.site.location.altitude} m</td>
                  </tr>
                  <tr>
                    <td width="100px">Availability</td>
                    <td colSpan="6">
                      <span style={{ color: availabilityColor(alivePercAvg) }}>
                        {alivePercAvg}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 onClick={() => {this.onHeadingClick("showNodes")}}>Nodes</h4>
              {this.state.showNodes &&
                <table className="details-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Polarity</th>
                      <th>Tx Golay</th>
                      <th>Rx Golay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodesRows}
                  </tbody>
                </table>
              }
            </div>
            <div>
              <h4 onClick={() => {this.onHeadingClick("showLinks")}}>Links</h4>
              {this.state.showLinks &&
                <table className="details-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Availability</th>
                      <th>Azimuth</th>
                      <th>Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linksRows}
                  </tbody>
                </table>
              }
            </div>
            {ruckusRows.length > 0 &&
              <div>
                <h4 onClick={() => {this.onHeadingClick("showRuckus")}}>Ruckus</h4>
                {this.state.showRuckus &&
                <table className="details-table" style={{ width: "100%" }}>
                  <tbody>
                    {ruckusRows}
                  </tbody>
                </table>
              }
              </div>
            }
            <div>
              <h4 onClick={() => {this.onHeadingClick("showActions")}}>Actions</h4>
              {this.state.showActions &&
                <table className="details-table" style={{ width: "100%" }}>
                  <tbody>
                    {actionsList}
                  </tbody>
                </table>
              }
            </div>

          </div>
        </div>
      </div>
    );
  }
}

// TODO Kelvin: add Proptypes here
