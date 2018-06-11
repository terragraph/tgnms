/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import {toggleExpandAll} from '../../actions/NetworkConfigActions.js';
import CustomToggle from '../common/CustomToggle.js';
import JSONConfigForm from '../common/JSONConfigForm.js';
import JSONConfigTextArea from '../common/JSONConfigTextArea.js';
import JSONEditPanel from '../common/JSONEditPanel.js';
import NetworkConfigFooter from './NetworkConfigFooter.js';
import NetworkConfigHeader from './NetworkConfigHeader.js';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';
import uuidv4 from 'uuid/v4';

export default class NetworkConfigBody extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    configs: PropTypes.arrayOf(PropTypes.object).isRequired,
    configMetadata: PropTypes.object.isRequired,
    draftConfig: PropTypes.object.isRequired,
    removedOverrides: PropTypes.instanceOf(Set).isRequired,
    newConfigFields: PropTypes.object.isRequired,
    nodesWithDrafts: PropTypes.array.isRequired,
    removedNodeOverrides: PropTypes.object.isRequired,

    selectedNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
    editMode: PropTypes.string.isRequired,

    hasUnsavedChanges: PropTypes.bool.isRequired,
  };

  state = {
    isExpanded: true,
    isJSONText: false,
    viewContext: {
      viewOverridesOnly: false,
    },
  };

  jsonTextRef = React.createRef();

  componentDidUpdate(prevProps) {
    if (
      this.props.topologyName !== prevProps.topologyName ||
      this.props.editMode !== prevProps.editMode ||
      this.props.selectedNodes !== prevProps.selectedNodes
    ) {
      // Switching Topologies or Config Type or Node should turn off the JSON text view
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

  render() {
    const {
      configs,
      configMetadata,
      draftConfig,
      removedOverrides,
      newConfigFields,
      selectedNodes,
      editMode,
      nodesWithDrafts,
      removedNodeOverrides,
      hasUnsavedChanges,
    } = this.props;

    const {isExpanded, isJSONText, viewContext} = this.state;

    return (
      <div className="rc-network-config-body">
        <NetworkConfigHeader
          editMode={editMode}
          selectedNodes={selectedNodes}
          hasUnsavedChanges={hasUnsavedChanges}
        />
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
          <div className="nc-btn-spacer" />
          {!isJSONText && (
            <div>
              <span style={{marginRight: '5px', marginLeft: '15px'}}>
                View Overrides Only
              </span>
              <CustomToggle
                checkboxId={uuidv4()}
                value={viewContext.viewOverridesOnly}
                onChange={value =>
                  this.setState({
                    viewContext: {
                      viewOverridesOnly: value,
                    },
                  })
                }
              />
            </div>
          )}
        </div>
        <div className="config-form-root">
          {isJSONText ? (
            // Display override config on the last layer
            <JSONConfigTextArea
              ref={this.jsonTextRef}
              config={configs[configs.length - 1]}
              draftConfig={draftConfig}
              removedFields={removedOverrides}
            />
          ) : (
            <JSONConfigForm
              configs={configs}
              metadata={configMetadata}
              draftConfig={draftConfig}
              removedFields={removedOverrides}
              newConfigFields={newConfigFields}
              editPath={[]}
              initExpanded={false}
              viewContext={viewContext}
            />
          )}
        </div>
        <NetworkConfigFooter
          config={configs[configs.length - 1]}
          newConfigFields={newConfigFields}
          draftConfig={draftConfig}
          removedOverrides={removedOverrides}
          editMode={editMode}
          nodesWithDrafts={nodesWithDrafts}
          removedNodeOverrides={removedNodeOverrides}
          isJSONText={isJSONText}
        />
      </div>
    );
  }
}
