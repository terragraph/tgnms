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
import NetworkConfigFooter from './NetworkConfigFooter.js';
import NetworkConfigHeader from './NetworkConfigHeader.js';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';
import uuidv4 from 'uuid/v4';

export default class NetworkConfigBody extends React.Component {
  static propTypes = {
    configs: PropTypes.arrayOf(PropTypes.object).isRequired,
    configMetadata: PropTypes.object.isRequired,
    draftConfig: PropTypes.object.isRequired,
    removedOverrides: PropTypes.instanceOf(Set).isRequired,
    newConfigFields: PropTypes.object.isRequired,
    nodesWithDrafts: PropTypes.array.isRequired,
    nodesWithOverrides: PropTypes.instanceOf(Set).isRequired,
    removedNodeOverrides: PropTypes.object.isRequired,
    selectedNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
    editMode: PropTypes.string.isRequired,

    hasUnsavedChanges: PropTypes.bool.isRequired,
  };

  state = {
    isExpanded: true,
    viewContext: {
      viewOverridesOnly: false,
    },
  };

  onToggleExpandAll(isExpanded) {
    toggleExpandAll({isExpanded});

    this.setState({
      isExpanded,
    });
  }

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
      nodesWithOverrides,
      removedNodeOverrides,
      hasUnsavedChanges,
    } = this.props;

    const {isExpanded, viewContext} = this.state;

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
        <div className="config-form-root">
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
        </div>
        <NetworkConfigFooter
          newConfigFields={newConfigFields}
          draftConfig={draftConfig}
          removedOverrides={removedOverrides}
          editMode={editMode}
          nodesWithDrafts={nodesWithDrafts}
          removedNodeOverrides={removedNodeOverrides}
        />
      </div>
    );
  }
}
