/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import ConfigModalBody from './ConfigModalBody';
import {apiServiceRequest} from '../../apiutils/ServiceAPIUtil';
import PropTypes from 'prop-types';
import React from 'react';
import Modal from 'react-modal';
import Select from 'react-select';
import cx from 'classnames';
import axios from 'axios';

import 'react-select/dist/react-select.css';

export default class ConfigModal extends React.Component {
  static propTypes = {
    nodeName: PropTypes.string.isRequired, // NOT mac address
    onConfirm: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired,
    swVersion: PropTypes.string,
    topologyName: PropTypes.string,
  };

  state = {
    allControllerSwVersions: [],
    allSwVersions: null,
    selectedVersion: 'default',
    config: {},
  };

  componentWillMount() {
    // Fetch all SW Versions from the Controller
    const data = {
      swVersions: [],
    };
    apiServiceRequest(this.props.topologyName, 'getBaseConfig').then(
      response => {
        const {config} = response.data;
        const controllerSwVersions = Object.keys(JSON.parse(config)).sort();
        this.setState({
          allControllerSwVersions: controllerSwVersions,
          allSwVersions: controllerSwVersions,
        });
      },
    );
  }

  componentDidUpdate(prevProps, prevState) {
    const {show, swVersion} = this.props;

    if (show && prevProps.show !== show) {
      const allSwVersions = swVersion
        ? [...this.state.allControllerSwVersions, swVersion]
        : this.state.allControllerSwVersions;

      this.setState({
        selectedVersion: swVersion || 'default',
        allSwVersions,
        config: {},
      });
    }

    if (prevState.selectedVersion !== this.state.selectedVersion) {
      this.fetchFullNodeConfig();
    }
  }

  handleVersionSelect = selectedVersion => {
    this.setState({
      selectedVersion: selectedVersion ? selectedVersion.value : 'default',
    });
  };

  fetchFullNodeConfig() {
    const {nodeName, topologyName} = this.props;
    const {selectedVersion} = this.state;
    const data = {
      node: nodeName,
      swVersion: selectedVersion,
    };
    apiServiceRequest(topologyName, 'getNodeConfig', data).then(response => {
      const {config} = response.data;
      this.setState({config: JSON.parse(config)});
    });
  }

  render() {
    const {swVersion, nodeName, show, onConfirm} = this.props;

    const modalBody = this.state.allSwVersions ? (
      <div>
        <h3>Node Config for {nodeName}</h3>
        {!swVersion && (
          <div className="alert">
            Could not detect the node's software version. Please select the
            appropriate version from the list.
          </div>
        )}
        <Select
          placeholder="Select a Software Version..."
          value={this.state.selectedVersion}
          onChange={this.handleVersionSelect}
          options={this.state.allSwVersions.map(version => ({
            value: version,
            label: version,
          }))}
        />
        {/*
            * NOTE: Since refs of children aren't set immediately, We need to
            * create another component to be in charge of the clipboard stuf
           */}
        <ConfigModalBody
          configString={JSON.stringify(this.state.config, null, 4)}
          onModalConfirm={onConfirm}
        />
      </div>
    ) : null;

    return (
      <Modal
        ariaHideApp={false}
        className="nc-node-config-modal"
        contentLabel="Node Config Label"
        isOpen={show}
        onRequestClose={onConfirm}
        shouldCloseOnOverlayClick={true}
        style={{
          overlay: {backgroundColor: 'rgba(0, 0, 0, 0.4)'},
        }}>
        {modalBody}
      </Modal>
    );
  }
}
