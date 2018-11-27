/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {Actions, LinkOverlayKeys} from './constants/NetworkConstants.js';
import CustomTable from './components/common/CustomTable.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './stores/NetworkStore.js';
import PropTypes from 'prop-types';
import React from 'react';
import {SortDirection} from 'react-virtualized';

const LINK_OVERLAY_NAME = 'TestHealth';

export default class NetworkTestsTable extends React.Component {
  state = {
    testId: NetworkStore.networkTestId,
    results: NetworkStore.networkTestResults,
    selectedLink: NetworkStore.selectedName,
    sortBy: null,
    sortDirection: SortDirection.ASC,
    topLink: null,
  };

  headers = [
    {
      label: 'Name',
      key: 'name',
      isKey: true,
      width: 170,
      sort: true,
      filter: true,
      sortFunc: this.linkSortFunc.bind(this),
    },
    {
      label: 'A-Node',
      key: 'a_node_name',
      width: 100,
      sort: true,
      filter: true,
    },
    {
      label: 'Z-Node',
      key: 'z_node_name',
      width: 100,
      sort: true,
      filter: true,
    },
    {
      label: 'Health',
      key: 'health',
      width: 90,
      sort: true,
      render: this.renderHealth,
    },
    {
      label: 'Throughput Min',
      key: 'iperf_throughput_min',
      width: 90,
      sort: true,
      render: this.renderThroughput,
    },
    {
      label: 'Throughput Mean',
      key: 'iperf_throughput_mean',
      width: 90,
      sort: true,
      render: this.renderThroughput,
    },
    {
      label: 'Throughput Max',
      key: 'iperf_throughput_max',
      width: 90,
      sort: true,
      render: this.renderThroughput,
    },
    {
      label: 'Throughput Std',
      key: 'iperf_throughput_std',
      width: 90,
      sort: true,
      render: this.renderThroughput,
    },
  ];

  constructor(props) {
    super(props);
    this.linkSortFunc = this.linkSortFunc.bind(this);
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
      case Actions.NETWORK_TEST_SELECTED:
        this.setState({
          testId: payload.testId,
        });
        break;
      case Actions.NETWORK_TEST_DATA_LOADED:
        this.setState({
          results: payload.results,
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          selectedLink: payload.link,
          topLink:
            payload.source === 'table' ? this.state.topLink : payload.link,
          sortBy: payload.source === 'table' ? this.state.sortBy : 'name',
          sortDirection:
            payload.source === 'table'
              ? this.state.sortDirection
              : SortDirection.ASC,
        });
        break;
    }
  }

  getTableRows(
    links,
  ): Array<{
    name: string,
    a_node_name: string,
    z_node_name: string,
    health: int,
    origin_node: string,
    peer_node: string,
    iperf_throughput_min: number,
    iperf_throughput_mean: number,
    iperf_throughput_max: number,
    iperf_throughput_std: number,
    linkData: object,
  }> {
    const rows = [];
    Object.keys(links).forEach(linkName => {
      const linkDirections = links[linkName];
      Object.keys(linkDirections).forEach(linkDirection => {
        const link = linkDirections[linkDirection];
        rows.push({
          name: linkName,
          a_node_name:
            linkDirection == 'A'
              ? link.linkData.a_node_name
              : link.linkData.z_node_name,
          z_node_name:
            linkDirection == 'A'
              ? link.linkData.z_node_name
              : link.linkData.a_node_name,
          health: link.health,
          origin_node: link.origin_node,
          peer_node: link.peer_node,
          iperf_throughput_min: link.iperf_throughput_min,
          iperf_throughput_mean: link.iperf_throughput_mean,
          iperf_throughput_max: link.iperf_throughput_max,
          iperf_throughput_std: link.iperf_throughput_std,
          linkData: link.linkData,
        });
      });
    });
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    // dispatch event for the map
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: row.linkData,
      source: 'table',
    });
  }

  linkSortFunc(a, b, order) {
    // order is desc or asc
    if (this.state.topLink) {
      if (a.name === this.state.topLink.name) {
        if (a.name === b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return -1;
        }
      } else if (b.name === this.state.topLink.name) {
        if (a.name === b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return 1;
        }
      }
    }
    return this.linkSortFuncHelper(a, b, order);
  }

  linkSortFuncHelper(a, b, order) {
    if (order === SortDirection.DESC) {
      if (a.name > b.name) {
        return -1;
      } else if (a.name < b.name) {
        return 1;
      }
      // both entries have the same name, sort based on a/z node name
      if (a.a_node_name > a.z_node_name) {
        return -1;
      } else {
        return 1;
      }
    } else {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }
      // both entries have the same name, sort based on a/z node name
      if (a.a_node_name < a.z_node_name) {
        return -1;
      } else {
        return 1;
      }
    }
  }

  onSortChange(sortBy, sortDirection) {
    this.setState({
      sortBy,
      sortDirection,
      //topLink: this.state.topLink,
    });
  }

  renderThroughput(cell, row) {
    if (cell === null) {
      return <span style={{fontStyle: 'italic'}}>Not Available</span>;
    } else if (typeof cell === 'number') {
      // round if value is numeric
      return <span>{'' + parseInt(cell * 100, 10) / 100} mbps</span>;
    } else {
      return <span>{'' + cell}</span>;
    }
  }

  renderHealth(cell, row) {
    if (
      LinkOverlayKeys[LINK_OVERLAY_NAME].colors.hasOwnProperty(cell) &&
      LinkOverlayKeys[LINK_OVERLAY_NAME].values.hasOwnProperty(cell)
    ) {
      const name = LinkOverlayKeys[LINK_OVERLAY_NAME].values[cell];
      const color = LinkOverlayKeys[LINK_OVERLAY_NAME].colors[cell];
      return <span style={{color}}>{name}</span>;
    }
    return <span>-</span>;
  }

  render() {
    if (!this.state.testId) {
      return <span>No test selected.</span>;
    }
    // show row for each link in topology
    const rowHeight = 40;
    const headerHeight = 80;
    const height = this.props.height;
    const overscanRowCount = 10;
    const selectedLinkName = [];
    if (
      this.state.selectedLink &&
      !Array.isArray(this.state.selectedLink) &&
      this.state.selectedLink.hasOwnProperty('name')
    ) {
      selectedLinkName.push(this.state.selectedLink.name);
    }
    const linksTable = (
      <CustomTable
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        height={height}
        overscanRowCount={overscanRowCount}
        columns={this.headers}
        data={this.getTableRows(this.state.results)}
        sortBy={this.state.sortBy}
        sortDirection={this.state.sortDirection}
        onRowSelect={row => this.tableOnRowSelect(row)}
        onSortChange={(sortBy, sortDirection) =>
          this.onSortChange(sortBy, sortDirection)
        }
        selected={selectedLinkName}
      />
    );
    return <div>{linksTable}</div>;
  }
}
NetworkTestsTable.propTypes = {
  height: PropTypes.number.isRequired,
};
