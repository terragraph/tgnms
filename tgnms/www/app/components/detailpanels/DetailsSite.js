/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import {
  availabilityColor,
  getPolarityString,
  polarityColor,
  uptimeSec,
} from '../../helpers/NetworkHelpers.js';
import {Actions} from '../../constants/NetworkConstants.js';
import axios from 'axios';
import {Panel} from 'react-bootstrap';
import React from 'react';
import PropTypes from 'prop-types';
import swal from 'sweetalert';

export default class DetailsSite extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    site: PropTypes.object.isRequired,
    sites: PropTypes.object.isRequired,
    nodes: PropTypes.object.isRequired,
    links: PropTypes.object.isRequired,
    maxHeight: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
    onLeave: PropTypes.func.isRequired,
  };

  state = {
    showNodes: true,
    showLinks: true,
    showRuckus: true,
    showActions: true,
  };

  statusColor(onlineStatus, trueText = 'True', falseText = 'False') {
    return (
      <span style={{color: onlineStatus ? 'forestgreen' : 'firebrick'}}>
        {onlineStatus ? trueText : falseText}
      </span>
    );
  }

  selectLink = linkName => {
    const link = this.props.links[linkName];
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'links',
    });
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.LINK_SELECTED,
        link,
        source: 'map',
      });
    }, 1);
  };

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.NODE_SELECTED,
        nodeSelected: nodeName,
        source: 'map',
      });
    }, 1);
  }

  addSite() {
    const newSite = {
      name: this.props.site.name,
      lat: this.props.site.location.latitude,
      long: this.props.site.location.longitude,
      alt: this.props.site.location.altitude,
    };
    const postData = {
      topology: this.props.topologyName,
      newSite,
    };
    swal(
      {
        title: 'Are you sure?',
        text: 'You are adding a site to this topology!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, add it!',
        closeOnConfirm: false,
      },
      () => {
        axios
          .post('/controller/addSite', postData)
          .then(response =>
            swal({
              title: 'Site Added!',
              text: 'Response: ' + response.statusText,
              type: 'success',
            }),
          )
          .catch(error =>
            swal({
              title: 'Failed!',
              text:
                'Adding a site failed\nReason: ' + error.response.statusText,
              type: 'error',
            }),
          );
      },
    );
  }

  renameSite() {
    swal(
      {
        title: 'Rename site',
        text: 'New site name',
        type: 'input',
        showCancelButton: true,
        closeOnConfirm: false,
        animation: 'slide-from-top',
        inputPlaceholder: 'Site Name',
      },
      inputValue => {
        if (inputValue === false) {
          return false;
        }

        if (inputValue === '') {
          swal.showInputError("Name can't be empty");
          return false;
        }

        return new Promise((resolve, reject) => {
          const url =
            '/controller/renameSite/' +
            this.props.topologyName +
            '/' +
            this.props.site.name +
            '/' +
            inputValue;
          axios
            .get(url)
            .then(response =>
              swal(
                {
                  title: 'Site renamed',
                  text: 'Response: ' + response.statusText,
                  type: 'success',
                },
                () => resolve(),
              ),
            )
            .catch(error =>
              swal(
                {
                  title: 'Failed!',
                  text:
                    'Renaming site failed.\nReason: ' +
                    error.response.statusText,
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  }

  deleteSite() {
    swal(
      {
        title: 'Are you sure?',
        text: 'You will not be able to recover this Site!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, delete it!',
        closeOnConfirm: false,
      },
      () => {
        return new Promise((resolve, reject) => {
          const url =
            '/controller/delSite/' +
            this.props.topologyName +
            '/' +
            this.props.site.name;
          axios
            .get(url)
            .then(response =>
              swal(
                {
                  title: 'Site Deleted!',
                  text: 'Response: ' + response.statusText,
                  type: 'success',
                },
                () => {
                  Dispatcher.dispatch({
                    actionType: Actions.CLEAR_NODE_LINK_SELECTED,
                  });
                  resolve();
                },
              ),
            )
            .catch(error =>
              swal(
                {
                  title: 'Failed!',
                  text:
                    'Site deletion failed\nReason: ' +
                    error.response.statusText,
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  }

  formatGolay(golayIdx) {
    if (golayIdx) {
      return Buffer.from(golayIdx.buffer.data).readUIntBE(0, 8);
    } else {
      return 'N/A';
    }
  }

  genNodeType(nodeType, isPrimary) {
    let type = nodeType === 1 ? 'CN ' : 'DN ';
    type += isPrimary ? '(Primary)' : '(Secondary)';
    return type;
  }

  onHeadingClick(showTable) {
    const show = this.state[showTable];
    this.setState({[showTable]: !show});
  }

  render() {
    if (!this.props.site || !this.props.site.name) {
      return <div />;
    }

    const nodesList = [];
    const linksList = [];
    // TODO: - wow this is inefficient
    Object.keys(this.props.nodes).map(nodeName => {
      const node = this.props.nodes[nodeName];
      if (node.site_name === this.props.site.name) {
        nodesList.push(node);

        Object.keys(this.props.links).map(linkName => {
          const link = this.props.links[linkName];
          if (
            link.link_type === 1 &&
            (nodeName === link.a_node_name || nodeName === link.z_node_name)
          ) {
            // one of our links, calculate the angle of the location
            // we should know which one is local and remote for the angle
            linksList.push(link);
          }
        });
      }
    });

    const nodesRows = [];
    nodesList.forEach(node => {
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
              onClick={() => this.selectNode(node.name)}>
              {this.statusColor(
                node.status === 2 || node.status === 3,
                node.name,
                node.name,
              )}
            </span>
          </td>
          <td>{this.genNodeType(node.node_type, node.is_primary)}</td>
          <td>
            <span style={{color: polarityColor(node.polarity)}}>
              {getPolarityString(node.polarity)}
            </span>
          </td>
          <td title="txGolayIdx">{this.formatGolay(txGolayIdx)}</td>
          <td title="rxGolayIdx">{this.formatGolay(rxGolayIdx)}</td>
        </tr>,
      );
    });

    // average availability of all links across site
    let alivePercAvg = 0;
    const linksRows = [];
    // show link availability average
    linksList.forEach(link => {
      let alivePerc = 0;
      if (link.hasOwnProperty('alive_perc')) {
        alivePerc = parseInt(link.alive_perc * 1000, 10) / 1000.0;
      }
      alivePercAvg += alivePerc;
      linksRows.push(
        <tr key={link.name}>
          <td>
            <span
              className="details-link"
              onClick={() => {
                this.selectLink(link.name);
              }}>
              {this.statusColor(link.is_alive, link.name, link.name)}
            </span>
          </td>
          <td>
            <span style={{color: availabilityColor(alivePerc)}}>
              {alivePerc}%
            </span>
          </td>
          <td>
            <span>{parseInt(link.angle * 100, 10) / 100}&deg;</span>
          </td>
          <td>
            <span>{parseInt(link.distance * 100, 10) / 100} m</span>
          </td>
        </tr>,
      );
    });
    const ruckusRows = [];
    if (this.props.site.hasOwnProperty('ruckus')) {
      ruckusRows.push(
        <tr key="ruckus">
          <td>Ruckus AP</td>
          <td>{this.props.site.ruckus.clientCount} clients</td>
          <td>{uptimeSec(this.props.site.ruckus.uptime)}</td>
          <td>{this.props.site.ruckus.connectionState}</td>
          <td>{this.props.site.ruckus.registrationState}</td>
        </tr>,
      );
    }
    alivePercAvg /= linksList.length;
    alivePercAvg = parseInt(alivePercAvg * 1000, 10) / 1000.0;
    const actionsList = [];
    if (this.props.site.hasOwnProperty('pending') && this.props.site.pending) {
      actionsList.push(
        <tr>
          <td>
            <span
              className="details-link"
              onClick={() => {
                this.addSite();
              }}>
              Add Site
            </span>
          </td>
        </tr>,
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
                }}>
                Delete Site
              </span>
            </div>
          </td>
        </tr>,
      );
      actionsList.push(
        <tr>
          <td>
            <div>
              <span
                className="details-link"
                onClick={() => {
                  this.renameSite();
                }}>
                Rename Site
              </span>
            </div>
          </td>
        </tr>,
      );
    }
    return (
      <Panel
        bsStyle="primary"
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        <Panel.Heading>
          <span
            className="details-close"
            onClick={() => {
              this.props.onClose();
            }}>
            &times;
          </span>
          <Panel.Title componentClass="h3">
            {this.props.site.pending ? '(Pending) ' : ''}Site Details
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          <div>
            <h3 style={{marginTop: '0px'}}>{this.props.site.name}</h3>
            <table
              className="details-table"
              style={{width: '100%', border: '0px solid black'}}>
              <tbody>
                <tr>
                  <td width="100px">Lat / Lng</td>
                  <td colSpan="2">
                    {this.props.site.location.latitude} /{' '}
                    {this.props.site.location.longitude}
                  </td>
                </tr>
                <tr>
                  <td width="100px">Altitude</td>
                  <td colSpan="3">{this.props.site.location.altitude} m</td>
                </tr>
                <tr>
                  <td width="100px">Availability</td>
                  <td colSpan="6">
                    <span style={{color: availabilityColor(alivePercAvg)}}>
                      {alivePercAvg}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4
              onClick={() => {
                this.onHeadingClick('showNodes');
              }}>
              Nodes
            </h4>
            {this.state.showNodes && (
              <table className="details-table" style={{width: '100%'}}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Polarity</th>
                    <th>Tx Golay</th>
                    <th>Rx Golay</th>
                  </tr>
                </thead>
                <tbody>{nodesRows}</tbody>
              </table>
            )}
          </div>
          <div>
            <h4
              onClick={() => {
                this.onHeadingClick('showLinks');
              }}>
              Links
            </h4>
            {this.state.showLinks && (
              <table className="details-table" style={{width: '100%'}}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Availability</th>
                    <th>Azimuth</th>
                    <th>Length</th>
                  </tr>
                </thead>
                <tbody>{linksRows}</tbody>
              </table>
            )}
          </div>
          {ruckusRows.length > 0 && (
            <div>
              <h4
                onClick={() => {
                  this.onHeadingClick('showRuckus');
                }}>
                Ruckus
              </h4>
              {this.state.showRuckus && (
                <table className="details-table" style={{width: '100%'}}>
                  <tbody>{ruckusRows}</tbody>
                </table>
              )}
            </div>
          )}
          <div>
            <h4
              onClick={() => {
                this.onHeadingClick('showActions');
              }}>
              Actions
            </h4>
            {this.state.showActions && (
              <table className="details-table" style={{width: '100%'}}>
                <tbody>{actionsList}</tbody>
              </table>
            )}
          </div>
        </Panel.Body>
      </Panel>
    );
  }
}
