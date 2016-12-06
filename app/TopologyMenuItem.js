import React from 'react';

import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

export default class TopologyMenuItem extends React.Component {
  state = {
    loading: false,
  }

  constructor(props) {
    super();
  }

  componentWillMount() {
    // register for menu changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
  }

  componentWillUnmount() {
    // un-register when hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        // mark everything as loaded
        this.setState({
          loading: false,
        });
        break;
    }
  }

  topologySelected(e) {
    let topologyName = this.props.to;
    // show sub-menu
    if (this.props.hasSubMenu) {
      this.props.toggleSubMenu(e);
    } else {
      // dispatch event
      Dispatcher.dispatch({
        actionType: Actions.TOPOLOGY_SELECTED,
        topologyName: topologyName
      });
      this.setState({
        loading: true,
      });
    }
  }

  render() {
    // update active class for selected topology
    let activeLoadingClass = this.state.loading ?
      "metismenu-link metismenu-link-active-loading" :
      "metismenu-link metismenu-link-active";
    let className = this.props.active ?
      activeLoadingClass :
      "metismenu-link";
    return (
      <a onClick={this.topologySelected.bind(this)} className={className}>
        {this.props.children}
      </a>
    );
  }
}
