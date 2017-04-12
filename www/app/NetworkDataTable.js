import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';

import NetworkNodesTable from './NetworkNodesTable.js';
import NetworkLinksTable from './NetworkLinksTable.js';
import NetworkAdjacencyTable from './NetworkAdjacencyTable.js';
import NetworkRoutingTable from './NetworkRoutingTable.js';
import NetworkStatusTable from './NetworkStatusTable.js';

// tabs
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

const TAB_NAME_TO_INDEX = {
  'status': 0,
  'nodes': 1,
  'links': 2,
  'adjacencies': 3,
  'routing': 4,
};

export default class NetworkDataTable extends React.Component {
  state = {
    selectedTabIndex: 0,
    networkConfig: {},
    routing: {},
  }

  constructor(props) {
    super(props);
    this.shouldUpdate = false;
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
    if (NetworkStore.networkName && NetworkStore.networkConfig) {
      let tabIndex = 0;
      if (NetworkStore.tabName in TAB_NAME_TO_INDEX) {
        tabIndex = TAB_NAME_TO_INDEX[NetworkStore.tabName];
      }
      this.setState({
        networkConfig: NetworkStore.networkConfig,
        selectedTabIndex: tabIndex,
      });
    }
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    this.shouldUpdate = true;
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        // topology refreshed
        this.setState({
          networkConfig: payload.networkConfig,
        });
        break;
      case Actions.AGGREGATOR_DUMP_REFRESHED:
        this.setState({
          routing: payload.routing,
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          nodesSelected: null,
          selectedLink: null,
        });
        break;
      case Actions.TAB_SELECTED:
        if (!(payload.tabName in TAB_NAME_TO_INDEX)) {
          console.error('Tab not found', payload.tabName);
          break;
        }
        const tabIndex = TAB_NAME_TO_INDEX[payload.tabName];
        this.setState({
          selectedTabIndex: tabIndex,
        });
        break;
      default:
        this.shouldUpdate = false;
    }
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
      selectedLink: null,
    });
    // TODO - should we null the selected node?
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_NODE_LINK_SELECTED,
    });
    Dispatcher.dispatch({actionType: Actions.CLEAR_ROUTE});
  }

  render() {
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
            instance={this.state.networkConfig}>
          </NetworkStatusTable>
        </TabPanel>
        <TabPanel>
          <NetworkNodesTable
            height={this.props.height - 60}
            topology={this.state.networkConfig.topology}>
          </NetworkNodesTable>
        </TabPanel>
        <TabPanel>
          <NetworkLinksTable
            height={this.props.height - 60}
            topology={this.state.networkConfig.topology}>
          </NetworkLinksTable>
        </TabPanel>
        <TabPanel>
          <NetworkAdjacencyTable
            height={this.props.height - 60}
            topology={this.state.networkConfig.topology}
            routing={this.state.routing}>
          </NetworkAdjacencyTable>
        </TabPanel>
        <TabPanel>
          <NetworkRoutingTable
            height={this.props.height - 60}
            topology={this.state.networkConfig.topology}
            routing={this.state.routing}>
          </NetworkRoutingTable>
        </TabPanel>
      </Tabs>
    );
  }
}
