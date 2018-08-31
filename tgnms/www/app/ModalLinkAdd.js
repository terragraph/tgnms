/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from './apiutils/ServiceAPIUtil';
import {NodeType} from '../thrift/gen-nodejs/Topology_types';
import {find} from 'lodash-es';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';
import swal from 'sweetalert';

const customModalStyle = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

const linkTypesVector = [
  {value: 'WIRELESS', label: 'WIRELESS'},
  {value: 'ETHERNET', label: 'ETHERNET'},
];

const LINK_TYPE_MAP = {
  WIRELESS: 1,
  ETHERNET: 2,
};

export default class ModalLinkAdd extends React.Component {
  state = {
    isBackupCnLink: null,
    linkNode1: null,
    linkNode2: null,
    linkType: null,
  };

  componentDidMount() {}

  modalClose() {
    this.props.onClose();
  }

  addLink() {
    let nodeA = '';
    let nodeZ = '';
    if (this.state.linkNode1 && this.state.linkNode2 && this.state.linkType) {
      if (this.state.linkNode1 < this.state.linkNode2) {
        nodeA = this.state.linkNode1;
        nodeZ = this.state.linkNode2;
      } else {
        nodeA = this.state.linkNode2;
        nodeZ = this.state.linkNode1;
      }
    } else {
      swal({
        title: 'Incomplete Data',
        text: 'Please fill in all form fields.',
        type: 'error',
      });
      return;
    }

    const nodeAMac = find(this.props.topology.nodes, {name: nodeA}).mac_addr;
    const nodeZMac = find(this.props.topology.nodes, {name: nodeZ}).mac_addr;

    const linkName = 'link-' + nodeA + '-' + nodeZ;
    swal(
      {
        title: 'Are you sure?',
        text: `You are adding ${this.state.linkType.toLowerCase()} link "${linkName}" to this topology.`,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, add it!',
        closeOnConfirm: false,
      },
      () => {
        const data = {
          link: {
            name: linkName,
            a_node_mac: nodeAMac,
            a_node_name: nodeA,
            is_alive: false,
            link_type: LINK_TYPE_MAP[this.state.linkType],
            linkup_attempts: 0,
            z_node_mac: nodeZMac,
            z_node_name: nodeZ,
          },
        };
        if (this.enableBackupCnOption() && this.state.isBackupCnLink) {
          data.link.is_backup_cn_link = true;
        }

        apiServiceRequest(this.props.topology.name, 'addLink', data)
          .then(response => {
            swal({
              title: 'Link Added!',
              text: 'Response: ' + response.data.message,
              type: 'success',
            });
          })
          .catch(error =>
            swal({
              title: 'Failed!',
              text:
                'Adding a link failed\nReason: ' +
                getErrorTextFromE2EAck(error),
              type: 'error',
            }),
          );
      },
    );
  }

  enableBackupCnOption() {
    if (
      !this.state.linkNode1 ||
      !this.state.linkNode2 ||
      this.state.linkType !== 'WIRELESS'
    ) {
      return false;
    }

    const linkNode1Type = find(this.props.topology.nodes, {
      name: this.state.linkNode1,
    }).node_type;
    const linkNode2Type = find(this.props.topology.nodes, {
      name: this.state.linkNode2,
    }).node_type;
    return (
      (linkNode1Type === NodeType.DN && linkNode2Type === NodeType.CN) ||
      (linkNode1Type === NodeType.CN && linkNode2Type === NodeType.DN)
    );
  }

  render() {
    const nodesVector = [];

    if (this.props.topology.nodes) {
      Object(this.props.topology.nodes).forEach(node => {
        nodesVector.push({
          value: node.name,
          label: node.name,
        });
      });
    }

    const linkName =
      this.state.linkNode1 && this.state.linkNode2
        ? this.state.linkNode1 < this.state.linkNode2
          ? 'link-' + this.state.linkNode1 + '-' + this.state.linkNode2
          : 'link-' + this.state.linkNode2 + '-' + this.state.linkNode1
        : '-';

    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
        style={customModalStyle}>
        <table>
          <tbody>
            <tr className="blank_row" />
            <tr>
              <td width={100}>Node 1</td>
              <td>
                <Select
                  options={nodesVector}
                  name="Select Node"
                  value={this.state.linkNode1}
                  onChange={val => this.setState({linkNode1: val.value})}
                  clearable={false}
                />
              </td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td width={100}>Node 2</td>
              <td>
                <Select
                  options={nodesVector}
                  name="Select Node"
                  value={this.state.linkNode2}
                  onChange={val => this.setState({linkNode2: val.value})}
                  clearable={false}
                />
              </td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td width={100}>Type</td>
              <td>
                <Select
                  options={linkTypesVector}
                  name="Select Type"
                  value={this.state.linkType}
                  onChange={val => this.setState({linkType: val.value})}
                  clearable={false}
                />
              </td>
            </tr>
            <tr className="blank_row" />
            {this.enableBackupCnOption() && (
              <tr>
                <td width={100}>Is Backup?</td>
                <td>
                  <input
                    name="isBackupCnLink"
                    type="checkbox"
                    checked={this.state.isBackupCnLink}
                    onChange={event =>
                      this.setState({isBackupCnLink: event.target.checked})
                    }
                  />
                </td>
              </tr>
            )}
            {this.enableBackupCnOption() && <tr className="blank_row" />}
            <tr>
              <td width={100}>Link Name</td>
              <td style={{fontSize: '90%', fontStyle: 'italic'}}>{linkName}</td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td width={100} />
              <td>
                <button
                  style={{float: 'right'}}
                  className="graph-button"
                  onClick={this.modalClose.bind(this)}>
                  Close
                </button>
                <button
                  style={{float: 'right'}}
                  className="graph-button"
                  onClick={this.addLink.bind(this)}>
                  Add Link
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
