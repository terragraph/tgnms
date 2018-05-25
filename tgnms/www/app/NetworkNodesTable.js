/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from './NetworkDispatcher.js';
// dispatcher
import {availabilityColor} from './NetworkHelper.js';
import ReactEventChart from './ReactEventChart.js';
import {Actions} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import PropTypes from 'prop-types';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';

// leaflet maps
import React from 'react';
import CustomTable from './components/common/CustomTable.js';
import {SortDirection} from 'react-virtualized'

export default class NetworkNodesTable extends React.Component {
  state = {
    selectedNodeSite: null,
    nodesSelected: [],
    nodeHealth: NetworkStore.nodeHealth,
    showEventsChart: false,
    hoveredRowIndex: -1,
    sortBy: null,
    sortDirection: SortDirection.ASC,
  };

  headers = [
    {label: 'Name', key: 'name', width: 170, sort: true},
    {label: 'MAC', key: 'mac_addr', width: 160, sort: true},
    {label: 'IPv6', key: 'ipv6', width: 180, sort: true},
    {label: 'Type', key: 'node_type', width: 80, sort: true},
    {label: 'Ignited', key: 'ignited', width: 90, sort: true, render: this.renderStatusColor},
    {label: 'Site', key: 'site_name', width: 80, sort: true},
    {label: 'Pop?', key: 'pop_node', width: 80, sort: true, render: this.renderStatusColor},
    {label: 'Availability (24 hours)', key: 'availability', width: 100, sort: true, render: this.renderNodeAvailability},
    {label: 'Minion Restarts (24 hours)', key: 'minion_restarts', width: 120, sort: true},
    {label: 'Image Version', key: 'version', width: 700, sort: true},
    {label: 'Uboot Version', key: 'uboot_version', width: 700, sort: true},
  ];

  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);

    this.state.sortedNodes = NetworkNodesTable.getTableRows(
      this.props.topology.nodes,
      NetworkStore.nodeHealth
    );

    // fetch selected site from store
    if (NetworkStore.selectedName) {
      var selectedRows = [];
      Object.keys(this.props.topology.nodes).map(nodeIndex => {
        const node = this.props.topology.nodes[nodeIndex];
        if (node.site_name === NetworkStore.selectedName) {
          selectedRows.push(node.name);
        }
      });

      const newState = {
        selectedSiteName: NetworkStore.selectedName,
        selectedNodeSite: NetworkStore.selectedName,
        nodesSelected: selectedRows,
        sortBy: 'site_name',
        sortDirection: SortDirection.DESC,
      };
      Object.assign(this.state, {
        ...newState,
        ...this.getNewSortedNodes(newState),
      });
    }
  }

  componentDidMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    let newState, stateUpdate;
    let sortedNodes = [];

    switch (payload.actionType) {
      case Actions.NODE_SELECTED:
        sortedNodes = this.state.sortedNodes.slice();
        sortedNodes.forEach(node => {
          node.isSelected = node.name === payload.nodeSelected;
        });
        this.setState({
          nodesSelected: [payload.nodeSelected],
          sortedNodes: sortedNodes,
        });
        break;
      case Actions.SITE_SELECTED:
        var selectedRows = [];
        Object.keys(this.props.topology.nodes).map(nodeIndex => {
          const node = this.props.topology.nodes[nodeIndex];
          if (node.site_name === payload.siteSelected) {
            selectedRows.push(node.name);
          }
        });

        newState = {
          selectedSiteName: payload.siteSelected,
          selectedNodeSite: payload.siteSelected,
          nodesSelected: selectedRows,
          sortBy: 'site_name',
          sortDirection: SortDirection.DESC,
        }
        this.setState({
          ...newState,
          ...this.getNewSortedNodes(newState),
          sortName: 'site_name',
          sortOrder: 'desc',
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        // Remove isSelected field from all nodes
        sortedNodes = this.state.sortedNodes.slice();
        sortedNodes.forEach(node => {node.isSelected = false});
        this.setState({
          nodesSelected: null,
          selectedLink: null,
          sortedNodes: sortedNodes,
        });
        break;
      case Actions.HEALTH_REFRESHED:
        // Update nodes with new nodeHealth data
        newState = {nodeHealth: payload.nodeHealth};
        this.setState({
          ...stateUpdate,
          ...this.getNewSortedNodes(newState),
        });
        break;
    }
  }

  static getTableRows(
    nodes,
    nodeHealth
  ): Array<{
    name: string,
    mac_addr: string,
    node_type: string,
    ignited: boolean,
    site_name: string,
    pop_node: boolean,
    ipv6: string,
    version: string,
    availability: number,
    minion_restarts: number,
    events: array,
    uboot_version: string,
  }> {
    const rows = [];
    nodes.forEach(node => {
      var ipv6 = node.status_dump
        ? node.status_dump.ipv6Address
        : 'Not Available';
      var version = node.status_dump
        ? node.status_dump.version.slice(28)
        : 'Not Available';
      var ubootVersion =
        node.status_dump && node.status_dump.uboot_version
          ? node.status_dump.uboot_version
          : 'Not Available';
      let availability = 0;
      let events = [];
      if (
        nodeHealth &&
        'metrics' in nodeHealth &&
        node.name in nodeHealth.metrics
      ) {
        availability = nodeHealth.metrics[node.name].minion_uptime;
        events = nodeHealth.metrics[node.name].events;
      }
      rows.push({
        name: node.name,
        mac_addr: node.mac_addr,
        node_type: node.node_type === 2 ? 'DN' : 'CN',
        ignited: node.status === 2 || node.status === 3,
        site_name: node.site_name,
        pop_node: node.pop_node,
        ipv6: ipv6,
        version: version,
        uboot_version: ubootVersion,
        key: node.name,
        availability: availability,
        events: events,
        minion_restarts: events.length,
      });
    });
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    // dispatch event for the map
    Dispatcher.dispatch({
      actionType: Actions.NODE_SELECTED,
      nodeSelected: row.name,
      source: 'table',
    });
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

  static siteSortFunc(a, b, order, selectedSiteName) {
    // order is desc or asc
    if (selectedSiteName) {
      if (a.site_name === selectedSiteName) {
        return -1;
      } else if (b.site_name === selectedSiteName) {
        return 1;
      }
    }

    if (order === SortDirection.DESC) {
      if (a.site_name > b.site_name) {
        return -1;
      } else if (a.site_name < b.site_name) {
        return 1;
      }
      return 0;
    } else {
      if (a.site_name < b.site_name) {
        return -1;
      } else if (a.site_name > b.site_name) {
        return 1;
      }
      return 0;
    }
  }

  tableOnSortChange(sortName, sortOrder) {
    this.setState({sortName, sortOrder, selectedSiteName: undefined});
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {'' + cell}
      </span>
    );
  }

  renderNodeAvailabilityChart(cell, row) {
    if (row.events.length > 0) {
      return (
        <ReactEventChart
          events={row.events}
          startTime={this.state.nodeHealth.start}
          endTime={this.state.nodeHealth.end}
          size="small"
        />
      );
    }
  }

  renderNodeAvailability(cell, row) {
    const cellColor = availabilityColor(cell);
    const cellText = Math.round(cell * 100) / 100;
    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  }


  static getDerivedStateFromProps(nextProps, prevState) {
    // Recompute sorted nodes
    if (nextProps.topology && nextProps.topology.nodes) {
      return NetworkNodesTable.getSortedNodes(nextProps.topology, prevState);
    }
    return null;
  }

  /**
   * getSortedNodes() returns the new sorted nodes based on the passed-in
   * `topology` and `state`
   */
  static getSortedNodes(topology, state) {
    const sortedNodes = NetworkNodesTable.sortNodes(
      NetworkNodesTable.getTableRows(
        topology.nodes,
        state.nodeHealth
      ),
      state.sortBy,
      state.sortDirection,
      state.selectedSiteName,
    );

    sortedNodes.forEach(node => {
      node.isSelected = state.nodesSelected.includes(node.name);
    });

    return {
      sortedNodes: sortedNodes,
    }
  }

  /**
   * getNewSortedNodes() returns an updated sorted nodes list based on the
   * passed-in object `newState` that is merged with the current `this.state`.
   * `newState` should be an object that could be passed into setState. This
   * uses both `this.state` and `this.props.topology`.
   */
  getNewSortedNodes(newState) {
    const stateCopy = Object.assign({}, this.state);
    return NetworkNodesTable.getSortedNodes(
      this.props.topology,
      Object.assign(stateCopy, newState),
    );
  }

  static sortNodesHelper(a, b, sortBy, sortDirection) {
    let ret = 0;
    if (a[sortBy] < b[sortBy]) {
      ret = -1;
    }

    if (a[sortBy] > b[sortBy]) {
      ret = 1;
    }

    return sortDirection === SortDirection.ASC ? ret : 0 - ret;
  }

  static sortNodes(nodes, sortBy, sortDirection, selectedSiteName) {
    return nodes.sort((a, b) => {
      if (sortBy === 'site_name') {
        return NetworkNodesTable.siteSortFunc(
          a, b, sortDirection, selectedSiteName);
      } else {
        return NetworkNodesTable.sortNodesHelper(a, b, sortBy, sortDirection);
      }
    });
  }

  sortFunction({sortBy, sortDirection}) {
    const sortedNodes = NetworkNodesTable.sortNodes(
      NetworkNodesTable.getTableRows(
        this.props.topology.nodes,
        this.state.nodeHealth,
      ),
      sortBy,
      sortDirection,
      this.state.selectedSiteName,
    );

    this.setState({
      selectedSiteName: undefined,
      sortBy: sortBy,
      sortDirection: sortDirection,
      sortedNodes: sortedNodes,
    });
  }

  render() {
    let nodesTable;
    // disabled since perf is too slow in sjc
    if (this.state.showEventsChart && false) {
      var selectRowProp = {
        mode: 'checkbox',
        clickToSelect: true,
        hideSelectColumn: true,
        bgColor: 'rgb(183,210,255)',
        onSelect: this.tableOnRowSelect,
        selected: this.state.nodesSelected,
      };

      const tableOptions = {
        sortName: this.state.sortName,
        sortOrder: this.state.sortOrder,
        onSortChange: this.tableOnSortChange,
        onRowMouseOver: this.tableOnRowMouseOver,
        trClassName: 'break-word',
      };

      let nodesData = [];
      if (this.props.topology && this.props.topology.nodes) {
        nodesData = this.props.topology.nodes;
      }

      nodesTable = (
        <BootstrapTable
          height={this.props.height + 'px'}
          key="nodesTable"
          options={tableOptions}
          data={
            NetworkNodesTable.getTableRows(nodesData, this.state.nodeHealth)
          }
          striped={true}
          hover={true}
          selectRow={selectRowProp}
          trClassName="break-word">
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="name"
            isKey={true}>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn
            width="90"
            dataSort={true}
            dataField="ignited"
            dataFormat={this.renderStatusColor}>
            Ignited
          </TableHeaderColumn>
          <TableHeaderColumn
            width="700"
            dataField="availability"
            dataFormat={this.renderNodeAvailabilityChart.bind(this)}>
            Availability (24 hours)
          </TableHeaderColumn>
        </BootstrapTable>
      );
    } else {
      const rowHeight = 40;
      const headerHeight = 80;
      const height = this.props.height;
      const overscanRowCount = 10;
      nodesTable = (
        <CustomTable
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          height={height}
          overscanRowCount={overscanRowCount}
          columns={this.headers}
          data={this.state.sortedNodes}
          sortFunction={(stuff) => this.sortFunction(stuff)}
          sortBy={this.state.sortBy}
          sortDirection={this.state.sortDirection}
          onRowSelect={row => this.tableOnRowSelect(row)}
        />
      );
    }

    // event chart disable for now, too resource intensive
    /*        <button className={this.state.showEventsChart ? 'graph-button graph-button-selected' : 'graph-button'}
                onClick={btn => this.setState({showEventsChart: !this.state.showEventsChart})}>
          Show E2E Events
        </button>*/
    return <div>{nodesTable}</div>;
  }
}
NetworkNodesTable.propTypes = {
  topology: PropTypes.object.isRequired,
};
