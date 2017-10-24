// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

import JSONConfigForm from './JSONConfigForm.js';

export default class NetworkConfigBody extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className='rc-network-config-body'>
        <JSONConfigForm
          config={this.props.baseConfig}
          editPath={[]}
        />
      </div>
    );
  }
}

NetworkConfigBody.propTypes = {
  baseConfig: React.PropTypes.object.isRequired,
}
