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
    if (NetworkStore.networkName && NetworkStore.networkConfig) {
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
      // index nodes
      let nodesByName = {};
      this.state.topologyJson.nodes.forEach(node => {
        nodesByName[node.name] = node;
      });
      // construct links
      let links = [];
      this.state.topologyJson.links.forEach(link => {
        if (link.link_type != 2) {
          return;
        }
        links.push({
          'a_node': {
            'name': link.a_node_name,
            'mac':  nodesByName[link.a_node_name].mac_addr,
          },
          'z_node': {
            'name': link.z_node_name,
            'mac':  nodesByName[link.z_node_name].mac_addr,
          },
        });
      });
      // 'mac': {
      //    name,
      //    version,
      //    ..
      // }
      // shared chart data across all graphs
      let chartData = {
        'nodes':  nodes,
        'links':  links,
      };
      gridComponents = aggGraphs.map(graph => {
        return (
          <li key={graph[1] + "-li"}>
            <ReactGraph
              key={graph[1]}
              metric={graph[0]}
              title={graph[2]}
              label={graph[3]}
              chart_data={chartData}
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
