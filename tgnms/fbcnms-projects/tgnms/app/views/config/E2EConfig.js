/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigRoot from './ConfigRoot';
import React from 'react';
import {ConfigLayer, E2EConfigMode} from '../../constants/ConfigConstants';
import {constructConfigFromMetadata} from '../../helpers/ConfigHelpers';
import {
  getAggregatorConfig,
  getAggregatorConfigMetadata,
  getControllerConfig,
  getControllerConfigMetadata,
  setAggregatorConfig,
  setControllerConfig,
} from '../../apiutils/ConfigAPIUtil';

import type {AggregatorConfigType} from '../../../shared/types/Aggregator';
import type {ControllerConfigType} from '../../../shared/types/Controller';
import type {NetworkConfig} from '../../NetworkContext';

import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

const styles = {};

type Props = {
  classes: {[string]: string},
  networkName: string,
  networkConfig: NetworkConfig,
};

type State = {
  controllerConfig: ?ControllerConfigType,
  aggregatorConfig: ?AggregatorConfigType,
  controllerConfigMetadata: ?ControllerConfigType,
  aggregatorConfigMetadata: ?AggregatorConfigType,
  useMetadataBase: boolean,
};

class E2EConfig extends React.Component<Props, State> {
  state = {
    // Config structures
    controllerConfig: null,
    aggregatorConfig: null,

    // Config metadata structures
    controllerConfigMetadata: null,
    aggregatorConfigMetadata: null,

    // Construct base config using metadata?
    useMetadataBase: true,
  };

  getSidebarProps = editMode => {
    // Get ConfigSidebar properties
    const {useMetadataBase} = this.state;

    return {editMode, useMetadataBase};
  };

  getRequests = isInitial => {
    // Prepare all API requests
    return [
      // Get configs
      {func: getControllerConfig, key: 'controllerConfig'},
      {func: getAggregatorConfig, key: 'aggregatorConfig'},

      // Get metadata
      ...(isInitial
        ? [
            {
              func: getControllerConfigMetadata,
              key: 'controllerConfigMetadata',
            },
            {
              func: getAggregatorConfigMetadata,
              key: 'aggregatorConfigMetadata',
            },
          ]
        : []),
    ];
  };

  getBaseLayer = editMode => {
    // Get base layer
    const {
      useMetadataBase,
      controllerConfigMetadata,
      aggregatorConfigMetadata,
    } = this.state;

    // Construct a fake "base layer" from metadata
    if (useMetadataBase) {
      if (editMode === E2EConfigMode.CONTROLLER) {
        return constructConfigFromMetadata(controllerConfigMetadata);
      } else if (editMode === E2EConfigMode.AGGREGATOR) {
        return constructConfigFromMetadata(aggregatorConfigMetadata);
      }
    }
    return {};
  };

  getConfigLayers = editMode => {
    // Value not used currently
    // Return the current config layers
    const {controllerConfig, aggregatorConfig} = this.state;
    const baseLayer = this.getBaseLayer(editMode);

    return [
      {id: ConfigLayer.BASE, value: baseLayer},
      {
        id: ConfigLayer.E2E,
        value:
          editMode === E2EConfigMode.CONTROLLER
            ? controllerConfig || {}
            : editMode === E2EConfigMode.AGGREGATOR
            ? aggregatorConfig || {}
            : {},
      },
    ];
  };

  getConfigMetadata = editMode => {
    // Return the current config metadata
    const {controllerConfigMetadata, aggregatorConfigMetadata} = this.state;

    return editMode === E2EConfigMode.CONTROLLER
      ? controllerConfigMetadata
      : editMode === E2EConfigMode.AGGREGATOR
      ? aggregatorConfigMetadata
      : {};
  };

  getConfigOverrides = editMode => {
    // Get the current override layer
    const {controllerConfig, aggregatorConfig} = this.state;

    if (editMode === E2EConfigMode.CONTROLLER) {
      return controllerConfig;
    } else if (editMode === E2EConfigMode.AGGREGATOR) {
      return aggregatorConfig;
    } else {
      return {}; // shouldn't happen
    }
  };

  handleSubmitDraft = (editMode, draftConfig, onSuccess, onError) => {
    // Submit all draft changes
    const {networkName} = this.props;

    if (editMode === E2EConfigMode.CONTROLLER) {
      setControllerConfig(networkName, draftConfig, onSuccess, onError);
    } else if (editMode === E2EConfigMode.AGGREGATOR) {
      setAggregatorConfig(networkName, draftConfig, onSuccess, onError);
    }
  };

  handleEditModeChange = _editMode => {
    // Handle an edit mode change
    // Nothing to do
  };

  handleSetConfigBase = (useMetadataBase, callback) => {
    // Toggle the E2E config metadata base values in the sidebar
    this.setState({useMetadataBase}, callback);
  };

  render() {
    const {networkConfig, networkName} = this.props;

    return (
      <ConfigRoot
        networkName={networkName}
        networkConfig={networkConfig}
        editModes={E2EConfigMode}
        initialEditMode={E2EConfigMode.CONTROLLER}
        getSidebarProps={this.getSidebarProps}
        setParentState={this.setState.bind(this)}
        getRequests={this.getRequests}
        getConfigLayers={this.getConfigLayers}
        getConfigMetadata={this.getConfigMetadata}
        getConfigOverrides={this.getConfigOverrides}
        onSubmitDraft={this.handleSubmitDraft}
        onEditModeChanged={this.handleEditModeChange}
        onSetConfigBase={this.handleSetConfigBase}
      />
    );
  }
}

export default withStyles(styles)(withRouter(E2EConfig));
