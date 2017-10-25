// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

import {submitConfig} from '../../actions/NetworkConfigActions.js';

export default class NetworkConfigFooter extends React.Component {
  constructor(props) {
    super(props);
  }

  // TODO: add other config objects in the config form besides the base config
  render() {
    return (
      <div className='rc-network-config-footer'>
        <button onClick={submitConfig}>Push Changes</button>
      </div>
    );
  }
}

NetworkConfigFooter.propTypes = {}
