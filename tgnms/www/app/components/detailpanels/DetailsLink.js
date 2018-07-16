/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import ModalIgnitionState from '../../ModalIgnitionState.js';
import Dispatcher from '../../NetworkDispatcher.js';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {availabilityColor} from '../../helpers/NetworkHelpers.js';
import {Actions} from '../../constants/NetworkConstants.js';
import axios from 'axios';
import classnames from 'classnames';
import {Panel} from 'react-bootstrap';
import React from 'react';
import swal from 'sweetalert';

const LINK_STATUS_UP = 1;
const LINK_STATUS_DOWN = 2;

export default class DetailsLink extends React.Component {
  state = {
    ignitionStateModalOpen: false,
    showActions: true,
  };

  constructor(props) {
    super(props);
    this.selectSite = this.selectSite.bind(this);
    this.selectNode = this.selectNode.bind(this);
    this.changeLinkStatus = this.changeLinkStatus.bind(this);
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

  selectNode(nodeName) {
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.NODE_SELECTED,
        nodeSelected: nodeName,
        source: 'details',
      });
    }, 1);
  }

  changeLinkStatus(upDown, initiatorIsAnode) {
    const {link, topologyName} = this.props;
    const initiatorNodeName = initiatorIsAnode
      ? link.a_node_name
      : link.z_node_name;
    const responderNodeName = initiatorIsAnode
      ? link.z_node_name
      : link.a_node_name;
    swal(
      {
        title: 'Are you sure?',
        text: 'This will send a link ' + status + ' request to e2e-controller',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, do it!',
        closeOnConfirm: false,
      },
      () => {
        const data = {
          action: upDown ? LINK_STATUS_UP : LINK_STATUS_DOWN,
          initiatorNodeName,
          responderNodeName,
        };
        apiServiceRequest(topologyName, 'setLinkStatus', data)
          .then(response =>
            swal({
              title: 'Request successful',
              text: 'Response: ' + response.data.message,
              type: 'success',
            }),
          )
          .catch(error =>
            swal({
              title: 'Request failed!',
              text:
                'Link status change failed\nReason: ' +
                getErrorTextFromE2EAck(error),
              type: 'error',
            }),
          );
      },
    );
  }

  deleteLink(force) {
    swal(
      {
        title: 'Are you sure?',
        text: 'You will not be able to recover this Link!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, delete it!',
        closeOnConfirm: false,
      },
      this.deleteLinkConfirm.bind(this, force),
    );
  }

  async deleteLinkConfirm(force) {
    const {link, topologyName} = this.props;
    try {
      const data = {
        aNodeName: link.a_node_name,
        zNodeName: link.z_node_name,
        force,
      };
      const response = await apiServiceRequest(topologyName, 'delLink', data);
      swal({
        title: 'Link Deleted!',
        text: 'Response: ' + response.data.message,
        type: 'success',
      });
      Dispatcher.dispatch({
        actionType: Actions.CLEAR_NODE_LINK_SELECTED,
      });
    } catch (error) {
      swal({
        title: 'Failed!',
        text: 'Link deletion failed\nReason: ' + getErrorTextFromE2EAck(error),
        type: 'error',
      });
    }
  }

  startIPerfTraffic(src, dest) {
    const srcIP = src.status_dump && src.status_dump.ipv6Address;
    const destIP = src.status_dump && src.status_dump.ipv6Address;

    if (!srcIP || !destIP) {
      return;
    }

    swal(
      {
        title: 'Are you sure?',
        text:
          'This will start sending IPerf traffic from\n' +
          src.name +
          '\nto\n' +
          dest.name +
          '\n\nPlease provide a bitrate (bps):',
        type: 'input',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, do it!',
        closeOnConfirm: false,
        inputPlaceholder: 'Bitrate (bps)',
        inputValue: 100,
      },
      inputValue => {
        const bitrate = parseInt(inputValue, 10);
        if (isNaN(bitrate) || bitrate < 1) {
          swal({
            title: 'Invalid bitrate!',
            text: 'Please provide a valid bitrate',
            type: 'error',
          });
          return;
        }
        const url =
          '/controller/startTraffic/' +
          this.props.topologyName +
          '/' +
          src.name +
          '/' +
          dest.name +
          '/' +
          srcIP +
          '/' +
          destIP +
          '/' +
          bitrate + // bitrate
          '/' +
          100; // time in seconds
        axios
          .get(url)
          .then(response =>
            swal({
              title: 'Request successful!',
              text: 'Response: ' + response.statusText,
              type: 'success',
            }),
          )
          .catch(error =>
            swal({
              title: 'Request failed!',
              text:
                'Starting IPerf failed \nReason: ' + error.response.statusText,
              type: 'error',
            }),
          );
      },
    );
  }

  stopIPerfTraffic(node) {
    const nodeIP = node.status_dump && node.status_dump.ipv6Address;

    if (!nodeIP) {
      return;
    }

    swal(
      {
        title: 'Are you sure?',
        text: 'This will stop sending IPerf traffic from ' + node.name,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, do it!',
        closeOnConfirm: false,
      },
      () => {
        const url =
          '/controller/stopTraffic/' +
          this.props.topologyName +
          '/' +
          node.name;
        axios
          .get(url)
          .then(response =>
            swal({
              title: 'Request successful!',
              text: 'Response: ' + response.statusText,
              type: 'success',
            }),
          )
          .catch(error =>
            swal({
              title: 'Request failed!',
              text:
                'Stopping IPerf failed \nReason: ' + error.response.statusText,
              type: 'error',
            }),
          );
      },
    );
  }

  onHeadingClick(showTable) {
    const show = this.state[showTable];
    this.setState({[showTable]: !show});
  }

  render() {
    if (!this.props.link || !this.props.link.name) {
      return null;
    }

    const nodeA = this.props.nodes[this.props.link.a_node_name];
    const nodeZ = this.props.nodes[this.props.link.z_node_name];
    if (!nodeA || !nodeZ) {
      return null;
    }
    const siteA = nodeA ? nodeA.site_name : 'Unknown Site';
    const siteZ = nodeZ ? nodeZ.site_name : 'Unknown Site';

    const linkupAttempts = this.props.link.linkup_attempts || 0;

    let ignitionStateModal = null;
    if (this.state.ignitionStateModalOpen) {
      ignitionStateModal = (
        <ModalIgnitionState
          isOpen={true}
          onClose={() => this.setState({ignitionStateModalOpen: false})}
          link={this.props.link}
          topologyName={this.props.topologyName}
        />
      );
    }
    let alivePerc = 0;
    if (this.props.link.hasOwnProperty('alive_perc')) {
      alivePerc = parseInt(this.props.link.alive_perc * 1000, 10) / 1000.0;
    }

    const IPerfEnabled =
      nodeA.status_dump &&
      nodeA.status_dump.ipv6Address &&
      nodeZ.status_dump &&
      nodeZ.status_dump.ipv6Address;
    return (
      <Panel
        bsStyle="primary"
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        {ignitionStateModal}
        <Panel.Heading>
          <span
            className="details-close"
            onClick={() => {
              this.props.onClose();
            }}>
            &times;
          </span>
          <Panel.Title componentClass="h3">
            {this.props.link.pending ? '(Pending) ' : ''}Link Details
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          <h3 style={{marginTop: '0px'}}>{this.props.link.name}</h3>
          <table className="details-table">
            <tbody>
              <tr>
                <td width="100px">A-Node</td>
                <td>
                  <span
                    className="details-link"
                    onClick={() => {
                      this.selectNode(this.props.link.a_node_name);
                    }}>
                    {this.statusColor(
                      nodeA.status === 2 || nodeA.status === 3,
                      this.props.link.a_node_name,
                      this.props.link.a_node_name,
                    )}
                  </span>
                </td>
                <td>
                  <span
                    className="details-link"
                    onClick={() => {
                      this.selectSite(siteA);
                    }}>
                    {siteA}
                  </span>
                </td>
              </tr>
              <tr>
                <td width="100px">Z-Node</td>
                <td>
                  <span
                    className="details-link"
                    onClick={() => {
                      this.selectNode(this.props.link.z_node_name);
                    }}>
                    {this.statusColor(
                      nodeZ.status === 2 || nodeZ.status === 3,
                      this.props.link.z_node_name,
                      this.props.link.z_node_name,
                    )}
                  </span>
                </td>
                <td>
                  <span
                    className="details-link"
                    onClick={() => {
                      this.selectSite(siteZ);
                    }}>
                    {siteZ}
                  </span>
                </td>
              </tr>
              <tr>
                <td width="100px">Alive</td>
                <td colSpan="2">
                  {this.statusColor(this.props.link.is_alive)}
                </td>
              </tr>
              <tr>
                <td width="100px">Attempts</td>
                <td colSpan="2">{linkupAttempts}</td>
              </tr>
              <tr>
                <td width="100px">Azimuth</td>
                <td colSpan="2">
                  {parseInt(this.props.link.angle * 100, 10) / 100}&deg;
                </td>
              </tr>
              <tr>
                <td width="100px">Length</td>
                <td colSpan="2">
                  {parseInt(this.props.link.distance * 100, 10) / 100} m
                </td>
              </tr>
              <tr>
                <td width="100px">Availability</td>
                <td colSpan="2">
                  <span style={{color: availabilityColor(alivePerc)}}>
                    {alivePerc}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <h4
            className="details-heading"
            onClick={() => {
              this.onHeadingClick('showActions');
            }}>
            Actions
          </h4>
          {this.state.showActions && (
            <table className="details-table">
              <tbody>
                <tr>
                  <td colSpan="3">
                    <div>
                      Send Link Up (pick initiator):{' '}
                      <span
                        className="details-link"
                        onClick={() => {
                          this.changeLinkStatus(true, true);
                        }}>
                        A-Node
                      </span>{' '}
                      &nbsp;&nbsp;
                      <span
                        className="details-link"
                        onClick={() => {
                          this.changeLinkStatus(true, false);
                        }}>
                        Z-Node
                      </span>
                    </div>
                    <div>
                      Send Link Down (pick initiator):{' '}
                      <span
                        className="details-link"
                        onClick={() => {
                          this.changeLinkStatus(false, true);
                        }}>
                        A-Node
                      </span>{' '}
                      &nbsp;&nbsp;
                      <span
                        className="details-link"
                        onClick={() => {
                          this.changeLinkStatus(false, false);
                        }}>
                        Z-Node
                      </span>
                    </div>
                    <hr className="details-separator" />
                    <div>
                      Start IPerf (pick initiator):&nbsp;
                      <span
                        className={classnames('details-link', {
                          'details-link--disabled': !IPerfEnabled,
                        })}
                        onClick={() => {
                          this.startIPerfTraffic(nodeA, nodeZ);
                        }}>
                        A-Node
                      </span>{' '}
                      &nbsp;&nbsp;
                      <span
                        className={classnames('details-link', {
                          'details-link--disabled': !IPerfEnabled,
                        })}
                        onClick={() => {
                          this.startIPerfTraffic(nodeZ, nodeA);
                        }}>
                        Z-Node
                      </span>{' '}
                      &nbsp;&nbsp;
                    </div>
                    <div>
                      Stop IPerf:&nbsp;
                      <span
                        className={classnames('details-link', {
                          'details-link--disabled': !IPerfEnabled,
                        })}
                        onClick={() => {
                          this.stopIPerfTraffic(nodeA);
                        }}>
                        A-Node
                      </span>{' '}
                      &nbsp;&nbsp;
                      <span
                        className={classnames('details-link', {
                          'details-link--disabled': !IPerfEnabled,
                        })}
                        onClick={() => {
                          this.stopIPerfTraffic(nodeZ);
                        }}>
                        Z-Node
                      </span>{' '}
                      &nbsp;&nbsp;
                    </div>
                    <hr className="details-separator" />
                    <div>
                      <span
                        className="details-link"
                        onClick={() =>
                          this.setState({ignitionStateModalOpen: true})
                        }>
                        Check Ignition State
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={() => {
                          this.deleteLink(false);
                        }}>
                        Delete Link
                      </span>
                    </div>
                    <div>
                      <span
                        className="details-link"
                        onClick={() => {
                          this.deleteLink(true);
                        }}>
                        Delete Link (Force)
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
