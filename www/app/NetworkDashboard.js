import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// graphs
import ReactMultiGraph from './ReactMultiGraph.js';
// dispatcher
import { Actions } from './NetworkConstants.js';
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
    if (NetworkStore.networkName &&
        NetworkStore.networkConfig &&
        NetworkStore.networkConfig.topology) {
      this.setState({
        topologyJson: NetworkStore.networkConfig.topology,
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
          topologyJson: payload.networkConfig.topology,
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
      const aggGraphs = [
        ["nodes_traffic_tx", "nodes-traffic-tx",
         "Node Bandwidth (TX)", "Throughput"],
        ["nodes_traffic_rx", "nodes-traffic-rx",
         "Node Bandwidth (RX)", "Throughput"],
        ["traffic_sum", "traffic-sum",
         "Aggregate RF Bandwidth", "Throughput"],
        ["nodes_reporting", "nodes-reporting",
         "Nodes Reporting", "Nodes Reporting"],
        ["errors_sum", "errors-sum",
         "Error Rate", "Errors/sec"],
        ["drops_sum", "drops-sum",
         "Drop Rate", "Drops/sec"],
        ["load", "load",
         "Load Avg", "CPU Load"],
        ["mem_util", "mem-util",
        "Memory Utilization", "Memory Utilization %"],
      ];
      // nodes list
      let nodes = {};
      this.state.topologyJson.nodes.forEach(node => {
        nodes[node.mac_addr] = {
          'name':     node.name,
          'version':  'Unknown',
        };
      });
      // shared chart data across all graphs
      gridComponents = aggGraphs.map(graph => {
        let graphOptions = [{
          type: 'node',
          nodes: this.state.topologyJson.nodes,
          key: graph[0],
        }];
        return (
          <li key={graph[1] + "-li"}>
            <ReactMultiGraph
              options={graphOptions}
              size="small"
            />
          </li>
        );
      });
    }
    return (
      <SpringGrid
        component="ul"
        className="dashboard-grid"
        columns={3}
        columnWidth={450}
        gutterWidth={5}
        gutterHeight={5}
        itemHeight={350}>
        {gridComponents}
      </SpringGrid>
    );
  }
}
