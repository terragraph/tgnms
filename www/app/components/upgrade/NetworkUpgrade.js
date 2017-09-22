import React from 'react';
import { render } from 'react-dom';
// import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ipaddr from 'ipaddr.js';
import UpgradeCommandPane from './UpgradeCommandPane.js';

export default class NetworkUpgrade extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const topology = this.props.networkConfig.topology;

    return (
      <div className="network-upgrade">
        {/* status dump and map view coming soon */}
        <UpgradeCommandPane
          topology={topology}
        />
      </div>
    );
  }
}

NetworkUpgrade.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
}
