/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import ConfigModalBody from './ConfigModalBody';
import {apiServiceRequest} from '../../apiutils/ServiceAPIUtil';
import {
  DEFAULT_BASE_KEY,
  DEFAULT_HARDWARE_BASE_KEY,
} from '../../constants/NetworkConfigConstants.js';
import {sortConfig} from '../../helpers/NetworkConfigHelpers.js';
import {isEmpty} from 'lodash-es';
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
    hardwareType: PropTypes.string,
    topologyName: PropTypes.string,
  };

  state = {
    allControllerSwVersions: [],
    allControllerHardwareTypes: [],
    allSwVersions: null,
    allHardwareTypes: null,
    selectedVersion: DEFAULT_BASE_KEY,
    selectedHardwareType: DEFAULT_HARDWARE_BASE_KEY,
    config: {},
  };

  componentWillMount() {
    // Fetch all data from the controller
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
    apiServiceRequest(this.props.topologyName, 'getHardwareBaseConfig').then(
      response => {
        const {config} = response.data;
        const controllerHardwareTypes = Object.keys(JSON.parse(config)).sort();
        this.setState({
          allControllerHardwareTypes: controllerHardwareTypes,
          allHardwareTypes: controllerHardwareTypes,
        });
      },
    );
  }

  componentDidUpdate(prevProps, prevState) {
    const {show, swVersion, hardwareType} = this.props;
    const {allControllerSwVersions, allControllerHardwareTypes} = this.state;

    if (show && prevProps.show !== show) {
      const allSwVersions =
        swVersion &&
        !(
          allControllerSwVersions && allControllerSwVersions.includes(swVersion)
        )
          ? [...allControllerSwVersions, swVersion]
          : allControllerSwVersions;
      const allHardwareTypes =
        hardwareType &&
        !(
          allControllerHardwareTypes &&
          allControllerHardwareTypes.includes(hardwareType)
        )
          ? [...allControllerHardwareTypes, hardwareType]
          : allControllerHardwareTypes;

      this.setState({
        selectedVersion: swVersion || DEFAULT_BASE_KEY,
        selectedHardwareType: hardwareType || DEFAULT_BASE_KEY,
        allSwVersions,
        allHardwareTypes,
        config: {},
      });
    }

    if (
      prevState.selectedVersion !== this.state.selectedVersion ||
      prevState.selectedHardwareType !== this.state.selectedHardwareType
    ) {
      this.fetchFullNodeConfig();
    }
  }

  handleVersionSelect = selectedVersion => {
    this.setState({
      selectedVersion: selectedVersion
        ? selectedVersion.value
        : DEFAULT_BASE_KEY,
      config: {},
    });
  };

  handleHardwareSelect = selectedHardwareType => {
    this.setState({
      selectedHardwareType: selectedHardwareType
        ? selectedHardwareType.value
        : DEFAULT_HARDWARE_BASE_KEY,
      config: {},
    });
  };

  fetchFullNodeConfig() {
    const {nodeName, topologyName} = this.props;
    const {selectedVersion, selectedHardwareType} = this.state;
    const data = {
      node: nodeName,
      swVersion: selectedVersion,
      hwBoardId: selectedHardwareType,
    };
    apiServiceRequest(topologyName, 'getNodeConfig', data).then(response => {
      const {config} = response.data;
      this.setState({config: sortConfig(JSON.parse(config))});
    });
  }

  render() {
    const {swVersion, hardwareType, nodeName, show, onConfirm} = this.props;

    const modalBody =
      this.state.allSwVersions && this.state.allHardwareTypes ? (
        <div>
          <h3>
            Node Config for <em>{nodeName}</em>
          </h3>
          {!swVersion && (
            <div className="alert">
              This node is currently offline.
              <br />
              Please select its software version and hardware type from the
              lists below.
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
          <Select
            placeholder="Select a Hardware Type..."
            value={this.state.selectedHardwareType}
            onChange={this.handleHardwareSelect}
            options={this.state.allHardwareTypes.map(hw => ({
              value: hw,
              label: hw,
            }))}
          />
          {/*
            * NOTE: Since refs of children aren't set immediately, We need to
            * create another component to be in charge of the clipboard stuf
           */}
          <ConfigModalBody
            configString={
              isEmpty(this.state.config)
                ? 'Loading...'
                : JSON.stringify(this.state.config, null, 4)
            }
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
