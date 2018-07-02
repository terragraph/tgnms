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
import {findDOMNode} from 'react-dom';
import classNames from 'classnames';

const KEY_FIELD = 'mac_addr';
const TABLE_HEADER_OFFSET = 78;

export default class NetworkConfigNodes extends React.Component {
  static propTypes = {
    legendHeight: PropTypes.number.isRequired,
    nodes: PropTypes.array.isRequired,
    nodesWithDrafts: PropTypes.array.isRequired,
    nodesWithOverrides: PropTypes.instanceOf(Set).isRequired,
    selectedNodes: PropTypes.array.isRequired,
    removedNodeOverrides: PropTypes.object.isRequired,
  };

  state = {
    overridesOnly: false,
  };

  nodesListBoundingRect = null;
  nodesListRef = React.createRef();
  nodesListHeaderRef = React.createRef();

  componentDidMount() {
    // NOTE: This is not preferred to use ReactDOM, but it's needed to get the y-position offset rather than using refs on each component to get their respective heights
    this.nodesListBoundingRect = findDOMNode(
      this.nodesListRef.current,
    ).getBoundingClientRect();
  }

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

  renderNodeTable = () => {
    const selectRowProp = {
      mode: 'radio',
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.getSelectedKeys(this.props.selectedNodes),
    };
    const {legendHeight, nodes, nodesWithOverrides} = this.props;
    const nodeRows = this.state.overridesOnly
      ? nodes.filter(node => nodesWithOverrides.has(node.mac_addr))
      : nodes;

    const offsetHeight = this.nodesListBoundingRect
      ? this.nodesListBoundingRect.y
      : 0;
    const headerHeight = this.nodesListHeaderRef.current
      ? this.nodesListHeaderRef.current.clientHeight
      : 0;
    const tableBodyHeight =
      window.innerHeight - legendHeight - offsetHeight - headerHeight;

    return (
      <BootstrapTable
        bordered={false}
        data={nodeRows}
        keyField={KEY_FIELD}
        height={tableBodyHeight}
        selectRow={selectRowProp}
        tableStyle={{margin: 0, border: 0, borderRadius: 0}}
        trClassName={this.getRowClassName}>
        <TableHeaderColumn
          dataField="name"
          dataSort={true}
          filter={{
            type: 'TextFilter',
            placeholder: 'Filter Nodes',
          }}
          dataFormat={this.formatNodeName}>
          Node Name
        </TableHeaderColumn>
      </BootstrapTable>
    );
  };

  render() {
    return (
      <div className="rc-config-nodes" ref={this.nodesListRef}>
        <div className="header" ref={this.nodesListHeaderRef}>
          <span className="show-nodes-overrides-label">
            Only Nodes with Overrides
          </span>
          <CustomToggle
            checkboxId={'toggleOverridesOnly'}
            onChange={this.changeToOverridesOnly}
          />
        </div>
        {this.renderNodeTable()}
      </div>
    );
  }
}
