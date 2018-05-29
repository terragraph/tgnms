/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {availabilityColor} from '../../NetworkHelper.js';
import PropTypes from 'prop-types';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import {render} from 'react-dom';
import React from 'react';

const upgradeStatusToString = {
  10: 'NONE',
  20: 'DOWNLOADING_IMAGE',
  30: 'DOWNLOAD_FAILED',
  40: 'FLASHING_IMAGE',
  50: 'FLASH_FAILED',
  60: 'FLASHED',
  70: 'COMMIT_FAILED',
};

export default class UpgradeNodesTable extends React.Component {
  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);
    this.getTableRows = this.getTableRows.bind(this);

    // sort name, sort order
    // rowFilters maps a field name to the value that the user selected for that field name
    this.state = {
      rowFilters: {},
    };
  }

  componentWillUnmount() {
    // clear the list of selected nodes when the table unmounts
    // workaround to the fact that we persist the nodes selected state so we can pass the data in to the modal
    this.props.onNodesSelected([]);
  }

  createFilterOptionsProp(rows, filterField) {
    const filterOptions = {};
    rows.forEach(row => {
      filterOptions[row[filterField]] = row[filterField];
    });

    return filterOptions;
  }

  getTableRows(
    nodes,
  ): Array<{
    name: string,
    site_name: string,
    pop_node: boolean,
    upgradeStatus: string,
    version: string,
  }> {
    const rows = [];
    nodes.forEach(node => {
      // .slice(28) is used to remove the "Facebook Terragraph Release" prefix from the image name
      // e.g:
      // "Facebook Terragraph Release RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"
      // turns into "RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"
      const version = node.status_dump
        ? node.status_dump.version.slice(28).trimRight()
        : 'Not Available';

      // next version
      const nextVersion =
        node.status_dump &&
        node.status_dump.upgradeStatus &&
        node.status_dump.upgradeStatus.nextImage.version !== ''
          ? node.status_dump.upgradeStatus.nextImage.version
              .slice(28)
              .trimRight()
          : 'Not Available';

      const upgradeStatus =
        node.status_dump && node.status_dump.upgradeStatus
          ? upgradeStatusToString[node.status_dump.upgradeStatus.usType]
          : 'Not Available';

      rows.push({
        name: node.name,
        ignited: node.status == 2 || node.status == 3,
        site_name: node.site_name,
        pop_node: node.pop_node,
        version,
        nextVersion,
        upgradeStatus,

        key: node.name,
      });
    });

    return rows;
  }

  onSelectAll = isSelected => {
    // filter the nodes first
    const {nodes} = this.props;
    const {rowFilters} = this.state;

    const tableRows = this.getTableRows(nodes);

    // for each node, iterate through all filters and test if the node's value for that filter matches
    // filter out any nodes that don't match all filters
    const filteredNodes = tableRows.filter(row => {
      return Object.keys(rowFilters).reduce((matchFilter, filterKey) => {
        return matchFilter && row[filterKey] === rowFilters[filterKey];
      }, true);
    });

    const selectedNodes = isSelected
      ? filteredNodes.map(node => node.name)
      : [];
    this.props.onNodesSelected(selectedNodes);
  };

  tableOnRowSelect = (row, isSelected) => {
    let selectedNodes = [];
    if (isSelected) {
      selectedNodes = [...this.props.selectedNodes, row.name];
    } else {
      selectedNodes = this.props.selectedNodes.filter(
        node => node !== row.name,
      );
    }

    this.props.onNodesSelected(selectedNodes);
  };

  tableOnSortChange(sortName, sortOrder) {
    this.setState({
      sortName,
      sortOrder,
    });
  }

  // set the active filters as a state (needed for select all)
  onFilterChange = filter => {
    const rowFilters = {};
    Object.keys(filter).forEach(filterKey => {
      rowFilters[filterKey] = filter[filterKey].value;
    });

    this.setState({
      rowFilters,
    });
  };

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {'' + cell}
      </span>
    );
  }

  render() {
    const tableData = this.getTableRows(this.props.nodes);
    // tableData = [];

    const selectRowProp = {
      mode: 'checkbox',
      clickToSelect: true,
      hideSelectColumn: tableData.length === 0,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.props.selectedNodes,
      onSelectAll: this.onSelectAll,
    };

    const tableOptions = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.tableOnSortChange,
      onFilterChange: this.onFilterChange,
      trClassName: 'break-word',
    };

    return (
      <div className="rc-upgrade-nodes-table">
        <BootstrapTable
          tableStyle={{width: 'calc(100% - 20px)'}}
          bodyStyle={{
            maxHeight: '500px',
            overflowY: 'auto',
          }}
          key="nodesTable"
          options={tableOptions}
          data={tableData}
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
          <TableHeaderColumn
            width="90"
            dataSort={true}
            dataField="ignited"
            dataFormat={this.renderStatusColor}>
            Ignited
          </TableHeaderColumn>
          <TableHeaderColumn width="80" dataSort={true} dataField="site_name">
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
            width="180"
            dataSort={true}
            dataField="upgradeStatus">
            Upgrade Status
          </TableHeaderColumn>
          <TableHeaderColumn
            width="400"
            dataSort={true}
            dataField="version"
            filter={{
              type: 'SelectFilter',
              options: this.createFilterOptionsProp(tableData, 'version'),
            }}>
            Image Version
          </TableHeaderColumn>
          <TableHeaderColumn
            width="400"
            dataSort={true}
            dataField="nextVersion"
            filter={{
              type: 'SelectFilter',
              options: this.createFilterOptionsProp(tableData, 'nextVersion'),
            }}>
            Next Version
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeNodesTable.propTypes = {
  nodes: PropTypes.array.isRequired,
  selectedNodes: PropTypes.array.isRequired,
  onNodesSelected: PropTypes.func,
};

UpgradeNodesTable.defaultProps = {
  onNodesSelected: () => {},
};
