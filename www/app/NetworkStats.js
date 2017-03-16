import React from 'react';
import equals from 'equals';
// leaflet maps
import { render } from 'react-dom';
// graphs
import ReactMultiGraph from './ReactMultiGraph.js';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// layout components
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { SpringGrid } from 'react-stonecutter';
import { ScaleModal } from 'boron';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Token.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

const NODE_METRICS = [
  {
    key: 'load-1',
    name: 'Load (1-min)',
    metric: '',
  },
  {
    key: 'nodes_traffic_tx',
    name: 'Wireless Traffic (TX)',
    metric: '',
  },
  {
    key: 'nodes_traffic_rx',
    name: 'Wireless Traffic (RX)',
    metric: '',
  },
  {
    key: 'mem_util',
    name: 'Memory Utilization (%)',
    metric: '',
  },
];
const LINK_METRICS = [
  {
    key: 'rssi',
    name: 'RSSI',
    metric: '', /* some special link formatting required */
  },
/*  {
    key: 'mcs',
    name: 'MCS',
    metric: '',
  },*/
  {
    key: 'snr',
    name: 'SnR',
    metric: '',
  },
  {
    key: 'link_status',
    name: 'Link Status',
    metric: '',
  },
];
const TIME_PICKER_OPTS = [
  {
    label: '30 Minutes',
    minAgo: 30,
  },
  {
    label: '60 Minutes',
    minAgo: 60,
  },
  {
    label: '2 Hours',
    minAgo: 60 * 2,
  },
  {
    label: '6 Hours',
    minAgo: 60 * 6,
  },
];
export default class NetworkStats extends React.Component {
  state = {
    topologyJson: {},
    // type-ahead data
    metricNames: [],
    // type-ahead graphs
    taGraphs: [],
    minAgo: 60,
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

  componentDidMount() {
    this.refreshData();
  }

  refreshData() {
    this.metricRequest = new XMLHttpRequest();
    this.metricRequest.onload = function() {
      if (!this.metricRequest.responseText.length) {
        return;
      }
      let data = JSON.parse(this.metricRequest.responseText);
      let uniqMetricNames = {};
      // list all metrics we can display
      Object.keys(data.metrics).forEach(nodeName => {
        let node = data.metrics[nodeName];
        Object.keys(node).forEach(keyName => {
          let value = node[keyName];
          // key to use for searching
          let newKey = value.displayName ? value.displayName : keyName;
          if (!(newKey in uniqMetricNames)) {
            uniqMetricNames[newKey] = [];
          }
          uniqMetricNames[newKey].push({
            key: keyName,
            node: nodeName,
            keyId: value.dbKeyId,
            displayName: value.displayName ? value.displayName : '',
            linkName: value.linkName ? value.linkName : '',
            nodeName: value.nodeName ? value.nodeName : '',
          });
        });
      });
      this.setState({
        metricNames: uniqMetricNames,
      });
    }.bind(this);
    try {
      this.metricRequest.open('POST', '/metrics', true);
      let opts = {
        'topology': this.state.topologyJson,
      };
      this.metricRequest.send(JSON.stringify(opts));
    } catch (e) {}
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
        // update metric names now that we have a topology
        if (!this.state.metricNames.length) {
          this.refreshData();
        }
        break;
      case Actions.TOPOLOGY_SELECTED:
        // clear selected data
        this._typeahead.getInstance().clear();
        this.setState({
          metricNames: [],
        });
        break;
    }
  }

  getNodeData(nodeList) {
    // return a list of node names and macs
    let nodesByName = {};
    this.state.topologyJson.nodes.forEach(node => {
      nodesByName[node.name] = node;
    });
    return nodeList.map(nodeName => {
      return nodesByName[nodeName];
    });
  }

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      taGraphs: selectedOpts,
    });
  }

  render() {
    let gridComponents = [];
    let graphOptions = [];
    if (!this.state.topologyJson || !this.state.topologyJson.sites) {
      return (<div>No topology selected</div>);
    }
    // index nodes by name
    let nodeMacList = [];
    let nodeNameList = [];
    Object.keys(this.state.topologyJson.nodes).map(nodeIndex => {
      let node = this.state.topologyJson.nodes[nodeIndex];
      nodeMacList.push(node.mac_addr);
      nodeNameList.push(node.name);
    });
    let nodeMacListStr = nodeMacList.join(",");
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
      nodesByName[node.name] = {
        name: node.name,
        mac_addr: node.mac_addr,
        site_name: node.site_name,
      };
    });
    // construct links
    let links = {};
    let linkRows = [];
    this.state.topologyJson.links.forEach(link => {
      // skipped wired links
      if (link.link_type == 2) {
        return;
      }
      linkRows.push({
        name: link.name,
      });
      links[link.name] = {
        'a_node': {
          'name': link.a_node_name,
          'mac':  nodesByName[link.a_node_name].mac_addr,
        },
        'z_node': {
          'name': link.z_node_name,
          'mac':  nodesByName[link.z_node_name].mac_addr,
        },
      };
    });
    let options = [];
    Object.keys(this.state.metricNames).forEach(key => {
      let metrics = this.state.metricNames[key];
      // add one entry for each metric name (or full key name)
      options.push({
        name: metrics.length > 1 ? key + ' (' + metrics.length + ' nodes)' : key,
        data: metrics,
      });
    });
    let pos = 0;
    let multiGraphs = this.state.taGraphs.map(keyIds => {
      let graphOpts = [{
        type: 'key_ids',
        key_ids: keyIds.data.map(data => data.keyId),
        data: keyIds.data,
      }];
      pos++;
      return (
        <ReactMultiGraph
          options={graphOpts}
          key={pos}
          size="large"/>
      );
    });
    return (
      <div width="800">
        <Typeahead
          labelKey="name"
          multiple
          options={options}
          ref={ref => this._typeahead = ref}
          onChange={this.metricSelectionChanged.bind(this)}
          placeholder="Enter metric/key name"
        />
        {multiGraphs}
      </div>
    );
  }
}
