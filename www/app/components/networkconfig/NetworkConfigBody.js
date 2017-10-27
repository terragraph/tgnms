// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

import JSONConfigForm from './JSONConfigForm.js';
import NetworkConfigHeader from './NetworkConfigHeader.js';
import NetworkConfigFooter from './NetworkConfigFooter.js';

export default class NetworkConfigBody extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      configs,
      draftConfig,
      editMode
    } = this.props;

    return (
      <div className='rc-network-config-body'>
        <NetworkConfigHeader />
        <JSONConfigForm
          configs={configs}
          draftConfig={draftConfig}
          editPath={[]}
        />
        <NetworkConfigFooter
          draftConfig={draftConfig}
          editMode={editMode}
        />
      </div>
    );
  }
}

NetworkConfigBody.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  editMode: React.PropTypes.string.isRequired,
}
