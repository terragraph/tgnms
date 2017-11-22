// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

import { toggleExpandAll } from '../../actions/NetworkConfigActions.js';

import JSONConfigForm from './JSONConfigForm.js';
import NetworkConfigHeader from './NetworkConfigHeader.js';
import NetworkConfigFooter from './NetworkConfigFooter.js';

export default class NetworkConfigBody extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: true
    };
  }

  onToggleExpandAll = (isExpanded) => {
    toggleExpandAll({isExpanded});

    this.setState({
      isExpanded
    });
  }

  render() {
    const {
      configs,
      draftConfig,
      newFields,
      selectedNodes,
      editMode,
      nodesWithDrafts,
      hasUnsavedChanges,
    } = this.props;

    return (
      <div className='rc-network-config-body'>
        <NetworkConfigHeader
          editMode={editMode}
          selectedNodes={selectedNodes}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        <div className='nc-expand-all-wrapper'>
          <button className='nc-expand-all-btn'
            onClick={() => this.onToggleExpandAll(true)}
          >Expand All</button>
          <button className='nc-expand-all-btn'
            onClick={() => this.onToggleExpandAll(false)}
          >Collapse All</button>
        </div>
        <div className='config-form-root'>
          <JSONConfigForm
            configs={configs}
            draftConfig={draftConfig}
            editPath={[]}
            parentExpanded={true}
          />
        </div>
        <NetworkConfigFooter
          draftConfig={draftConfig}
          editMode={editMode}
          nodesWithDrafts={nodesWithDrafts}
        />
      </div>
    );
  }
}

NetworkConfigBody.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  newFields: React.PropTypes.object.isRequired,
  nodesWithDrafts: React.PropTypes.array.isRequired,

  selectedNodes: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  editMode: React.PropTypes.string.isRequired,

  hasUnsavedChanges: React.PropTypes.bool.isRequired,
}
