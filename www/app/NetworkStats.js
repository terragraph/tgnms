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
import { Menu, MenuItem, Token, Typeahead } from 'react-bootstrap-typeahead';
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

const MenuDivider = props => <li className="divider" role="separator" />;
const MenuHeader = props => <li {...props} className="dropdown-header" />;

export default class NetworkStats extends React.Component {
  state = {
    topologyJson: {},
    // type-ahead data
    siteMetrics: {},
    // filters
    siteNames: [],
    linkNames: [],
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
      this.setState({
        siteMetrics: data.site_metrics,
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
        if (!this.state.siteMetrics) {
          this.refreshData();
        }
        break;
      case Actions.TOPOLOGY_SELECTED:
        // clear selected data
        this._typeaheadNode.getInstance().clear();
        this._typeaheadKey.getInstance().clear();
        this.setState({
          siteMetrics: {},
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

  nodeSelectionChanged(selectedOpts) {
    let siteNames = [];
    let linkNames = [];
    selectedOpts.forEach(opts => {
      if (opts.restrictor.siteName) {
        siteNames.push(opts.restrictor.siteName);
      }
      if (opts.restrictor.linkName) {
        linkNames.push(opts.restrictor.linkName);
      }
    });
    // restrict metric/key data
    this.setState({
      siteNames: siteNames,
      linkNames: linkNames,
    });
    // clear key list
    this._typeaheadKey.getInstance().clear();
  }

  renderTypeaheadRestrictorMenu(results, menuProps) {
    let i = 0;
    const items = results.map(item => {
      i++;
      if (item.type) {
        return [
          <MenuDivider key={"divider" + i} />,
          <MenuHeader key={"header" + i}>{item.type}</MenuHeader>,
          <MenuItem option={item} key={"item" + i}>{item.name}</MenuItem>
        ];
      }
      return [
        <MenuItem option={item} key={"item" + i}>{item.name}</MenuItem>
      ];
    });
    return <Menu {...menuProps}>{items}</Menu>;
  }

  renderTypeaheadKeyMenu(option, props, index) {
    if (option.data.length > 1) {
      return [
        <strong key="name">{option.name}</strong>,
        <div key="data">
          Nodes: {option.data.length}
        </div>
      ];
    }
    return [
      <strong key="name">{option.name}</strong>,
      <div key="data">
        Site: {option.data[0].siteName}
      </div>
    ];
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
    let keyOptions = [];
    let uniqMetricNames = {};
    Object.keys(this.state.siteMetrics).forEach(siteName => {
      if (this.state.siteNames.length &&
          !this.state.siteNames.includes(siteName)) {
        return;
      }
      let nodeMetrics = this.state.siteMetrics[siteName];
      Object.keys(nodeMetrics).forEach(nodeName => {
        let metrics = nodeMetrics[nodeName];
        // filter metrics
        Object.keys(metrics).forEach(metricName => {
          let metric = metrics[metricName];
          if (this.state.linkNames.length &&
              (!metric.linkName ||
               !this.state.linkNames.includes(metric.linkName))) {
            return;
          }
          let newKey = metric.displayName ? metric.displayName : metricName;
          if (!(newKey in uniqMetricNames)) {
            uniqMetricNames[newKey] = [];
          }
          let rowData = {
            key: newKey,
            node: nodeName,
            keyId: metric.dbKeyId,
            nodeName: nodeName,
            siteName: siteName,
            displayName: metric.displayName ? metric.displayName : '',
            linkName: metric.linkName ? metric.linkName : '',
          };
          uniqMetricNames[newKey].push(rowData);
        });
      });
      // add one entry for each metric name (or full key name)
    });
    Object.keys(uniqMetricNames).forEach(metricName => {
      let metrics = uniqMetricNames[metricName];
      keyOptions.push({
        name: metricName,
        data: metrics,
      });
    });
    // add the list of node restrictors
    let nodeOptions = [];
    let i = 0;
    this.state.topologyJson.sites.forEach(site => {
      nodeOptions.push({
        name: "Site " + site.name,
        type: !i ? 'Sites' : '',
        restrictor: {
          siteName: site.name,
        },
      });
      i++;
    });
    i = 0;
    this.state.topologyJson.links.forEach(link => {
      // skip wired links
      if (link.link_type == 2) {
        return;
      }
      nodeOptions.push({
        name: "Link " + link.a_node_name + " <-> " + link.z_node_name,
        type: !i ? 'Links' : '',
        restrictor: {
          linkName: link.name,
        },
      });
      i++;
    });
    // all graphs
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
          key="nodes"
          labelKey="name"
          multiple
          options={nodeOptions}
          ref={ref => this._typeaheadNode = ref}
          renderMenu={this.renderTypeaheadRestrictorMenu.bind(this)}
          paginate={true}
          onChange={this.nodeSelectionChanged.bind(this)}
          placeholder="Node Options"
        />
        <Typeahead
          key="keys"
          labelKey="name"
          multiple
          options={keyOptions}
          ref={ref => this._typeaheadKey = ref}
          renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(this)}
          paginate={true}
          onChange={this.metricSelectionChanged.bind(this)}
          placeholder="Enter metric/key name"
        />
        {multiGraphs}
      </div>
    );
  }
}
