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
    const {instance, routing, topology} = this.props;
    console.log(this.props);

/*
<div className="network-upgrade"
  style={{height: this.props.height + 'px'}}
>
*/

    return (
      <div className="network-upgrade">
        {/* cool stuff */}
        <UpgradeCommandPane
          instance={instance}
          routing={routing}
          topology={topology}
        />
      </div>
    );
  }
}

NetworkUpgrade.propTypes = {
  height: React.PropTypes.number.isRequired,
  instance: React.PropTypes.object.isRequired,
  routing: React.PropTypes.object.isRequired,
  topology: React.PropTypes.object.isRequred,
}
