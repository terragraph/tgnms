// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import React from 'react';
import { render } from 'react-dom';

import { Actions } from '../../constants/NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import NetworkConfig from './NetworkConfig.js';

export default class NetworkConfigContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      networkConfig: {},
      draftConfig: {},
      unsavedConfig: {},
    }
  }

  render() {
    return (
      <NetworkConfig />
    );
  }
}
