import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// graphs
import ReactGraph from './ReactGraph.js';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// layout components
import { SpringGrid } from 'react-stonecutter';

export default class NetworkDashboard extends React.Component {
  state = {
    topologyJson: {},
  }

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // update default state from the store
    if (NetworkStore.topologyName && NetworkStore.topologyJson) {
      this.setState({
        topologyJson: NetworkStore.topologyJson,
      });
    }
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        this.setState({
          topologyJson: payload.topologyJson,
        });
        break;
    }
  }

  render() {
    let gridComponents = [];
    if (this.state.topologyJson && this.state.topologyJson.sites) {
      // index nodes by name
      let nodeMacList = [];
      let nodeNameList = [];
      Object.keys(this.state.topologyJson.nodes).map(nodeIndex => {
        let node = this.state.topologyJson.nodes[nodeIndex];
        nodeMacList.push(node.mac_addr);
        nodeNameList.push(node.name);
      });
      let nodeMacListStr = nodeMacList.join(",");
/*      gridComponents.push(
        <li key="bandwidth-agg">
          <ReactGraph
            key="bandwidth-agg"
            title="Aggregate RF Bandwidth"
            node={nodeMacListStr}
            metric="traffic_sum"
            size="large"
          />
        </li>);*/
      const aggGraphs = [
        ["nodes_traffic_tx", "nodes-traffic-tx", "Node Bandwidth (TX)"],
        ["nodes_traffic_rx", "nodes-traffic-rx", "Node Bandwidth (RX)"],
        ["traffic_sum", "traffic-sum", "Aggregate RF Bandwidth"],
      ];
      gridComponents = aggGraphs.map(graph => {
        return (
          <li key={graph[1] + "-li"}>
            <ReactGraph
              key={graph[1]}
              title={graph[2]}
              node={nodeMacListStr}
              names={nodeNameList}
              metric={graph[0]}
              size="small"
            />
          </li>
        );
      });
/*      gridComponents.push(
        <li key="nodes-traffix-tx">
          <ReactGraph
            key="nodes-traffic-tx"
            title="Node Bandwidth (TX)"
            node={nodeMacListStr}
            metric="nodes_traffic_tx"
            size="large"
          />
        </li>);*/
    }
    return (
      <SpringGrid
        component="ul"
        className="dashboard-grid"
        columns={4}
        columnWidth={350}
        gutterWidth={5}
        gutterHeight={5}
        itemHeight={300}>
        {gridComponents}
      </SpringGrid>
    );
  }
}
