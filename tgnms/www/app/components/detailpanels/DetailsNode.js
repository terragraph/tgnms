/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import BGPStatusInfo from './BGPStatusInfo.js';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil.js';
import Dispatcher from '../../NetworkDispatcher.js';
import {Actions} from '../../constants/NetworkConstants.js';
import axios from 'axios';
import moment from 'moment';
import {has} from 'lodash-es';
import PropTypes from 'prop-types';
import swal from 'sweetalert';
import {Panel} from 'react-bootstrap';
import React from 'react';

export default class DetailsNode extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    node: PropTypes.object.isRequired,
    links: PropTypes.object.isRequired,
    maxHeight: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
    onLeave: PropTypes.func.isRequired,
  };

  state = {
    showBGP: true,
    hiddenBgpNeighbors: new Set(),
    showActions: true,
  };

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
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.SITE_SELECTED,
        siteSelected: siteName,
      });
    }, 1);
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

  changeToConfigView(node) {
    Dispatcher.dispatch({
      actionType: Actions.VIEW_SELECTED,
      viewName: 'config',
      context: {
        node,
      },
    });
    // dispatch an action here, that would be good
  }

  rebootNode(force) {
    const {node, topologyName} = this.props;
    swal(
      {
        title: 'Are you sure?',
        text: 'This action will reboot the node!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Confirm',
        closeOnConfirm: false,
      },
      () => {
        return new Promise((resolve, reject) => {
          const data = {
            force,
            nodes: [node.name],
            secondsToReboot: 5,
          };
          apiServiceRequest(topologyName, 'rebootNode')
            .then(response =>
              swal(
                {
                  title: 'Reboot Request Successful!',
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
                    'Node reboot failed\nReason: ' + error.response.statusText,
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  }

  deleteNode(force) {
    const forceDelete = force ? 'force' : 'no_force';
    const {node, topologyName} = this.props;
    swal(
      {
        title: 'Are you sure?',
        text: 'You will not be able to recover this Node!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Confirm',
        closeOnConfirm: false,
      },
      () => {
        return new Promise((resolve, reject) => {
          const data = {
            nodeName: node.name,
          };
          apiServiceRequest(topologyName, 'delNode', data)
            .then(response =>
              swal(
                {
                  title: 'Node Deleted!',
                  text: 'Response: ' + response.data.message,
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
                    'Node deletion failed\nReason: ' +
                    getErrorTextFromE2EAck(error),
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  }

  renameNode = () => {
    const {node, topologyName} = this.props;
    swal(
      {
        title: 'Rename node',
        text: 'New node name',
        type: 'input',
        showCancelButton: true,
        closeOnConfirm: false,
        animation: 'slide-from-top',
        inputPlaceholder: 'Node Name',
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
          const data = {
            nodeName: node.name,
            newNode: {
              name: inputValue,
            },
          };
          apiServiceRequest(topologyName, 'editNode', data)
            .then(response =>
              swal(
                {
                  title: 'Node renamed',
                  text: 'Response: ' + response.data.message,
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
                    'Renaming node failed.\nReason: ' +
                    getErrorTextFromE2EAck(error),
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  };

  setMacAddr(force) {
    const {node, topologyName} = this.props;
    swal(
      {
        title: 'Set MAC Address!',
        text: 'New MAC address:',
        type: 'input',
        showCancelButton: true,
        closeOnConfirm: false,
        animation: 'slide-from-top',
        inputPlaceholder: 'MAC Address',
      },
      inputValue => {
        if (inputValue === false) {
          return false;
        }

        if (inputValue === '') {
          swal.showInputError('You need to write something!');
          return false;
        }

        return new Promise((resolve, reject) => {
          const data = {
            force,
            nodeMac: inputValue,
            nodeName: node.name,
          };
          apiServiceRequest(topologyName, 'setNodeMacAddress', data)
            .then(response =>
              swal(
                {
                  title: 'Mac address set successfully!',
                  text: 'Response: ' + response.data.message,
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
                    'Setting MAC failed\nReason: ' +
                    getErrorTextFromE2EAck(error),
                  type: 'error',
                },
                () => resolve(),
              ),
            );
        });
      },
    );
  }

  onHeadingClick(showTable) {
    const show = this.state[showTable];
    this.setState({[showTable]: !show});
  }

  onBgpNeighborHeaderClick = neighborIp => {
    const newHiddenBgpNeighbors = new Set(this.state.hiddenBgpNeighbors);
    if (newHiddenBgpNeighbors.has(neighborIp)) {
      newHiddenBgpNeighbors.delete(neighborIp);
    } else {
      newHiddenBgpNeighbors.add(neighborIp);
    }

    this.setState({
      hiddenBgpNeighbors: newHiddenBgpNeighbors,
    });
  };

  render() {
    const {links, node} = this.props;
    if (!node || !node.name) {
      return null;
    }

    const linksList = [];
    Object.keys(links).map(linkName => {
      const link = links[linkName];
      if (
        link.link_type === 1 &&
        (node.name === link.a_node_name || node.name === link.z_node_name)
      ) {
        linksList.push(link);
      }
    });

    const linksRows = [];
    let index = 0;
    linksList.forEach(link => {
      if (index === 0) {
        linksRows.push(
          <tr key={link.name}>
            <td rowSpan={linksList.length} width="100px">
              Links
            </td>
            <td>
              <span
                className="details-link"
                onClick={() => {
                  this.selectLink(link.name);
                }}>
                {this.statusColor(link.is_alive, link.name, link.name)}
              </span>
            </td>
          </tr>,
        );
      } else {
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
          </tr>,
        );
      }
      index++;
    });

    const ipv6 = node.status_dump
      ? node.status_dump.ipv6Address
      : 'Not Available';
    let type = node.node_type === 2 ? 'DN' : 'CN';
    type += node.pop_node ? '-POP' : '';

    let elapsedTime = 'N/A';
    if (node.status_dump) {
      const timeStampSec = node.status_dump.timeStamp;
      const timeStamp = new Date(timeStampSec * 1000);
      elapsedTime = moment().diff(timeStamp, 'seconds') + ' seconds ago';
    }

    return (
      <Panel
        bsStyle="primary"
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        <Panel.Heading>
          <span className="details-close" onClick={this.props.onClose}>
            &times;
          </span>
          <Panel.Title componentClass="h3">
            {node.pending ? '(Pending) ' : ''}Node Details
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          <h3 style={{marginTop: '0px'}}>{node.name}</h3>
          <table className="details-table">
            <tbody>
              <tr>
                <td width="100px">MAC</td>
                <td>{node.mac_addr}</td>
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
                  <span
                    className="details-link"
                    onClick={() => {
                      this.selectSite(node.site_name);
                    }}>
                    {node.site_name}
                  </span>
                </td>
              </tr>
              {linksRows}
              <tr>
                <td width="100px">Last seen</td>
                <td>{elapsedTime}</td>
              </tr>
            </tbody>
          </table>
          {has(node, 'status_dump.bgpStatus') && (
            <div>
              <h4
                className="details-heading"
                onClick={() => this.onHeadingClick('showBGP')}>
                BGP Status
              </h4>
              {this.state.showBGP && (
                <BGPStatusInfo
                  bgpStatus={node.status_dump.bgpStatus}
                  onBgpNeighborHeaderClick={this.onBgpNeighborHeaderClick}
                  hiddenBgpNeighbors={this.state.hiddenBgpNeighbors}
                />
              )}
            </div>
          )}
          <h4
            className="details-heading"
            onClick={() => this.onHeadingClick('showActions')}>
            Actions
          </h4>
          {this.state.showActions && (
            <div className="details-action-list">
              <div>
                <span
                  className="details-link"
                  onClick={() => {
                    this.setMacAddr(false);
                  }}>
                  Set Mac Address
                </span>
                <span
                  className="details-link forced"
                  onClick={() => this.setMacAddr(true)}>
                  (forced)
                </span>
              </div>
              <div>
                <span
                  className="details-link"
                  onClick={() => this.rebootNode(false)}>
                  Reboot Node
                </span>
                <span
                  className="details-link forced"
                  onClick={() => this.rebootNode(true)}>
                  (forced)
                </span>
              </div>
              <div>
                <span
                  className="details-link"
                  onClick={() => this.deleteNode(false)}>
                  Delete Node
                </span>
                <span
                  className="details-link forced"
                  onClick={() => this.deleteNode(true)}>
                  (forced)
                </span>
              </div>
              <div>
                <span className="details-link" onClick={this.renameNode}>
                  Rename Node
                </span>
              </div>
              <div>
                <span
                  className="details-link"
                  onClick={() => this.changeToConfigView(node)}>
                  Node Configuration
                </span>
              </div>
            </div>
          )}
        </Panel.Body>
      </Panel>
    );
  }
}
