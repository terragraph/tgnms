import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// graphs
import ReactGraph from './ReactGraph.js';
// dispatcher
import Dispatcher from './MapDispatcher.js';
// layout components
import { SpringGrid } from 'react-stonecutter';

export default class NetworkDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case 'topologySelected':
        // update selected
        let topoGetFetch = new Request('/topology/get/' + payload.topologyName);
        fetch(topoGetFetch).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              this.setState({
                topology: json
              });
            }.bind(this));
          }
        }.bind(this));
        break;
    }
  }

  componentWillMount() {
    this.setState({
      topology: {},
    });
  }

  render() {
    let gridComponents = [];
    if (this.state.topology.topology && this.state.topology.topology.sites) {
      // index nodes by name
      let nodeMacList = [];
      Object.keys(this.state.topology.topology.nodes).map(nodeIndex => {
        let node = this.state.topology.topology.nodes[nodeIndex];
        nodeMacList.push(node.mac_addr);
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
              metric={graph[0]}
              size="large"
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
        columnWidth={400}
        gutterWidth={5}
        gutterHeight={5}
        itemHeight={300}>
        {gridComponents}
      </SpringGrid>
    );
  }
}
