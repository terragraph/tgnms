import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';

import NetworkNodesTable from './NetworkNodesTable.js';
import NetworkLinksTable from './NetworkLinksTable.js';
import NetworkAdjacencyTable from './NetworkAdjacencyTable.js';
import NetworkRoutingTable from './NetworkRoutingTable.js';
import NetworkStatusTable from './NetworkStatusTable.js';

// tabs
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

const TAB_NAMES = ['status', 'nodes', 'links', 'adjacencies', 'routing'];

export default class NetworkDataTable extends React.Component {
  state = {
    routing: {},
  }

  tabNameToIndex = {}

  constructor(props) {
    super(props);
    this.shouldUpdate = false;
    TAB_NAMES.forEach((val, idx) => {
      this.tabNameToIndex[val] = idx;
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      return true;
    }
    return false;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.height != this.props.height) {
      this.shouldUpdate = true;
    }
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    this.setState({
      selectedTabIndex: NetworkStore.tabName in this.tabNameToIndex ?
                        this.tabNameToIndex[NetworkStore.tabName] : 0,
    });
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        // TODO - compare props and update shouldUpdate or something
        break;
      case Actions.AGGREGATOR_DUMP_REFRESHED:
        this.shouldUpdate = true;
        this.setState({
          routing: payload.routing,
        });
        break;
      case Actions.TAB_SELECTED:
        this.shouldUpdate = true;
        if (!(payload.tabName in this.tabNameToIndex)) {
          console.error('Tab not found', payload.tabName);
          break;
        }
        const tabIndex = this.tabNameToIndex[payload.tabName];
        this.setState({
          selectedTabIndex: tabIndex,
        });
        break;
    }
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
    });
    // TODO - should we null the selected node?
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: TAB_NAMES[index],
    });
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_NODE_LINK_SELECTED,
    });
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_ROUTE
    });
  }

  render() {
    let adjustedHeight = this.props.height - 95;
    adjustedHeight = adjustedHeight < 0 ? 0 : adjustedHeight;
    return (
      <Tabs
        onSelect={this._handleTabSelect.bind(this)}
        selectedIndex={this.state.selectedTabIndex}
      >
        <TabList>
          <Tab>Status</Tab>
          <Tab>Nodes</Tab>
          <Tab>Links</Tab>
          <Tab>Adjacencies</Tab>
          <Tab>Routing</Tab>
        </TabList>
        <TabPanel>
          <NetworkStatusTable
            instance={this.props.networkConfig}>
          </NetworkStatusTable>
        </TabPanel>
        <TabPanel>
          <NetworkNodesTable
            height={adjustedHeight}
            topology={this.props.networkConfig.topology}>
          </NetworkNodesTable>
        </TabPanel>
        <TabPanel>
          <NetworkLinksTable
            height={adjustedHeight}
            topology={this.props.networkConfig.topology}>
          </NetworkLinksTable>
        </TabPanel>
        <TabPanel>
          <NetworkAdjacencyTable
            height={adjustedHeight}
            topology={this.props.networkConfig.topology}
            routing={this.state.routing}>
          </NetworkAdjacencyTable>
        </TabPanel>
        <TabPanel>
          <NetworkRoutingTable
            height={adjustedHeight}
            topology={this.props.networkConfig.topology}
            routing={this.state.routing}>
          </NetworkRoutingTable>
        </TabPanel>
      </Tabs>
    );
  }
}
NetworkDataTable.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
};
