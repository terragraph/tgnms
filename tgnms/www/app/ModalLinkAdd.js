/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import axios from 'axios';
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

export default class ModalLinkAdd extends React.Component {
  state = {
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
      // eslint-disable-next-line no-alert
      alert('Some Params are missing');
      return;
    }

    const linkName = 'link-' + nodeA + '-' + nodeZ;
    swal(
      {
        title: 'Are you sure?',
        text: 'You are adding a link to this topology!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, add it!',
        closeOnConfirm: false,
      },
      () => {
        const url =
          '/controller/addLink/' +
          this.props.topology.name +
          '/' +
          linkName +
          '/' +
          nodeA +
          '/' +
          nodeZ +
          '/' +
          this.state.linkType;
        axios
          .get(url)
          .then(response =>
            swal({
              title: 'Link Added!',
              text: 'Response: ' + response.statusText,
              type: 'success',
            }),
          )
          .catch(error =>
            swal({
              title: 'Failed!',
              text:
                'Adding a link failed\nReason: ' + error.response.statusText,
              type: 'error',
            }),
          );
      },
    );
  }

  render() {
    var nodesVector = [];

    if (this.props.topology.nodes) {
      Object(this.props.topology.nodes).forEach(node => {
        nodesVector.push({
          value: node.name,
          label: node.name,
        });
      });
    }

    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
        style={customModalStyle}
        contentLabel="Example Modal">
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
            <tr>
              <td width={100}>Link Name</td>
              <td>
                {this.state.linkNode1 < this.state.linkNode2
                  ? 'link-' + this.state.linkNode1 + '-' + this.state.linkNode2
                  : 'link-' + this.state.linkNode2 + '-' + this.state.linkNode1}
              </td>
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
