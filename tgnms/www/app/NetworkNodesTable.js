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
import {render} from 'react-dom';
import React from 'react';

export default class NetworkNodesTable extends React.Component {
  state = {
    selectedNodeSite: null,
    nodesSelected: [],
    nodeHealth: NetworkStore.nodeHealth,
    showEventsChart: false,
  };

  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);
    this.siteSortFunc = this.siteSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
    this.tableOnRowMouseOver = this.tableOnRowMouseOver.bind(this);
  }

  UNSAFE_componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    // fetch selected site from store
    if (NetworkStore.selectedName) {
      const selectedRows = [];
      Object.keys(this.props.topology.nodes).map(nodeIndex => {
        const node = this.props.topology.nodes[nodeIndex];
        if (node.site_name == NetworkStore.selectedName) {
          selectedRows.push(node.name);
        }
      });
      this.setState({
        sortName: 'site_name',
        sortOrder: 'desc',
        selectedSiteName: NetworkStore.selectedName,
        selectedNodeSite: NetworkStore.selectedName,
        nodesSelected: selectedRows,
      });
    }
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
          if (node.site_name == payload.siteSelected) {
            selectedRows.push(node.name);
          }
        });
        this.setState({
          sortName: 'site_name',
          sortOrder: 'desc',
          selectedSiteName: payload.siteSelected,
          selectedNodeSite: payload.siteSelected,
          nodesSelected: selectedRows,
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          nodesSelected: null,
          selectedLink: null,
        });
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          nodeHealth: payload.nodeHealth,
        });
        break;
    }
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
        ? node.status_dump.version.slice(28)
        : 'Not Available';
      const ubootVersion =
        node.status_dump && node.status_dump.uboot_version
          ? node.status_dump.uboot_version
          : 'Not Available';
      let availability = 0;
      let events = [];
      if (
        this.state.nodeHealth &&
        this.state.nodeHealth.hasOwnProperty('metrics') &&
        this.state.nodeHealth.metrics.hasOwnProperty(node.mac_addr)
      ) {
        availability = this.state.nodeHealth.metrics[node.mac_addr].minion_uptime;
        events = this.state.nodeHealth.metrics[node.mac_addr].events;
      }
      rows.push({
        name: node.name,
        mac_addr: node.mac_addr,
        node_type: node.node_type == 2 ? 'DN' : 'CN',
        ignited: node.status == 2 || node.status == 3,
        site_name: node.site_name,
        pop_node: node.pop_node,
        ipv6,
        version,
        uboot_version: ubootVersion,
        key: node.name,
        availability,
        events,
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

  siteSortFunc(a, b, order) {
    // order is desc or asc
    if (this.state.selectedSiteName) {
      if (a.site_name == this.state.selectedSiteName) {
        return -1;
      } else if (b.site_name == this.state.selectedSiteName) {
        return 1;
      }
    }

    if (order === 'desc') {
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

  tableOnRowMouseOver(row, e) {
    this.setState({
      nodesRowMouseOver: row,
    });
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

  render() {
    const selectRowProp = {
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
    let nodesTable;
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
            width="170"
            dataSort={true}
            dataField="name"
            isKey={true}>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn width="160" dataSort={true} dataField="mac_addr">
            MAC
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataSort={true} dataField="ipv6">
            IPv6
          </TableHeaderColumn>
          <TableHeaderColumn width="80" dataSort={true} dataField="node_type">
            Type
          </TableHeaderColumn>
          <TableHeaderColumn
            width="90"
            dataSort={true}
            dataField="ignited"
            dataFormat={this.renderStatusColor}>
            Ignited
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataField="site_name"
            sortFunc={this.siteSortFunc}>
            Site
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataField="pop_node"
            dataFormat={this.renderStatusColor}>
            Pop?
          </TableHeaderColumn>
          <TableHeaderColumn
            width="100"
            dataSort={true}
            dataField="availability"
            dataFormat={this.renderNodeAvailability.bind(this)}>
            Availability (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="minion_restarts">
            Minion Restarts (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn width="700" dataSort={true} dataField="version">
            Image Version
          </TableHeaderColumn>
          <TableHeaderColumn
            width="700"
            dataSort={true}
            dataField="uboot_version">
            Uboot Version
          </TableHeaderColumn>
        </BootstrapTable>
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
