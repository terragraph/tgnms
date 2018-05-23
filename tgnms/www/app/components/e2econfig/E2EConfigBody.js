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
import JSONConfigForm from '../common/JSONConfigForm.js';
import isEmpty from 'lodash-es/isEmpty';
import PropTypes from 'prop-types';
import React from 'react';
import swal from 'sweetalert';

export default class E2EConfigBody extends React.Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    configMetadata: PropTypes.object,
    draftConfig: PropTypes.object.isRequired,
    newConfigFields: PropTypes.object.isRequired,
  };

  state = {
    isExpanded: true,
  };

  submitAlertProps = {
    title: 'Confirm Submit Config Changes',
    text: `You are about to submit configuration changes for controller.
    This may cause the controller to reboot.

    Proceed?`,
    type: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Submit Changes',
    cancelButtonText: 'Cancel',
  };

  onToggleExpandAll(isExpanded) {
    toggleExpandAll({isExpanded});

    this.setState({
      isExpanded,
    });
  }

  onSubmitConfig = () => {
    swal(this.submitAlertProps, isConfirm => {
      if (isConfirm) {
        submitConfig();
      }
    });
  };

  render() {
    const {config, configMetadata, draftConfig, newConfigFields} = this.props;

    const {isExpanded} = this.state;

    return (
      <div className="rc-network-config-body">
        <div className="rc-network-config-header">
          <h3 className="nc-header-title">E2E Controller Config</h3>
        </div>
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
        </div>
        <div className="config-form-root">
          <JSONConfigForm
            configs={[config]}
            draftConfig={draftConfig}
            newConfigFields={newConfigFields}
            metadata={configMetadata}
            editPath={[]}
            initExpanded={true}
          />
        </div>
        <div className="rc-network-config-footer">
          <button
            className="nc-footer-btn"
            onClick={resetConfig}
            disabled={isEmpty(draftConfig) && isEmpty(newConfigFields)}>
            Discard Changes
          </button>
          <button
            className="nc-footer-btn"
            onClick={this.onSubmitConfig}
            disabled={isEmpty(draftConfig)}>
            Submit Changes
          </button>
        </div>
      </div>
    );
  }
}
