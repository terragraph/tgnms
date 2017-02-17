import React from 'react';

import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

export default class TopologyMenuItem extends React.Component {
  state = {
    loading: false,
    online: false,
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
      case Actions.TOPOLOGY_LIST_REFRESHED:
        // update online state
        payload.topologies.forEach(topology => {
          if (topology.name == this.props.to) {
            this.setState({
              online: topology.controller_online,
            });
          }
        });
        break;
    }
  }

  topologySelected(e) {
    let networkName = this.props.to;
    // show sub-menu
    if (this.props.hasSubMenu) {
//      this.props.toggleSubMenu(e);
    } else {
      // dispatch event
      Dispatcher.dispatch({
        actionType: Actions.TOPOLOGY_SELECTED,
        networkName: networkName
      });
      this.setState({
        loading: true,
      });
    }
  }

  render() {
    // update active class for selected topology
    let classNameList = ["metismenu-link"];
    if (this.props.active) {
      classNameList.push(this.state.loading ? "metismenu-link-active-loading" :
                                              "metismenu-link-active");
    }
    let className = classNameList.join(" ");
    if (this.props.hasSubMenu) {
      return (
        <a onClick={this.topologySelected.bind(this)} className={className}>
          {this.props.children}
        </a>
      );
    }
    return (
      <a onClick={this.topologySelected.bind(this)} className={className}>
        <img src={"/static/images/" +
                (this.state.online ? 'online' : 'offline') + ".png"}
             className="leftNav" />
        {this.props.children}
      </a>
    );
  }
}
