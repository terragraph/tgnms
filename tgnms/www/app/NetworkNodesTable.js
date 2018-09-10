/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from './NetworkDispatcher.js';
// dispatcher
import {availabilityColor} from './helpers/NetworkHelpers.js';
import ReactEventChart from './ReactEventChart.js';
import {Actions} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import PropTypes from 'prop-types';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';

// leaflet maps
import React from 'react';
import CustomTable from './components/common/CustomTable.js';
import {SortDirection} from 'react-virtualized';

export default class NetworkNodesTable extends React.Component {
  state = {
    filters: {},
    nodeHealth: NetworkStore.nodeHealth,
    nodesSelected: [],
    selectedNodeSite: null,
    showEventsChart: false,
    sortBy: null,
    sortDirection: SortDirection.ASC,
  };

  headers = [
    {
      label: 'Name',
      key: 'name',
      isKey: true,
      width: 170,
      sort: true,
      filter: true,
    },
    {label: 'MAC', key: 'mac_addr', width: 160, sort: true, filter: true},
    {label: 'IPv6', key: 'ipv6', width: 180, sort: true, filter: true},
    {label: 'Type', key: 'node_type', width: 80, sort: true},
    {
      label: 'Ignited',
      key: 'ignited',
      width: 90,
      sort: true,
      render: this.renderStatusColor,
    },
    {
      label: 'Site',
      key: 'site_name',
      width: 160,
      sort: true,
      sortFunc: this.siteSortFunc.bind(this),
    },
    {
      label: 'Pop?',
      key: 'pop_node',
      width: 80,
      sort: true,
      render: this.renderStatusColor,
    },
    {
      label: 'Availability (24 hours)',
      key: 'availability',
      width: 100,
      sort: true,
      render: this.renderNodeAvailability,
    },
    {
      label: 'Minion Restarts (24 hours)',
      key: 'minion_restarts',
      width: 120,
      sort: true,
    },
    {label: 'Image Version', key: 'version', width: 700, sort: true},
    {label: 'Uboot Version', key: 'uboot_version', width: 700, sort: true},
  ];

  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);

    // fetch selected site from store
    if (NetworkStore.selectedName) {
      const selectedRows = [];
      Object.keys(this.props.topology.nodes).map(nodeIndex => {
        const node = this.props.topology.nodes[nodeIndex];
        if (node.site_name === NetworkStore.selectedName) {
          selectedRows.push(node.name);
        }
      });

      this.state.sortBy = 'site_name';
      this.state.sortDirection = SortDirection.DESC;
      this.state.selectedSiteName = NetworkStore.selectedName;
      this.state.selectedNodeSite = NetworkStore.selectedName;
      this.state.nodesSelected = selectedRows;
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
    switch (payload.actionType) {
      case Actions.NODE_SELECTED:
        this.setState({
          nodesSelected: [payload.nodeSelected],
        });
        break;
      case Actions.SITE_SELECTED:
        const selectedRows = [];
        Object.keys(this.props.topology.nodes).map(nodeIndex => {
          const node = this.props.topology.nodes[nodeIndex];
          if (node.site_name === payload.siteSelected) {
            selectedRows.push(node.name);
          }
        });
        this.setState({
          nodesSelected: selectedRows,
          selectedNodeSite: payload.siteSelected,
          selectedSiteName: payload.siteSelected,
          sortBy: 'site_name',
          sortDirection: SortDirection.DESC,
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        // Remove isSelected field from all nodes
        this.setState({
          nodesSelected: null,
          selectedLink: null,
        });
        break;
      case Actions.NODE_HEALTH_REFRESHED:
        // Update nodes with new nodeHealth data
        this.setState({
          nodeHealth: payload.nodeHealth,
        });
        break;
    }
  }

  _trimVersionString(v) {
    const prefix = 'Facebook Terragraph Release ';
    return v.indexOf(prefix) >= 0 ? v.substring(prefix.length) : v;
  }

  getTableRows(
    nodes,
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
      const ipv6 = node.status_dump
        ? node.status_dump.ipv6Address
        : 'Not Available';
      const version = node.status_dump
        ? this._trimVersionString(node.status_dump.version)
        : 'Not Available';
      const ubootVersion =
        node.status_dump && node.status_dump.uboot_version
          ? node.status_dump.uboot_version
          : 'Not Available';
      let availability = 0;
      let events = [];
      if (
        this.state.nodeHealth &&
        this.state.nodeHealth.hasOwnProperty(node.name)
      ) {
        availability = this.state.nodeHealth[node.name].alive;
        events = this.state.nodeHealth[node.name].events;
      }
      rows.push({
        availability,
        events,
        ignited: node.status === 2 || node.status === 3,
        ipv6,
        key: node.name,
        mac_addr: node.mac_addr,
        minion_restarts: events.length,
        name: node.name,
        node_type: node.node_type === 2 ? 'DN' : 'CN',
        pop_node: node.pop_node,
        site_name: node.site_name,
        uboot_version: ubootVersion,
        version,
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
      selectedLink: null,
      selectedTabIndex: index,
    });
    // TODO - should we null the selected node?
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_NODE_LINK_SELECTED,
    });
  }

  siteSortFunc(a, b, order) {
    // order is desc or asc
    if (this.state.selectedSiteName) {
      if (a.site_name === this.state.selectedSiteName) {
        return -1;
      } else if (b.site_name === this.state.selectedSiteName) {
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

  tableOnSortChange(sortBy, sortDirection) {
    this.setState({selectedSiteName: undefined, sortBy, sortDirection});
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
          endTime={this.state.nodeHealth.end}
          events={row.events}
          size="small"
          startTime={this.state.nodeHealth.start}
        />
      );
    }
    return null;
  }

  renderNodeAvailability(cell, row) {
    const cellColor = availabilityColor(cell);
    const cellText = Math.round(cell * 100) / 100;
    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  }

  render() {
    let nodesTable;
    const selectRowProp = {
      bgColor: 'rgb(183,210,255)',
      clickToSelect: true,
      hideSelectColumn: true,
      mode: 'checkbox',
      onSelect: this.tableOnRowSelect,
      selected: this.state.nodesSelected,
    };

    const tableOptions = {
      onRowMouseOver: this.tableOnRowMouseOver,
      onSortChange: this.tableOnSortChange,
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      trClassName: 'break-word',
    };

    let nodesData = [];
    if (this.props.topology && this.props.topology.nodes) {
      nodesData = this.props.topology.nodes;
    }

    // disabled since perf is too slow in sjc
    if (this.state.showEventsChart && false) {
      nodesTable = (
        <BootstrapTable
          height={this.props.height + 'px'}
          key="nodesTable"
          options={tableOptions}
          data={this.getTableRows(nodesData)}
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
          data={this.getTableRows(nodesData)}
          sortBy={this.state.sortBy}
          sortDirection={this.state.sortDirection}
          onRowSelect={row => this.tableOnRowSelect(row)}
          onSortChange={(sortBy, sortDirection) =>
            this.tableOnSortChange(sortBy, sortDirection)
          }
          selected={this.state.nodesSelected}
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
