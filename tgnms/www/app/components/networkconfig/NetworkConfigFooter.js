/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import JSONDiff from '../common/JSONDiff.js';
import {
  submitConfig,
  submitConfigForAllNodes,
  resetConfig,
  resetConfigForAllNodes,
} from '../../actions/NetworkConfigActions.js';
import {createConfigToSubmit} from '../../helpers/NetworkConfigHelpers.js';
import {CONFIG_VIEW_MODE} from '../../constants/NetworkConfigConstants.js';
import isEmpty from 'lodash-es/isEmpty';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import SweetAlert from 'sweetalert-react';

export default class NetworkConfigFooter extends React.Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    newConfigFields: PropTypes.object.isRequired,
    draftConfig: PropTypes.object.isRequired,
    removedOverrides: PropTypes.instanceOf(Set).isRequired,
    editMode: PropTypes.string.isRequired,
    nodesWithDrafts: PropTypes.array.isRequired,
    removedNodeOverrides: PropTypes.object.isRequired,
    isJSONText: PropTypes.bool.isRequired,
  };

  state = {
    showSubmitConfig: false,
    showNodeSubmitConfig: false,
  };

  sweetAlertProps = {
    customClass: 'nc-submit-config-alert',
    title: 'Confirm Submit Config Changes',
    html: true,
    confirmButtonText: 'Submit Config',
    showCancelButton: true,
  };

  onSubmitConfig = () => {
    this.setState({
      showSubmitConfig: true,
      showNodeSubmitConfig: false,
    });
  };

  onSubmitConfigForAllNodes = () => {
    this.setState({
      showNodeSubmitConfig: true,
      showSubmitConfig: false,
    });
  };

  onResetConfig() {
    resetConfig();
  }

  onResetAllConfig() {
    resetConfigForAllNodes();
  }

  // TODO: 4 button system for phase 1, custom alert system for phase 2
  render() {
    const {
      config,
      newConfigFields,
      draftConfig,
      removedOverrides,
      editMode,
      nodesWithDrafts,
      removedNodeOverrides,
      isJSONText,
    } = this.props;

    const configType =
      editMode === CONFIG_VIEW_MODE.NODE ? 'node(s)' : 'network';

    return (
      <div className="rc-config-footer">
        <button
          className="nc-footer-btn"
          onClick={this.onResetConfig}
          disabled={
            isJSONText ||
            (isEmpty(draftConfig) &&
              isEmpty(newConfigFields) &&
              isEmpty(removedOverrides))
          }>
          Discard Changes
        </button>
        {editMode === CONFIG_VIEW_MODE.NODE && (
          <button
            className="nc-footer-btn"
            onClick={this.onResetAllConfig}
            disabled={
              isJSONText ||
              (isEmpty(nodesWithDrafts) &&
                isEmpty(newConfigFields) &&
                isEmpty(removedNodeOverrides))
            }>
            Discard changes for all nodes
          </button>
        )}
        <button
          className="nc-footer-btn"
          onClick={this.onSubmitConfig}
          disabled={
            isJSONText || (isEmpty(draftConfig) && isEmpty(removedOverrides))
          }>
          Submit Changes
        </button>
        {editMode === CONFIG_VIEW_MODE.NODE && (
          <button
            className="nc-footer-btn"
            onClick={this.onSubmitConfigForAllNodes}
            disabled={
              isJSONText ||
              (isEmpty(nodesWithDrafts) && isEmpty(removedNodeOverrides))
            }>
            Submit changes for all nodes
          </button>
        )}
        <SweetAlert
          {...this.sweetAlertProps}
          show={this.state.showSubmitConfig}
          text={renderToStaticMarkup(
            <div>
              <div>
                You are about to submit configuration changes for {configType}{' '}
                overrides.
              </div>
              <div className="nc-submit-alert-subtitle">
                This may cause the {configType} to reboot.
              </div>
              <JSONDiff
                oldConfig={config}
                newConfig={createConfigToSubmit(
                  config,
                  draftConfig,
                  removedOverrides,
                )}
              />
            </div>,
          )}
          onConfirm={() => {
            this.setState({showSubmitConfig: false});
            submitConfig();
          }}
          onCancel={() => this.setState({showSubmitConfig: false})}
        />
        <SweetAlert
          {...this.sweetAlertProps}
          show={this.state.showNodeSubmitConfig}
          text={renderToStaticMarkup(
            <div>
              <div>
                You are about to submit configuration changes for {configType}{' '}
                overrides.
              </div>
              <div className="nc-submit-alert-subtitle">
                This may cause the {configType} to reboot.
              </div>
              {editMode === CONFIG_VIEW_MODE.NODE && (
                <div className="nc-submit-alert-subtitle">
                  <strong>Note:</strong> You are submitting changes for ALL
                  nodes but the changes for the current node are only shown
                  below.
                </div>
              )}
              <JSONDiff
                oldConfig={config}
                newConfig={createConfigToSubmit(
                  config,
                  draftConfig,
                  removedOverrides,
                )}
              />
            </div>,
          )}
          onConfirm={() => {
            this.setState({showNodeSubmitConfig: false});
            submitConfigForAllNodes();
          }}
          onCancel={() => this.setState({showNodeSubmitConfig: false})}
        />
      </div>
    );
  }
}
