import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// graphs
import ReactGraph from './ReactGraph.js';
import ReactMultiGraph from './ReactMultiGraph.js';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// layout components
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { SpringGrid } from 'react-stonecutter';
import { ScaleModal } from 'boron';
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
  {
    key: 'mcs',
    name: 'MCS',
    metric: '',
  },
  {
    key: 'snr',
    name: 'SnR',
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
export default class NetworkLinkDashboard extends React.Component {
  state = {
    topologyJson: {},
    // node-specific metrics
    nodesSelected: [],
    nodeMetricsSelected: [],
    // link-specific metrics
    linksSelected: [],
    linkMetricsSelected: [],
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
      case Actions.TOPOLOGY_SELECTED:
        // clear selected data
        this.setState({
          nodesSelected: [],
          nodeMetricsSelected: [],
          linksSelected: [],
          linkMetricsSelected: [],
        });
        break;
    }
  }

  showModal() {
    this.refs.selector.show();
  }

  hideModal() {
    this.refs.selector.hide();
  }

  handleNodeSelect(row, isSelected, evt) {
    let key = row.name;
    let nodes = this.state.nodesSelected;
    if (isSelected) {
      nodes.push(key);
    } else {
      // remove
      let rowIdx = nodes.indexOf(key);
      if (rowIdx >= 0) {
        nodes.splice(rowIdx, 1);
      }
    }
    this.setState({
      nodesSelected: nodes,
    });
  }

  handleNodeMetricSelect(row, isSelected, evt) {
    let key = row.key;
    let metrics = this.state.nodeMetricsSelected;
    if (isSelected) {
      metrics.push(key);
    } else {
      // remove
      let rowIdx = metrics.indexOf(key);
      if (rowIdx >= 0) {
        metrics.splice(rowIdx, 1);
      }
    }
    this.setState({
      nodeMetricsSelected: metrics,
    });
  }

  handleLinkSelect(row, isSelected, evt) {
    let key = row.name;
    let links = this.state.linksSelected;
    if (isSelected) {
      links.push(key);
    } else {
      // remove
      let rowIdx = links.indexOf(key);
      if (rowIdx >= 0) {
        links.splice(rowIdx, 1);
      }
    }
    this.setState({
      linksSelected: links,
    });
  }

  handleLinkMetricSelect(row, isSelected, evt) {
    let key = row.key;
    let metrics = this.state.linkMetricsSelected;
    if (isSelected) {
      metrics.push(key);
    } else {
      // remove
      let rowIdx = metrics.indexOf(key);
      if (rowIdx >= 0) {
        metrics.splice(rowIdx, 1);
      }
    }
    this.setState({
      linkMetricsSelected: metrics,
    });
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

  handleDateEvent(event, picker) {
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
    // add node graphs, by key
    if (this.state.nodesSelected.length &&
        this.state.nodeMetricsSelected.length) {
      this.state.nodeMetricsSelected.forEach(metric => {
        graphOptions.push({
          type: 'node',
          nodes: this.getNodeData(this.state.nodesSelected),
          key: metric,
        });
      });
    }
    // add link graphs, one per key comparing the sides of the link
    if (this.state.linksSelected.length &&
        this.state.linkMetricsSelected.length) {
      this.state.linksSelected.forEach(linkName => {
        if (links[linkName] != undefined) {
          let link = links[linkName];
          graphOptions.push({
            type: 'link',
            label: link.a_node.name + ' <-> ' + link.z_node.name,
            a_node: link.a_node,
            z_node: link.z_node,
            keys: this.state.linkMetricsSelected,
          });
        }
      });
    }
    const selectNodeOpts = {
      mode: 'checkbox',
      clickToSelect: true,
      bgColor: '#3E525C',
      hideSelectColumn: true,
      selected: this.state.nodesSelected,
      onSelect: this.handleNodeSelect.bind(this),
    };
    const selectNodeMetricOpts = {
      mode: 'checkbox',
      clickToSelect: true,
      bgColor: '#3E525C',
      hideSelectColumn: true,
      selected: this.state.nodeMetricsSelected,
      onSelect: this.handleNodeMetricSelect.bind(this),
    };
    const selectLinkOpts = {
      mode: 'checkbox',
      clickToSelect: true,
      bgColor: '#3E525C',
      hideSelectColumn: true,
      selected: this.state.linksSelected,
      onSelect: this.handleLinkSelect.bind(this),
    };
    const selectLinkMetricOpts = {
      mode: 'checkbox',
      clickToSelect: true,
      bgColor: '#3E525C',
      hideSelectColumn: true,
      selected: this.state.linkMetricsSelected,
      onSelect: this.handleLinkMetricSelect.bind(this),
    };
    const modalStyle = {
      width: '800px',
    };
    const containerStyle = {
      width: '400px',
      fontSize: '11px',
    };
    let timePickerOpts = TIME_PICKER_OPTS.map(opts => {
      return (
        <button key={opts.minAgo}
                onClick={clickAction => this.setState({minAgo: opts.minAgo})}>
          {opts.label}
        </button>
      );
    });
    return (
      <div width="800">
        <button onClick={this.showModal.bind(this)}>Edit Graphs</button>
        <ReactMultiGraph
          options={graphOptions}
          size="large" />
        <ScaleModal ref="selector" modalStyle={modalStyle}>
          <h2 style={{textAlign: 'center'}}>Metric Selector</h2>
          <SpringGrid
            component="ul"
            className="dashboard-grid"
            columns={2}
            columnWidth={400}
            gutterWidth={1}
            gutterHeight={1}
            itemHeight={400}>
            <li key="nodeLeft" width="400">
              <div style={{textAlign: 'center'}}>Node Selector</div>
              <BootstrapTable
                  key="nodeSelector"
                  height="200"
                  width={200}
                  selectRow={selectNodeOpts}
                  containerStyle={containerStyle}
                  data={this.state.topologyJson.nodes}>
                <TableHeaderColumn dataField="name" width="100" isKey={true}>
                  Name
                </TableHeaderColumn>
                <TableHeaderColumn dataField="mac_addr" width="100">
                  MAC
                </TableHeaderColumn>
                <TableHeaderColumn dataField="site_name" width="50">
                  Site
                </TableHeaderColumn>
              </BootstrapTable>
              <BootstrapTable
                  key="nodeMetricSelector"
                  selectRow={selectNodeMetricOpts}
                  containerStyle={containerStyle}
                  data={NODE_METRICS}>
                <TableHeaderColumn dataField="key" isKey={true} hidden>
                  Key
                </TableHeaderColumn>
                <TableHeaderColumn dataField="name" width="200">
                  Name
                </TableHeaderColumn>
              </BootstrapTable>
            </li>
            <li key="linkRight">
              <div style={{textAlign: 'center'}}>Link Selector</div>
              <BootstrapTable
                  key="linkSelector"
                  height="200"
                  selectRow={selectLinkOpts}
                  containerStyle={containerStyle}
                  data={linkRows}>
                <TableHeaderColumn dataField="name" width="200" isKey={true}>
                  Name
                </TableHeaderColumn>
                <TableHeaderColumn dataField="site_name" width="100">
                  Site
                </TableHeaderColumn>
              </BootstrapTable>
              <BootstrapTable
                  key="linkMetricSelector"
                  selectRow={selectLinkMetricOpts}
                  containerStyle={containerStyle}
                  data={LINK_METRICS}>
                <TableHeaderColumn dataField="key" isKey={true} hidden>
                  Key
                </TableHeaderColumn>
                <TableHeaderColumn dataField="name" width="200">
                  Name
                </TableHeaderColumn>
              </BootstrapTable>
            </li>
          </SpringGrid>
          <button onClick={this.hideModal.bind(this)}>Close</button>
        </ScaleModal>
      </div>
    );
  }
}

