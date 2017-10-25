// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

import JSONConfigForm from './JSONConfigForm.js';
import NetworkConfigFooter from './NetworkConfigFooter.js';

export default class NetworkConfigBody extends React.Component {
  constructor(props) {
    super(props);
  }

  // TODO: add other config objects in the config form besides the base config
  render() {
    return (
      <div className='rc-network-config-body'>
        <JSONConfigForm
          config={this.props.baseConfig}
          editPath={[]}
        />
        <NetworkConfigFooter />
      </div>
    );
  }
}

NetworkConfigBody.propTypes = {
  editMode: React.PropTypes.string.isRequired,
  baseConfig: React.PropTypes.object.isRequired,
  networkConfig: React.PropTypes.object.isRequired,
  nodeConfig: React.PropTypes.object.isRequired,
}
