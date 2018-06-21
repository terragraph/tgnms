/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import {apiServiceRequest} from '../../apiutils/ServiceAPIUtil.js';
import Dispatcher from '../../NetworkDispatcher.js';
import {Actions} from '../../constants/NetworkConstants.js';
import axios from 'axios';
import moment from 'moment';
import {Panel} from 'react-bootstrap';
import React from 'react';
import swal from 'sweetalert';

export default class DetailsNode extends React.Component {
  state = {
    showActions: true,
  };

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
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.SITE_SELECTED,
        siteSelected: siteName,
      });
    }, 1);
  }

  selectLink(linkName) {
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
  }

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

  connectToTerminal(ipv6) {
    if (ipv6 !== 'Not Available') {
      window.open('/xterm/' + ipv6, '_blank');
      window.focus();
    }
  }

  rebootNode(force) {
    const {node, topologyName} = this.props;
    swal(
      {
        title: 'Are you sure?',
        text: 'This action will REBOOT the node!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, reboot it!',
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
        confirmButtonText: 'Yes, delete it!',
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
                    'Node deletion failed\nReason: ' +
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

  renameNode() {
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
                    'Renaming node failed.\nReason: ' +
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
                    'Setting MAC failed\nReason: ' + error.response.statusText,
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

  render() {
    if (!this.props.node || !this.props.node.name) {
      return <div />;
    }

    const linksList = [];
    Object.keys(this.props.links).map(linkName => {
      const link = this.props.links[linkName];
      if (
        link.link_type === 1 &&
        (this.props.node.name === link.a_node_name ||
          this.props.node.name === link.z_node_name)
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

    const ipv6 = this.props.node.status_dump
      ? this.props.node.status_dump.ipv6Address
      : 'Not Available';
    let type = this.props.node.node_type === 2 ? 'DN' : 'CN';
    type += this.props.node.pop_node ? '-POP' : '';

    let elapsedTime = 'N/A';
    if (this.props.node.status_dump) {
      const timeStampSec = this.props.node.status_dump.timeStamp;
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
          <span
            className="details-close"
            onClick={() => {
              this.props.onClose();
            }}>
            &times;
          </span>
          <Panel.Title componentClass="h3">
            {this.props.node.pending ? '(Pending) ' : ''}Node Details
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          <h3 style={{marginTop: '0px'}}>{this.props.node.name}</h3>
          <table className="details-table" style={{width: '100%'}}>
            <tbody>
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
                  <span
                    className="details-link"
                    onClick={() => {
                      this.selectSite(this.props.node.site_name);
                    }}>
                    {this.props.node.site_name}
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
          <h4
            onClick={() => {
              this.onHeadingClick('showActions');
            }}>
            Actions
          </h4>
          {this.state.showActions && (
            <table className="details-table" style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td colSpan="2">
                    <div>
                      <span
                        className="details-link"
                        onClick={() => {
                          this.setMacAddr(false);
                        }}>
                        Set Mac Address
                      </span>
                      <span
                        className="details-link"
                        style={{float: 'right'}}
                        onClick={() => {
                          this.setMacAddr(true);
                        }}>
                        (forced)
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={() => {
                          this.connectToTerminal(ipv6);
                        }}>
                        Connect To Terminal
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={() => {
                          this.rebootNode(false);
                        }}>
                        Reboot Node
                      </span>
                      <span
                        className="details-link"
                        style={{float: 'right'}}
                        onClick={() => {
                          this.rebootNode(true);
                        }}>
                        (forced)
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={() => {
                          this.deleteNode(false);
                        }}>
                        Delete Node
                      </span>
                      <span
                        className="details-link"
                        style={{float: 'right'}}
                        onClick={() => {
                          this.deleteNode(true);
                        }}>
                        (forced)
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={this.renameNode.bind(this)}>
                        Rename Node
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={() =>
                          this.changeToConfigView(this.props.node)
                        }>
                        Node Configuration
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Panel.Body>
      </Panel>
    );
  }
}
