/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// NetworkConfigNodes.js
// list of nodes + a search bar

import {
  changeEditMode,
  selectNodes,
} from '../../actions/NetworkConfigActions.js';
import {
  CONFIG_VIEW_MODE,
  CONFIG_CLASSNAMES,
} from '../../constants/NetworkConfigConstants.js';
import CustomToggle from '../common/CustomToggle.js';
import PropTypes from 'prop-types';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import {render} from 'react-dom';
import React from 'react';

const KEY_FIELD = 'mac_addr';
const TABLE_HEADER_OFFSET = 78;
import classNames from 'classnames';

export default class NetworkConfigNodes extends React.Component {
  static propTypes = {
    nodes: PropTypes.array.isRequired,
    selectedNodes: PropTypes.array.isRequired,
    nodesWithDrafts: PropTypes.array.isRequired,
    nodesWithOverrides: PropTypes.instanceOf(Set).isRequired,
    removedNodeOverrides: PropTypes.object.isRequired,
  };

  state = {
    overridesOnly: false,
  };

  formatNodeName = (cell, row, enumObject, index) => {
    const {name, mac_addr} = row;
    const nodesWithDraftsSet = new Set(this.props.nodesWithDrafts);
    const hasUnsavedChanges =
      nodesWithDraftsSet.has(mac_addr) ||
      this.props.removedNodeOverrides.hasOwnProperty(mac_addr);

    const unsavedMarker = hasUnsavedChanges ? (
      <img
        height="20"
        style={{float: 'right'}}
        src="/static/images/bullet_red.png"
      />
    ) : null;

    return (
      <span>
        {name}
        {unsavedMarker}
      </span>
    );
  };

  tableOnRowSelect(row, isSelected) {
    // force at least 1 node to be selected at all times
    selectNodes({
      nodes: [row],
    });
  }

  getSelectedKeys(selectedNodes) {
    return selectedNodes.map(node => node[KEY_FIELD]);
  }

  getRowClassName = row => {
    const {nodesWithOverrides} = this.props;
    const rowClasses = {};
    rowClasses['nc-online-node'] = row.ignited;
    rowClasses['nc-offline-node'] = !row.ignited;
    rowClasses['nc-node-with-override'] = nodesWithOverrides.has(
      row[KEY_FIELD],
    );

    return classNames(rowClasses);
  };

  changeToOverridesOnly = overridesOnly => {
    this.setState({overridesOnly});
  };

  renderNodeTable() {
    const selectRowProp = {
      mode: 'radio',
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.getSelectedKeys(this.props.selectedNodes),
    };
    const {nodes, nodesWithOverrides} = this.props;
    const nodeRows = this.state.overridesOnly
      ? nodes.filter(node => nodesWithOverrides.has(node.mac_addr))
      : nodes;

    return (
      <BootstrapTable
        tableStyle={{margin: 0, border: 0, borderRadius: 0}}
        data={nodeRows}
        keyField={KEY_FIELD}
        bordered={false}
        selectRow={selectRowProp}
        trClassName={this.getRowClassName}>
        <TableHeaderColumn
          dataField="name"
          dataSort={true}
          filter={{
            type: 'TextFilter',
            placeholder: 'Filter Nodes',
          }}
          dataFormat={this.formatNodeName}>
          Node name
        </TableHeaderColumn>
      </BootstrapTable>
    );
  }

  render() {
    return (
      <div className="rc-network-config-nodes" ref="nodeTable">
        <label>Show Only Nodes with Overrides</label>
        <CustomToggle
          wrapperStyle={{top: '5px', left: '2px'}}
          checkboxId={'toggleOverridesOnly'}
          onChange={this.changeToOverridesOnly}
        />
        {this.renderNodeTable()}
      </div>
    );
  }
}
