/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from './NetworkDispatcher.js';
import {Actions} from './constants/NetworkConstants.js';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Modal from 'react-modal';
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

export default class ModalTopologyDiffer extends React.Component {
  modalClose() {
    this.props.onClose();
  }

  uploadTopology() {
    const fileInput = document.getElementById('fileInput');
    const reader = new window.FileReader();
    let topology;

    reader.onload = function(e) {
      // Split on newlines and ignore the 2 header rows
      try {
        topology = JSON.parse(reader.result);
      } catch (e) {
        console.error('Unable to parse JSON:', reader.result);
        swal({title: 'Error parsing input file'});
        return;
      }
      Dispatcher.dispatch({
        actionType: Actions.TOPOLOGY_ISSUES_PANE,
        topology,
        visible: true,
      });
      this.modalClose();
    }.bind(this);

    if (fileInput.files.length == 0) {
      swal({title: 'Select a file!'});
    } else {
      try {
        reader.readAsText(fileInput.files[0]);
        console.log('read it');
      } catch (ex) {
        swal({title: 'Error uploading file'});
      }
    }
  }

  render() {
    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
        style={customModalStyle}
        contentLabel="Topology Differ">
        <table>
          <tbody>
            <tr className="blank_row" />
            <tr>
              <td width={100}>E2E Topology</td>
              <td>
                <input type="file" style={{float: 'right'}} id="fileInput" />
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
                  close
                </button>
                <button
                  style={{float: 'right'}}
                  className="graph-button"
                  onClick={this.uploadTopology.bind(this)}>
                  submit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}

ModalTopologyDiffer.propTypes = {
  topology: PropTypes.object.isRequired,
};
