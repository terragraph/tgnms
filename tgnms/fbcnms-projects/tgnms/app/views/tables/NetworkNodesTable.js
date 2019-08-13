/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import CustomTable from '../../components/common/CustomTable';
import NetworkContext from '../../NetworkContext.js';
import PropTypes from 'prop-types';
import React from 'react';
import {NodeTypeValueMap as NodeType} from '../../../shared/types/Topology';
import {SortDirection} from 'react-virtualized';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {availabilityColor, isNodeAlive} from '../../helpers/NetworkHelpers';
import {renderStatusColor} from '../../helpers/TableHelpers';

// TODO add logic when selecting nodes
export default class NetworkNodesTable extends React.Component {
  state = {
    // Selected elements (derived from NetworkContext)
    selectedNodes: [],
    selectedSite: null,

    // Keep track of current sort state
    sortBy: 'site_name',
    sortDirection: SortDirection.ASC,

    // TODO - this is wrong, should be prop
    nodeHealth: {},
    showEventsChart: false,
  };

  static getDerivedStateFromProps(nextProps, _prevState) {
    // Update selected rows
    const {selectedElement, siteToNodesMap} = nextProps.context;

    if (selectedElement) {
      if (selectedElement.type === TopologyElementType.NODE) {
        return {selectedNodes: [selectedElement.name]};
      } else if (selectedElement.type === TopologyElementType.SITE) {
        return {
          selectedNodes: [...siteToNodesMap[selectedElement.name]],
          selectedSite: selectedElement.name,
        };
      }
    }
    return {selectedNodes: [], selectedSite: null};
  }

  headers = [
    {
      label: 'Name',
      key: 'name',
      isKey: true,
      width: 200,
      sort: true,
      filter: true,
    },
    {label: 'MAC', key: 'mac_addr', width: 160, sort: true, filter: true},
    {
      label: 'IPv6',
      key: 'ipv6',
      width: 180,
      sort: true,
      filter: true,
      render: this.renderNullable.bind(this),
    },
    {label: 'Type', key: 'node_type', width: 80, sort: true},
    {
      label: 'Board ID',
      key: 'hw_board_id',
      width: 180,
      sort: true,
      render: this.renderNullable.bind(this),
    },
    {
      label: 'Alive?',
      key: 'alive',
      width: 90,
      sort: true,
      render: renderStatusColor,
    },
    {
      label: 'Site',
      key: 'site_name',
      width: 160,
      sort: true,
      sortFunc: this.siteSortFunc.bind(this),
    },
    {
      label: 'POP?',
      key: 'pop_node',
      width: 120,
      sort: true,
      render: renderStatusColor,
    },
    {
      label: 'Availability (24hr)',
      key: 'availability',
      width: 140,
      sort: true,
      render: this.renderNodeAvailability.bind(this),
    },
    {
      label: 'Minion Restarts (24hr)',
      key: 'minion_restarts',
      width: 140,
      sort: true,
    },
    {
      label: 'Image Version',
      key: 'version',
      width: 700,
      sort: true,
      render: this.renderNullable.bind(this),
    },
    {
      label: 'Uboot Version',
      key: 'uboot_version',
      width: 700,
      sort: true,
      render: this.renderNullable.bind(this),
    },
  ];

  rowHeight = 60;
  headerHeight = 80;
  overscanRowCount = 10;

  _trimVersionString(v) {
    const releasePrefix = 'RELEASE_ ';
    const index = v.indexOf(releasePrefix);
    return index >= 0 ? v.substring(index) : v;
  }

  getTableRows(
    networkConfig,
  ): Array<{
    name: string,
    mac_addr: string,
    node_type: string,
    alive: boolean,
    site_name: string,
    pop_node: boolean,
    ipv6: string,
    version: string,
    availability: number,
    minion_restarts: number,
    events: array,
    uboot_version: string,
    hw_board_id: string,
  }> {
    const {topology, status_dump} = networkConfig;
    const rows = [];
    topology.nodes.forEach(node => {
      const statusReport =
        status_dump &&
        status_dump.statusReports &&
        status_dump.statusReports.hasOwnProperty(node.mac_addr)
          ? status_dump.statusReports[node.mac_addr]
          : null;
      const ipv6 = statusReport ? statusReport.ipv6Address : null;
      const version = statusReport
        ? this._trimVersionString(statusReport.version)
        : null;
      const ubootVersion =
        statusReport && statusReport.ubootVersion
          ? statusReport.ubootVersion
          : null;
      const hwBoardId =
        statusReport && statusReport.hardwareBoardId
          ? statusReport.hardwareBoardId
          : null;
      let availability = 0;
      let events = [];

      // TODO - nodeHealth isn't populated so we never have data to display
      if (
        this.state.nodeHealth &&
        this.state.nodeHealth.hasOwnProperty('events') &&
        this.state.nodeHealth.events.hasOwnProperty(node.name)
      ) {
        availability = this.state.nodeHealth.events[node.name].linkAlive;
        events = this.state.nodeHealth.events[node.name].events;
      }
      rows.push({
        alive: isNodeAlive(node.status),
        availability,
        events,
        hw_board_id: hwBoardId,
        ipv6,
        key: node.name,
        mac_addr: node.mac_addr,
        minion_restarts: events.length,
        name: node.name,
        node_type: node.node_type === NodeType.DN ? 'DN' : 'CN',
        pop_node: node.pop_node,
        site_name: node.site_name,
        uboot_version: ubootVersion,
        version,
      });
    });
    return rows;
  }

  tableOnRowSelect = row => {
    // Select a row
    const {context} = this.props;
    context.setSelected(TopologyElementType.NODE, row.name);
  };

  siteSortFunc(a, b, order) {
    // order is desc or asc
    const {selectedSite} = this.state;
    if (selectedSite) {
      // Move selected site nodes to the top
      if (a.site_name === selectedSite) {
        return -1;
      } else if (b.site_name === selectedSite) {
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

  tableOnSortChange = (sortBy, sortDirection) => {
    this.setState({
      sortBy,
      sortDirection,
      selectedSite: sortBy === 'site_name' ? this.state.selectedSite : null,
    });
  };

  renderNodeAvailability(cell, _row) {
    const cellColor = availabilityColor(cell);
    const cellText = Math.round(cell * 100) / 100;
    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  }

  renderNullable(cell, _row) {
    if (cell === null) {
      return <span style={{fontStyle: 'italic'}}>Not Available</span>;
    } else {
      return <span>{'' + cell}</span>;
    }
  }

  render() {
    const {context} = this.props;
    const {sortBy, sortDirection, selectedNodes} = this.state;

    return (
      <NetworkContext.Consumer>
        {() => {
          return (
            <CustomTable
              rowHeight={this.rowHeight}
              headerHeight={this.headerHeight}
              overscanRowCount={this.overscanRowCount}
              columns={this.headers}
              data={this.getTableRows(context.networkConfig)}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onRowSelect={row => this.tableOnRowSelect(row)}
              onSortChange={this.tableOnSortChange}
              selected={selectedNodes}
            />
          );
        }}
      </NetworkContext.Consumer>
    );
  }
}

NetworkNodesTable.propTypes = {
  context: PropTypes.object.isRequired,
};
