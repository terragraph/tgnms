/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert2/dist/sweetalert2.css';

import BGPStatusInfo from './BGPStatusInfo.js';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil.js';
import Dispatcher from '../../NetworkDispatcher.js';
import {Actions} from '../../constants/NetworkConstants.js';
import {Glyphicon, Panel} from 'react-bootstrap';
import {LinkType} from '../../../thrift/gen-nodejs/Topology_types';
import axios from 'axios';
import moment from 'moment';
import {has} from 'lodash-es';
import PropTypes from 'prop-types';
import swal from 'sweetalert2';
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
    nearbyNodes: [],
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

  rebootNode(force) {
    const {node, topologyName} = this.props;
    swal({
      title: 'Are You Sure?',
      text: 'This action will reboot the node!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return new Promise((resolve, reject) => {
          const data = {
            force,
            nodes: [node.name],
            secondsToReboot: 5,
          };
          apiServiceRequest(topologyName, 'rebootNode', data)
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
          title: 'Reboot Request Successful!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Node reboot failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  deleteLink(link) {
    const {topologyName} = this.props;
    swal({
      title: 'Delete ETHERNET Link?',
      text: 'You will not be able to recover this link!\nLink: ' + link.name,
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return new Promise((resolve, reject) => {
          const data = {
            aNodeName: link.a_node_name,
            zNodeName: link.z_node_name,
            force: true,
          };
          apiServiceRequest(topologyName, 'delLink', data)
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
          title: 'Ethernet Link Deleted Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Ethernet link deletion failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  deleteNode(force) {
    const {node, topologyName, links} = this.props;
    const ethernetLinks = Object.values(links).filter(link => {
      return (
        link.a_node_name === node.name ||
        (link.z_node_name === node.name && link.link_type === LinkType.ETHERNET)
      );
    });
    const deleteEthernetLinksText = ethernetLinks.length
      ? '\n\nWARNING: There are ' +
        ethernetLinks.length +
        ' ETHERNET links defined, you must delete them before deleting the ' +
        'node.'
      : '';
    swal({
      title: 'Delete Node?',
      text:
        'You will not be able to undo this operation!' +
        deleteEthernetLinksText,
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return new Promise((resolve, reject) => {
          const data = {
            force,
            nodeName: node.name,
          };
          apiServiceRequest(topologyName, 'delNode', data)
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
          title: 'Node Deleted Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Node deletion failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  renameNode() {
    const {node, topologyName} = this.props;
    swal({
      title: 'Rename Node',
      text: 'New node name',
      input: 'text',
      showCancelButton: true,
      animation: 'slide-from-top',
      inputPlaceholder: 'Node Name',
      showLoaderOnConfirm: true,
      inputValidator: value => {
        return !value && "Name can't be empty";
      },
      preConfirm: newName => {
        return new Promise((resolve, reject) => {
          const data = {
            nodeName: node.name,
            newNode: {
              name: newName,
            },
          };
          apiServiceRequest(topologyName, 'editNode', data)
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
          title: 'Node Renamed Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Renaming node failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  editAzimuth() {
    const {node, topologyName} = this.props;
    swal({
      title: 'Edit Azimuth',
      text:
        'An azimuth of 0 (North) is default and will not be shown. ' +
        'A value of [1, 360] will be shown if no link exists.\n\n' +
        'This is automatically set for nodes with links. Do not use when ' +
        'a link exists.',
      input: 'text',
      showCancelButton: true,
      animation: 'slide-from-top',
      inputPlaceholder: node.ant_azimuth,
      showLoaderOnConfirm: true,
      inputValidator: value => {
        if (!value) {
          return "Azimuth can't be empty";
        }
        const inputValue = Number.parseInt(value, 10);
        if (!Number.isInteger(inputValue)) {
          return 'Azimuth must be an integer';
        }
        if (inputValue < 0 || inputValue > 360) {
          return 'Azimuth must be between 0<->360°';
        }
        return true;
      },
      preConfirm: azimuth => {
        const newNode = Object.assign({}, node, {ant_azimuth: azimuth});
        if (newNode.hasOwnProperty('status_dump')) {
          delete newNode.status_dump;
        }
        return new Promise((resolve, reject) => {
          const data = {
            newNode,
            nodeName: node.name,
          };
          apiServiceRequest(topologyName, 'editNode', data)
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
          title: 'Node Azimuth Updated Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Edit node azimuth failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  setMacAddr() {
    const {node, topologyName} = this.props;
    swal({
      title: 'Set MAC Address',
      html:
        'Enter a new MAC address for <em>' +
        node.name +
        '</em>:' +
        '<input style="margin-bottom: 0" id="input-nodeMac" ' +
        'class="swal2-input">' +
        '<input style="margin-bottom: 0" type="checkbox" id="input-force" ' +
        'class="swal2-checkbox"> Force Update',
      showCancelButton: true,
      animation: 'slide-from-top',
      inputPlaceholder: 'MAC Address',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const nodeMac = document.getElementById('input-nodeMac').value.trim();
        const force = document.getElementById('input-force').checked;
        if (nodeMac === '') {
          swal.showValidationMessage('Please enter a MAC address.');
        } else {
          return new Promise((resolve, reject) => {
            const data = {
              force,
              nodeMac,
              nodeName: node.name,
            };
            apiServiceRequest(topologyName, 'setNodeMacAddress', data)
              .then(response =>
                resolve({success: true, msg: response.data.message}),
              )
              .catch(error =>
                resolve({success: false, msg: getErrorTextFromE2EAck(error)}),
              );
          });
        }
        return true;
      },
    }).then(result => {
      if (result.dismiss) {
        return false;
      }
      if (result.value.success) {
        swal({
          title: 'MAC Address Set Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Setting MAC address failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  changeWlanMacAddr(oldWlanMac) {
    const {node, topologyName} = this.props;
    swal({
      title: 'Change WLAN MAC Address',
      html:
        'Changing WLAN MAC address ' +
        '<em>' +
        oldWlanMac +
        '</em>' +
        ' to:<br>' +
        '<input style="margin-bottom: 0" id="input-newWlanMac" ' +
        'class="swal2-input">' +
        '<input style="margin-bottom: 0" type="checkbox" id="input-force" ' +
        'class="swal2-checkbox"> Force Update',
      showCancelButton: true,
      animation: 'slide-from-top',
      inputPlaceholder: 'MAC Address',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const newWlanMac = document
          .getElementById('input-newWlanMac')
          .value.trim();
        const force = document.getElementById('input-force').checked;
        if (newWlanMac === '') {
          swal.showValidationMessage('Please enter a MAC address.');
        } else {
          return new Promise((resolve, reject) => {
            const data = {
              force,
              newWlanMac,
              nodeName: node.name,
              oldWlanMac,
            };
            apiServiceRequest(topologyName, 'changeNodeWlanMacAddress', data)
              .then(response =>
                resolve({success: true, msg: response.data.message}),
              )
              .catch(error =>
                resolve({success: false, msg: getErrorTextFromE2EAck(error)}),
              );
          });
        }
        return true;
      },
    }).then(result => {
      if (result.dismiss) {
        return false;
      }
      if (result.value.success) {
        swal({
          title: 'WLAN MAC Address Changed Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text: 'Changing WLAN MAC failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  addWlanMacs() {
    const {node, topologyName} = this.props;
    swal({
      title: 'Add WLAN MAC Addresses',
      text: 'Enter the WLAN MAC addresses to add (comma-separated):',
      input: 'text',
      showCancelButton: true,
      animation: 'slide-from-top',
      inputPlaceholder: 'MAC Address',
      showLoaderOnConfirm: true,
      inputValidator: value => {
        return !value && 'Please enter a MAC address.';
      },
      preConfirm: wlanMacsStr => {
        const wlanMacs = wlanMacsStr.split(',').map(item => item.trim());
        return new Promise((resolve, reject) => {
          const data = {
            wlanMacs,
            nodeName: node.name,
          };
          apiServiceRequest(topologyName, 'addNodeWlanMacAddresses', data)
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
          title: 'WLAN MAC Addresses Added Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text:
            'Adding WLAN MAC addresses failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  deleteWlanMac(wlanMac) {
    const {node, topologyName} = this.props;
    swal({
      title: 'Delete WLAN MAC Address?',
      html:
        'This will remove ' +
        '<em>' +
        wlanMac +
        '</em>' +
        " from this node's list of WLAN MAC addresses.<br>" +
        '<input style="margin-bottom: 0" type="checkbox" id="input-force" ' +
        'class="swal2-checkbox"> Force Update',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const force = document.getElementById('input-force').checked;
        return new Promise((resolve, reject) => {
          const data = {
            force,
            wlanMacs: [wlanMac],
            nodeName: node.name,
          };
          apiServiceRequest(topologyName, 'deleteNodeWlanMacAddresses', data)
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
          title: 'WLAN MAC Address Deleted Successfully!',
          text: 'Response: ' + result.value.msg,
          type: 'success',
        });
      } else {
        swal({
          title: 'Failed!',
          text:
            'WLAN MAC address deletion failed.\nReason: ' + result.value.msg,
          type: 'error',
        });
      }
      return true;
    });
  }

  onHeadingClick(showTable) {
    const show = this.state[showTable];
    this.setState({[showTable]: !show});
  }

  onBgpNeighborHeaderClick(neighborIp) {
    const newHiddenBgpNeighbors = new Set(this.state.hiddenBgpNeighbors);
    if (newHiddenBgpNeighbors.has(neighborIp)) {
      newHiddenBgpNeighbors.delete(neighborIp);
    } else {
      newHiddenBgpNeighbors.add(neighborIp);
    }

    this.setState({
      hiddenBgpNeighbors: newHiddenBgpNeighbors,
    });
  }

  searchNearby() {
    const {node, topologyName} = this.props;

    Dispatcher.dispatch({
      actionType: Actions.START_SEARCH_NEARBY,
      node,
      topologyName,
    });
  }

  render() {
    const {links, node} = this.props;
    if (!node || !node.name) {
      return null;
    }

    const wirelessLinksList = [];
    const ethernetLinksList = [];
    Object.keys(links).map(linkName => {
      const link = links[linkName];
      if (node.name === link.a_node_name || node.name === link.z_node_name) {
        if (link.link_type === LinkType.WIRELESS) {
          wirelessLinksList.push(link);
        } else if (link.link_type === LinkType.ETHERNET) {
          ethernetLinksList.push(link);
        }
      }
    });

    const linkRows = [];
    wirelessLinksList.forEach((link, index) => {
      const linkRow = (
        <tr key={link.name}>
          {index === 0 ? (
            <td rowSpan={wirelessLinksList.length} width="100px">
              RF Links
            </td>
          ) : (
            undefined
          )}
          <td colSpan="2">
            <span
              className="details-link"
              onClick={() => {
                this.selectLink(link.name);
              }}>
              {this.statusColor(link.is_alive, link.name, link.name)}
            </span>
          </td>
        </tr>
      );
      linkRows.push(linkRow);
    });
    ethernetLinksList.forEach((link, index) => {
      const linkRow = (
        <tr key={link.name}>
          {index === 0 ? (
            <td rowSpan={ethernetLinksList.length} width="100px">
              Ethernet Links
            </td>
          ) : (
            undefined
          )}
          <td>{link.name}</td>
          <td>
            <span
              role="button"
              tabIndex="0"
              style={{color: 'firebrick'}}
              onClick={() => {
                this.deleteLink(link);
              }}>
              <Glyphicon title="remove" glyph="remove" />
            </span>
          </td>
        </tr>
      );
      linkRows.push(linkRow);
    });

    const ipv6 = node.status_dump
      ? node.status_dump.ipv6Address
      : 'Not Available';
    let type = node.node_type === 2 ? 'DN' : 'CN';
    type += node.pop_node ? '-POP' : '';

    let elapsedTime = 'Not Available';
    if (node.status_dump) {
      const timeStampSec = node.status_dump.timeStamp;
      const timeStamp = new Date(timeStampSec * 1000);
      elapsedTime = moment().diff(timeStamp, 'seconds') + ' seconds ago';
    }

    const radioMacRows = [];
    if (node.wlan_mac_addrs) {
      node.wlan_mac_addrs.forEach((mac, index) => {
        radioMacRows.push(
          <tr key={mac}>
            {index === 0 ? (
              <td rowSpan={node.wlan_mac_addrs.length} width="100px">
                Radio MACs
              </td>
            ) : (
              undefined
            )}
            <td>{mac}</td>
            <td style={{whiteSpace: 'nowrap'}}>
              <span
                role="button"
                tabIndex="0"
                style={{color: '#226ab2'}}
                onClick={() => {
                  this.changeWlanMacAddr(mac);
                }}>
                <Glyphicon title="edit" glyph="edit" />
              </span>
              <span
                role="button"
                tabIndex="0"
                style={{color: 'firebrick'}}
                onClick={() => {
                  this.deleteWlanMac(mac);
                }}>
                <Glyphicon title="remove" glyph="remove" />
              </span>
            </td>
          </tr>,
        );
      });
    }

    return (
      <Panel
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        <Panel.Heading>
          <span
            role="button"
            tabIndex="0"
            className="details-close"
            onClick={this.props.onClose}>
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
                <td>
                  <span
                    role="button"
                    tabIndex="0"
                    style={{color: '#226ab2'}}
                    onClick={() => {
                      this.setMacAddr();
                    }}>
                    <Glyphicon title="edit" glyph="edit" />
                  </span>
                </td>
              </tr>
              {radioMacRows}
              <tr>
                <td width="100px">IPv6</td>
                <td colSpan="2">{ipv6}</td>
              </tr>
              <tr>
                <td width="100px">Type</td>
                <td colSpan="2">{type}</td>
              </tr>
              <tr>
                <td width="100px">Azimuth</td>
                <td>{this.props.node.ant_azimuth}&deg;</td>
                <td>
                  <span
                    role="button"
                    tabIndex="0"
                    style={{color: '#226ab2'}}
                    onClick={() => {
                      this.editAzimuth();
                    }}>
                    <Glyphicon title="edit" glyph="edit" />
                  </span>
                </td>
              </tr>
              <tr>
                <td width="100px">Site</td>
                <td colSpan="2">
                  <span
                    role="link"
                    tabIndex="0"
                    className="details-link"
                    onClick={() => {
                      this.selectSite(node.site_name);
                    }}>
                    {node.site_name}
                  </span>
                </td>
              </tr>
              {linkRows}
              <tr>
                <td width="100px">Last seen</td>
                <td colSpan="2">{elapsedTime}</td>
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
                  onBgpNeighborHeaderClick={neighborIp => {
                    this.onBgpNeighborHeaderClick(neighborIp);
                  }}
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
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => this.rebootNode(false)}>
                  Reboot Node
                </span>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link forced"
                  onClick={() => this.rebootNode(true)}>
                  (forced)
                </span>
              </div>
              <div>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => this.deleteNode(false)}>
                  Delete Node
                </span>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link forced"
                  onClick={() => this.deleteNode(true)}>
                  (forced)
                </span>
              </div>
              <div>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => this.renameNode()}>
                  Rename Node
                </span>
              </div>
              <div>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => this.addWlanMacs()}>
                  Add WLAN MAC Addresses
                </span>
              </div>
              <div>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => this.changeToConfigView(node)}>
                  Node Configuration
                </span>
              </div>
              <div>
                <span
                  role="link"
                  tabIndex="0"
                  className="details-link"
                  onClick={() => this.searchNearby()}>
                  Search Nearby
                </span>
              </div>
            </div>
          )}
        </Panel.Body>
      </Panel>
    );
  }
}
