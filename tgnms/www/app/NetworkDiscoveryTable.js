/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from './apiutils/ServiceAPIUtil';
import Dispatcher from './NetworkDispatcher.js';
import {Actions} from './constants/NetworkConstants.js';
import PropTypes from 'prop-types';
import moment from 'moment';
import React from 'react';
import swal from 'sweetalert2';
import {Badge} from 'react-bootstrap';

// Interval for querying topology scan status
// TODO Make this work better for slow connections on very large topologies
const STATUS_REFRESH_INTERVAL_MS = 2000;

export default class NetworkDiscoveryTable extends React.Component {
  state = {
    active: false,
    lastUpdateTime: 0,
    currentScanNode: '',
    queuedSites: [],
    emptySites: [],
    visitedSites: [],
    newNodes: [],
    newLinks: [],
  };

  constructor(props) {
    super(props);
  }

  resetState() {
    this.setState({
      active: false,
      lastUpdateTime: 0,
      currentScanNode: '',
      queuedSites: [],
      emptySites: [],
      visitedSites: [],
      newNodes: [],
      newLinks: [],
    });
  }

  componentDidMount() {
    this.resetState();
    this.getNetworkTopologyScanStatus();
    this.interval = setInterval(
      () => this.getNetworkTopologyScanStatus(),
      STATUS_REFRESH_INTERVAL_MS,
    );
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.topology.name !== this.props.topology.name) {
      this.resetState();
      this.getNetworkTopologyScanStatus();
    }
  }

  getNetworkTopologyScanStatus() {
    apiServiceRequest(this.props.topology.name, 'getNetworkTopologyScanStatus')
      .then(response => {
        if (response.data && response.data.hasOwnProperty('active')) {
          this.setState({...response.data});
        } else {
          this.resetState();
        }
      })
      .catch(error => {
        console.error('failed to fetch topology scan status', error);
        this.resetState();
      });
  }

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.NODE_SELECTED,
      blockUrlPush: true,
      nodeSelected: nodeName,
      source: 'map',
    });
  }

  selectLink(link) {
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      blockUrlPush: true,
      link,
      linkSelected: link.name,
      source: 'map',
    });
  }

  selectSite(siteName) {
    Dispatcher.dispatch({
      actionType: Actions.SITE_SELECTED,
      blockUrlPush: true,
      siteSelected: siteName,
      source: 'map',
    });
  }

  showStartScans() {
    Dispatcher.dispatch({
      actionType: Actions.SHOW_TOPOLOGY_DISCOVERY_PANE,
      source: 'map',
    });
  }

  stopScans() {
    swal({
      title: 'Stop Discovery Scans?',
      text:
        'This will cancel all remaining scans, but any nodes or links added ' +
        'so far will be preserved.',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return new Promise((resolve, reject) => {
          apiServiceRequest(this.props.topology.name, 'stopNetworkTopologyScan')
            .then(response =>
              resolve({success: true, msg: response.data.message}),
            )
            .catch(error =>
              resolve({success: false, msg: getErrorTextFromE2EAck(error)}),
            );
        });
      },
    }).then(result => {
      if (result.dismiss) {
        return false;
      }
      if (result.value.success) {
        swal({
          title: 'Discovery Scans Stopped!',
          text: result.value.msg + '.',
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: result.value.msg + '.',
          type: 'error',
        });
      }
      return true;
    });
  }

  renderTopoList(list, nameFunction, clickHandler) {
    return list.length
      ? list.map((e, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <span
              role="link"
              tabIndex="0"
              className="details-link"
              onClick={() => {
                clickHandler(e);
              }}>
              {nameFunction(e)}
            </span>
          </span>
        ))
      : 'n/a';
  }

  renderNodeList(nodes) {
    return this.renderTopoList(
      nodes,
      node => node.name,
      node => this.selectNode(node.name),
    );
  }

  renderLinkList(links) {
    return this.renderTopoList(
      links,
      link => link.name,
      link => this.selectLink(link),
    );
  }

  renderSiteList(sites) {
    return this.renderTopoList(
      sites,
      siteName => siteName,
      siteName => this.selectSite(siteName),
    );
  }

  render() {
    const statusStr = this.state.active
      ? 'Active'
      : this.state.lastUpdateTime
        ? 'Finished'
        : 'Not Started';
    const lastUpdateTimeStr = this.state.lastUpdateTime
      ? moment(new Date(this.state.lastUpdateTime * 1000)).fromNow()
      : 'n/a';

    return (
      <div
        className="discovery-table-container"
        style={{height: this.props.height + 'px'}}>
        <div className="discovery-table-head-wrapper">
          <div className="discovery-table-head" style={{float: 'left'}}>
            <p>
              <strong>Discovery Scan Status:</strong> {statusStr}
            </p>
            <p>
              <strong>Current Initiator:</strong>{' '}
              {this.state.currentScanNode ? (
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => {
                    this.selectNode(this.state.currentScanNode);
                  }}>
                  {this.state.currentScanNode}
                </span>
              ) : (
                <span>n/a</span>
              )}
            </p>
            <p>
              <strong>Last Update:</strong> <span>{lastUpdateTimeStr}</span>
            </p>
          </div>
          <div className="discovery-table-head" style={{float: 'right'}}>
            <p>
              <span
                role="link"
                tabIndex="0"
                className="details-link"
                onClick={() => this.showStartScans()}>
                Start Scans
              </span>
            </p>
            <p>
              <span
                role="link"
                tabIndex="0"
                className="details-link"
                onClick={() => this.stopScans()}>
                Stop Scans
              </span>
            </p>
          </div>
        </div>
        <div className="discovery-table-body-wrapper">
          <div className="discovery-table-body">
            <h3>
              Queued
              <Badge>{this.state.queuedSites.length}</Badge>
            </h3>
            <p>{this.renderSiteList(this.state.queuedSites)}</p>
            <h3>
              Undiscovered
              <Badge>{this.state.emptySites.length}</Badge>
            </h3>
            <p>{this.renderSiteList(this.state.emptySites)}</p>
            <h3>
              Visited
              <Badge>{this.state.visitedSites.length}</Badge>
            </h3>
            <p>{this.renderSiteList(this.state.visitedSites)}</p>
          </div>
          <div className="discovery-table-body">
            <h3>
              New Nodes
              <Badge>{this.state.newNodes.length}</Badge>
            </h3>
            <p>{this.renderNodeList(this.state.newNodes)}</p>
            <h3>
              New Links
              <Badge>{this.state.newLinks.length}</Badge>
            </h3>
            <p>{this.renderLinkList(this.state.newLinks)}</p>
          </div>
        </div>
      </div>
    );
  }
}
NetworkDiscoveryTable.propTypes = {
  topology: PropTypes.object.isRequired,
};
