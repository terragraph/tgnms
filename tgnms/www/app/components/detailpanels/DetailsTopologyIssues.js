import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";

import { Actions } from "../../constants/NetworkConstants.js";
import Dispatcher from "../../NetworkDispatcher.js";
import { linkLength } from "../../NetworkHelper.js";
import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

export default class DetailsTopologyIssues extends React.Component {
  // we need an easy way to lookup nodes+sites in old+new topologies
  nodesByName = {};
  newNodesByName = {};
  sitesByName = {};
  newSitesByName = {};
  remainingSites = [];

  state = {
    processing: false
  };

  constructor(props) {
    super(props);
  }

  classNameIsNew(boolVal) {
    return boolVal ? "topoDiffNew" : "topoDiffExisting";
  }

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.NODE_SELECTED,
      nodeSelected: nodeName,
      source: "detailsTopologyIssues"
    });
  }

  addSitesAsync(remainingSites) {
    if (!remainingSites.length) {
      swal({
        title: "Done adding sites!"
      });
      this.setState({ processing: false });
      return;
    }
    // fetch first site
    let siteToAdd = remainingSites.pop();
    let newSite = {
      name: siteToAdd.name,
      lat: siteToAdd.location.latitude,
      long: siteToAdd.location.longitude,
      alt: siteToAdd.location.altitude
    };
    let postData = {
      topology: this.props.topology.name,
      newSite: newSite
    };
    var request = new XMLHttpRequest();
    request.onload = function() {
      if (!request) {
        return;
      }
      if (request.status == 200) {
        this.addSitesAsync(remainingSites);
      } else {
        swal({
          title: "Failed!",
          text:
            "Adding site '" +
            siteToAdd.name +
            "' failed\nReason: " +
            request.statusText,
          type: "error"
        });
        this.setState({ processing: false });
      }
    }.bind(this);
    try {
      request.open("POST", "/controller/addSite", true);
      request.send(JSON.stringify(postData));
    } catch (e) {}
  }

  addAllSites() {
    // compute remaining sites
    swal(
      {
        title: "Add all " + this.remainingSites.length + " sites?",
        text: "This will add sites individually",
        showCancelButton: true,
        confirmButtonText: "Go!",
        closeOnConfirm: true
      },
      function() {
        this.setState({ processing: true });
        this.addSitesAsync(this.remainingSites);
      }.bind(this)
    );
  }

  selectSite(site, isNew) {
    if (isNew) {
      // add to map
      let nodes = [];
      let links = [];
      Object.keys(site.nodes).forEach(nodeName => {
        let node = site.nodes[nodeName];
        nodes.push(node.node);
        node.links.forEach(link => {
          links.push(link);
          // determine if we need to add additional sites/nodes to make links
          // viewable
          let remoteNodeName =
            link.a_node_name == node.node.name
              ? link.z_node_name
              : link.a_node_name;
          if (!this.nodesByName.hasOwnProperty(remoteNodeName)) {
            // remote node is new
            if (this.newNodesByName.hasOwnProperty(remoteNodeName)) {
              // remote node does exist in new topology
              // add new node+site into pendingTopology, mark as 'supporting'
              let remoteNode = this.newNodesByName[remoteNodeName];
              let remoteSite = this.newSitesByName[remoteNode];
            }
          }
        });
      });
      let pendingTopology = {
        sites: [site.site],
        nodes: nodes,
        links: links
      };
      Dispatcher.dispatch({
        actionType: Actions.PENDING_TOPOLOGY,
        topology: pendingTopology
      });
    }
    // select site name
    Dispatcher.dispatch({
      actionType: Actions.SITE_SELECTED,
      siteSelected: site.hasOwnProperty("site") ? site.site.name : site.name
    });
  }

  remoteSiteInfo(localSite, linkObj, localNodeName) {
    // determine local + remote node
    let remoteNodeName =
      linkObj.a_node_name == localNodeName
        ? linkObj.z_node_name
        : linkObj.a_node_name;
    // find remote site (z)
    let ret = {};
    let remoteSite;
    if (this.nodesByName.hasOwnProperty(remoteNodeName)) {
      // remote node is existing
      let remoteNode = this.nodesByName[remoteNodeName];
      ret["siteName"] = remoteNode.site_name;
      ret["nodeName"] = remoteNode.name;
      ret["newNode"] = false;
      if (this.sitesByName.hasOwnProperty(remoteNode.site_name)) {
        ret["newSite"] = false;
        remoteSite = this.sitesByName[remoteNode.site_name];
      }
    } else if (this.newNodesByName.hasOwnProperty(remoteNodeName)) {
      let remoteNode = this.newNodesByName[remoteNodeName];
      ret["siteName"] = remoteNode.site_name;
      ret["nodeName"] = remoteNode.name;
      ret["newNode"] = true;
      if (this.sitesByName.hasOwnProperty(remoteNode.site_name)) {
        ret["newSite"] = false;
        remoteSite = this.sitesByName[remoteNode.site_name];
      } else if (this.newSitesByName.hasOwnProperty(remoteNode.site_name)) {
        ret["newSite"] = true;
        remoteSite = this.newSitesByName[remoteNode.site_name].site;
      }
    }
    // find local site
    ret["linkLength"] = linkLength(localSite, remoteSite);
    return ret;
  }

  render() {
    // TODO - verify nodes/links/sites look sane
    // Show differences between X
    // - Differences for sites that match - keep existing / use new
    // - New sites - maybe we try and match nearby sites to see if it's the same?
    // - Deleted sites - keep / remove - probably need a lot of context on what's within
    this.nodesByName = {};
    this.newNodesByName = {};
    this.sitesByName = {};
    this.newSitesByName = {};
    this.remainingSites = [];

    this.props.topology.sites.forEach(site => {
      if (site.pending) {
        return;
      }
      this.sitesByName[site.name] = site;
    });
    this.props.topology.nodes.forEach(node => {
      if (node.pending) {
        return;
      }
      this.nodesByName[node.name] = node;
    });
    this.props.newTopology.sites.forEach(site => {
      this.newSitesByName[site.name] = { site: site, nodes: {} };
    });
    this.props.newTopology.nodes.forEach(node => {
      this.newNodesByName[node.name] = node;
      this.newSitesByName[node.site_name].nodes[node.name] = {
        node: node,
        links: []
      };
    });
    // mark links to each node/site
    this.props.newTopology.links.forEach(link => {
      let aNode = this.newNodesByName[link.a_node_name];
      this.newSitesByName[aNode.site_name].nodes[aNode.name].links.push(link);
      let zNode = this.newNodesByName[link.z_node_name];
      this.newSitesByName[zNode.site_name].nodes[zNode.name].links.push(link);
    });
    let issues = [];
    Object.keys(this.newSitesByName).forEach((siteName, i) => {
      let newSiteByName = this.newSitesByName[siteName];
      // first we'll resolve all site issues, add/delete/rename.
      // Allow clicking on each conflict to show the site in question
      if (this.sitesByName.hasOwnProperty(siteName)) {
        // existing, compare
        // TODO - verify location proximity
        // verify nodes are the same
        let newNodesList = newSiteByName.nodes;
        Object.keys(newNodesList).forEach(nodeName => {
          let node = newNodesList[nodeName].node;
          // check if node exists and has the same site
          let newNode = false;
          let siteChanged = false;
          if (!this.nodesByName.hasOwnProperty(node.name)) {
            newNode = true;
          }
          if (
            !newNode &&
            this.nodesByName[node.name].site_name != node.site_name
          ) {
            siteChanged = true;
          }
          if (newNode || siteChanged) {
            issues.push(
              <tr>
                <td>{node.name}</td>
                <td>Type: {node.node_type == 1 ? "CN" : "DN"}</td>
                <td>MAC: {node.mac_addr ? node.mac_addr : "-"}</td>
              </tr>
            );
          }
          let links = newNodesList[nodeName].links;
        });
      } else {
        // add to remaining site list
        this.remainingSites.push(newSiteByName.site);
        // new site name
        let nodesAndLinks = [];
        let numNodesLinks = 0;
        // fetch links from each node
        Object.values(newSiteByName.nodes).forEach((nodeLinkObj, i) => {
          let node = nodeLinkObj.node;
          let links = nodeLinkObj.links;
          let nodeHeader = <td rowSpan={numNodesLinks}>Nodes</td>;
          nodesAndLinks.push(
            <tr>
              <td>Node</td>
              <td>
                <span
                  onClick={() => {
                    this.selectNode(node.name);
                  }}
                >
                  {node.name}
                </span>
              </td>
              <td>{node.node_type == 1 ? "CN" : "DN"}</td>
              <td>POP? {node.pop_node ? "Y" : "N"}</td>
              <td>Primary? {node.is_primary ? "Y" : "n"}</td>
            </tr>
          );
          // add remaining nodes
          let numLinks = 0;
          links.forEach((link, i) => {
            if (link.link_type == 2) {
              return;
            }
            numLinks++;
          });
          links.forEach((link, i) => {
            if (link.link_type == 2) {
              return;
            }
            let remoteSiteInfo = this.remoteSiteInfo(
              newSiteByName.site,
              link,
              node.name
            );
            nodesAndLinks.push(
              <tr>
                <td className={this.classNameIsNew(true)} colSpan="2">
                  {link.name}
                </td>
                <td className={this.classNameIsNew(remoteSiteInfo.newNode)}>
                  {remoteSiteInfo.nodeName}
                </td>
                <td className={this.classNameIsNew(remoteSiteInfo.newSite)}>
                  <span
                    onClick={() => {
                      this.selectSite(remoteSiteInfo.siteName, false);
                    }}
                  >
                    {remoteSiteInfo.siteName}
                  </span>
                </td>
                <td>{parseInt(remoteSiteInfo.linkLength)} m</td>
              </tr>
            );
            numNodesLinks++;
          });
          numNodesLinks++; /* for node count */
        });
        // site header
        issues.push(
          <tr>
            <td
              colSpan="5"
              className={this.classNameIsNew(true)}
              style={{ borderTop: "2px solid cadetblue" }}
            >
              <span
                onClick={() => {
                  this.selectSite(newSiteByName, true);
                }}
                style={{ fontWeight: "bold" }}
              >
                {siteName} ({i + 1}/{Object.keys(this.newSitesByName).length})
              </span>
            </td>
          </tr>
        );
        issues.push(nodesAndLinks);
      }
    });
    let addSitesButton = (
      <input
        type="button"
        value={"Add Sites (" + this.remainingSites.length + ")"}
        onClick={() => {
          this.addAllSites();
        }}
      />
    );
    let addNodesButton = "nodes";
    let addLinksButton = "links";
    if (this.state.processing || !this.remainingSites.length) {
      addSitesButton = (
        <input
          type="button"
          value={"Add Sites (" + this.remainingSites.length + ")"}
          disabled
        />
      );
    }
    return (
      <div id="myModal" className="details">
        <div className="details-content">
          <div className="details-header">
            <h3 style={{ marginTop: "0px" }}>Topology Issues</h3>
          </div>
          <div className="details-body">
            {addSitesButton}
            {addNodesButton}
            {addLinksButton}
          </div>
          <div
            className="details-body"
            style={{ maxHeight: this.props.maxHeight - 50 }}
          >
            <table
              className="details-table"
              style={{
                width: "100%",
                borderLeft: "2px solid cadetblue",
                borderRight: "2px solid cadetblue"
              }}
            >
              <tbody>{issues}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

DetailsTopologyIssues.propTypes = {
  topology: PropTypes.object.isRequired,
  newTopology: PropTypes.object.isRequired,
  maxHeight: PropTypes.number.isRequired
};
