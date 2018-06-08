/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// E2EConfigBody.js
// contains the component to render a config JSON, and buttons to save or save draft

import {
  submitConfig,
  resetConfig,
  toggleExpandAll,
} from '../../actions/NetworkConfigActions.js';
import E2EConfigHeader from './E2EConfigHeader.js';
import JSONConfigForm from '../common/JSONConfigForm.js';
import JSONConfigTextArea from '../common/JSONConfigTextArea.js';
import JSONEditPanel from '../common/JSONEditPanel.js';
import isEmpty from 'lodash-es/isEmpty';
import PropTypes from 'prop-types';
import React from 'react';
import swal from 'sweetalert';

export default class E2EConfigBody extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    activeConfig: PropTypes.string.isRequired,
    config: PropTypes.object.isRequired,
    configMetadata: PropTypes.object,
    configDirty: PropTypes.bool.isRequired,
    draftConfig: PropTypes.object.isRequired,
    newConfigFields: PropTypes.object.isRequired,
  };

  state = {
    isExpanded: true,
    isJSONText: false,
  };

  submitAlertProps = {
    title: 'Confirm Submit Config Changes',
    text: `You are about to submit configuration changes for controller/aggregator.
    This may cause the controller/aggregator to reboot.

    Proceed?`,
    type: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Submit Changes',
    cancelButtonText: 'Cancel',
  };

  jsonTextRef = React.createRef();

  componentDidUpdate(prevProps) {
    if (
      this.props.topologyName !== prevProps.topologyName ||
      this.props.activeConfig !== prevProps.activeConfig
    ) {
      // Switching Topologies or Config Type should turn off the JSON text view
      this.setState({
        isJSONText: false,
      });
    }
  }

  onToggleExpandAll(isExpanded) {
    toggleExpandAll({isExpanded});

    this.setState({
      isExpanded,
    });
  }

  onEditJSONText = () => {
    this.setState({
      isJSONText: true,
    });
  };

  onFinishEditJSONText = saveChanges => {
    if (saveChanges) {
      const error = this.jsonTextRef.current.saveChanges();

      if (error) {
        return;
      }
    }

    this.setState({
      isJSONText: false,
    });
  };

  onSubmitConfig = () => {
    swal(this.submitAlertProps, isConfirm => {
      if (isConfirm) {
        submitConfig();
      }
    });
  };

  render() {
    const {
      activeConfig,
      config,
      configMetadata,
      configDirty,
      draftConfig,
      newConfigFields,
    } = this.props;

    const {isExpanded, isJSONText} = this.state;

    return (
      <div className="rc-network-config-body">
        <E2EConfigHeader activeConfig={activeConfig} />
        <div className="nc-expand-all-wrapper">
          <button
            className="nc-expand-all-btn"
            onClick={() => this.onToggleExpandAll(true)}>
            Expand All
          </button>
          <button
            className="nc-expand-all-btn"
            onClick={() => this.onToggleExpandAll(false)}>
            Collapse All
          </button>
          <div className="nc-btn-spacer" />
          <JSONEditPanel
            isJSONText={isJSONText}
            onEdit={this.onEditJSONText}
            onFinishEdit={this.onFinishEditJSONText}
          />
        </div>
        <div className="config-form-root">
          {isJSONText ? (
            <JSONConfigTextArea
              ref={this.jsonTextRef}
              config={config}
              draftConfig={draftConfig}
            />
          ) : (
            <JSONConfigForm
              configs={[config]}
              draftConfig={draftConfig}
              newConfigFields={newConfigFields}
              metadata={configMetadata}
              editPath={[]}
              initExpanded
              hasDeletableFields
            />
          )}
        </div>
        <div className="rc-network-config-footer">
          <button
            className="nc-footer-btn"
            onClick={resetConfig}
            disabled={
              isJSONText ||
              (!configDirty && isEmpty(draftConfig) && isEmpty(newConfigFields))
            }>
            Discard Changes
          </button>
          <button
            className="nc-footer-btn"
            onClick={this.onSubmitConfig}
            disabled={isJSONText || (!configDirty && isEmpty(draftConfig))}>
            Submit Changes
          </button>
        </div>
      </div>
    );
  }
}
