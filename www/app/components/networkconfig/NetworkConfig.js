// NetworkConfig.js
// top level "pure" component for rendering the network config of the given topology

import React from 'react';
import { render } from 'react-dom';

export default class NetworkConfigContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    }
  }

  render() {
    return (
      <div className='rc-network-config'>
        Expect great things
      </div>
    );
  }
}
