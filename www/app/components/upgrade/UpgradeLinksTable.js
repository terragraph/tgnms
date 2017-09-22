import React from 'react';
import { render } from 'react-dom';

export default class UpgradeLinksTable extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const topology = this.props.networkConfig.topology;

    return (
      <div className="network-upgrade">
      </div>
    );
  }
}
