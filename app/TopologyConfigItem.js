import React from 'react';
import Dispatcher from './NetworkDispatcher.js';

export default class TopologyConfigItem extends React.Component {
  constructor(props) {
    super();
  }

  topologySelected(e) {
    let topologyName = this.props.to;
    // dispatch event
    Dispatcher.dispatch({
      actionType: 'topologySelected',
      topologyName: topologyName
    });
    // show sub-menu
    if (this.props.hasSubMenu) {
      this.props.toggleSubMenu(e);
    }
  }

  render() {
    return (
      <a onClick={this.topologySelected.bind(this)} className="metismenu-link">
        {this.props.children}
      </a>
    );
  }
}
