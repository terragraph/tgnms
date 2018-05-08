// NetworkConfigNodes.js
// list of nodes + a search bar

import React from "react";
import { render } from "react-dom";

import {
  CONFIG_VIEW_MODE,
  CONFIG_CLASSNAMES
} from "../../constants/NetworkConfigConstants.js";
import {
  changeEditMode,
  selectNodes
} from "../../actions/NetworkConfigActions.js";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";

const KEY_FIELD = "mac_addr";
const TABLE_HEADER_OFFSET = 78;
const classNames = require("classnames");

export default class NetworkConfigNodes extends React.Component {
  constructor(props) {
    super(props);
  }

  formatNodeName = (cell, row, enumObject, index) => {
    const { name, mac_addr } = row;
    const nodesWithDraftsSet = new Set(this.props.nodesWithDrafts);

    const unsavedMarker = nodesWithDraftsSet.has(mac_addr) ? (
      <img
        height="20"
        style={{ float: "right" }}
        src="/static/images/bullet_red.png"
      />
    ) : (
      ""
    );

    return (
      <span>
        {name}
        {unsavedMarker}
      </span>
    );
  };

  tableOnRowSelect = (row, isSelected) => {
    // force at least 1 node to be selected at all times
    selectNodes({
      nodes: [row]
    });
  };

  getSelectedKeys = selectedNodes => {
    return selectedNodes.map(node => node[KEY_FIELD]);
  };

  getRowClassName = row => {
    const { nodesWithOverrides } = this.props;
    let rowClasses = {};
    rowClasses["nc-online-node"] = row.ignited;
    rowClasses["nc-offline-node"] = !row.ignited;
    rowClasses["nc-node-with-override"] = nodesWithOverrides.has(
      row[KEY_FIELD]
    );

    return classNames(rowClasses);
  };

  renderNodeTable = () => {
    const selectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect,
      selected: this.getSelectedKeys(this.props.selectedNodes)
    };

    return (
      <BootstrapTable
        tableStyle={{ margin: 0 }}
        data={this.props.nodes}
        keyField={KEY_FIELD}
        bordered={false}
        selectRow={selectRowProp}
        trClassName={this.getRowClassName}
      >
        <TableHeaderColumn
          dataField="name"
          dataSort={true}
          filter={{
            type: "TextFilter",
            placeholder: "Filter Nodes"
          }}
          dataFormat={this.formatNodeName}
        >
          Node name
        </TableHeaderColumn>
      </BootstrapTable>
    );
  };

  render() {
    return (
      <div className="rc-network-config-nodes" ref="nodeTable">
        {this.renderNodeTable()}
      </div>
    );
  }
}

NetworkConfigNodes.propTypes = {
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
  nodesWithDrafts: React.PropTypes.array.isRequired,
  nodesWithOverrides: React.PropTypes.instanceOf(Set).isRequired
};
