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

// tabs
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

export default class NetworkDataTable extends React.Component {
  state = {
    selectedTabIndex: 0,
    topology: {},
    routing: {},
    componentHeight: window.innerHeight/2 - 50,
  }

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    if (NetworkStore.topologyName && NetworkStore.topologyJson) {
      this.setState({topology: NetworkStore.topologyJson});
    }
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        // topology refreshed
        this.setState({
          topology: payload.topologyJson,
        });
        break;
      case Actions.AGGREGATOR_DUMP_REFRESHED:
        this.setState({
          routing: payload.routing,
        });
        break;
      case Actions.PANE_CHANGED:
        this.setState({
          componentHeight: window.innerHeight - payload.newSize - 60,
        });
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          nodesSelected: null,
          selectedLink: null,
        });
        break;
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
  }

  render() {
    return (
      <Tabs
        onSelect={this._handleTabSelect.bind(this)}
        selectedIndex={this.state.selectedTabIndex}
      >
        <TabList>
          <Tab>Nodes</Tab>
          <Tab>Links</Tab>
          <Tab>Adjacencies</Tab>
          <Tab>Routing</Tab>
        </TabList>
        <TabPanel>
          <NetworkNodesTable
            height={this.state.componentHeight+'px'}
            topology={this.state.topology}>
          </NetworkNodesTable>
        </TabPanel>
        <TabPanel>
          <NetworkLinksTable
            height={this.state.componentHeight+'px'}
            topology={this.state.topology}>
          </NetworkLinksTable>
        </TabPanel>
        <TabPanel>
          <NetworkAdjacencyTable
            height={this.state.componentHeight+'px'}
            topology={this.state.topology}
            adjacencies={this.state.routing.adjacencyMap}>
          </NetworkAdjacencyTable>
        </TabPanel>
        <TabPanel>
          <NetworkRoutingTable
            height={this.state.componentHeight}
            topology={this.state.topology}
            routing={this.state.routing.statusReports}>
          </NetworkRoutingTable>
        </TabPanel>
      </Tabs>
    );
  }
}
