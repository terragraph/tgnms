// NetworkConfigNodes.js
// list of nodes + a search bar

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';
import {changeEditMode, selectNodes} from '../../actions/NetworkConfigActions.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

const KEY_FIELD = 'mac_addr';

export default class NetworkConfigNodes extends React.Component {
  constructor(props) {
    super(props);
  }

  formatNodeName = (cell, row, enumObject, index) => {
    const {name, mac_addr} = row;
    const nodesWithDraftsSet = new Set(this.props.nodesWithDrafts);

    const unsavedAsterisk = nodesWithDraftsSet.has(mac_addr) ? (
      <span style={{color: '#cc0000', 'fontWeight': 800}}>*</span>
    ) : '';

    return (
      <span>{name}{unsavedAsterisk}</span>
    );
  }

  tableOnRowSelect = (row, isSelected) => {
    // force at least 1 node to be selected at all times
    selectNodes({
      nodes: [row]
    });
  }

  getSelectedKeys = (selectedNodes) => {
    return selectedNodes.map(node => node[KEY_FIELD]);
  }

  renderNodeTable = () => {
    const selectRowProp = {
      mode: 'radio',
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.getSelectedKeys(this.props.selectedNodes),
    };

    return (
      <BootstrapTable
        tableStyle={{margin: 0}}
        data={ this.props.nodes }
        keyField={KEY_FIELD}
        bordered={ false }
        selectRow={selectRowProp}
      >
        <TableHeaderColumn
          dataField='name'
          dataSort={true}
          filter={{
            type: 'TextFilter',
            placeholder: 'Filter Nodes',
          }}
          dataFormat={this.formatNodeName}
        >Node name</TableHeaderColumn>
      </BootstrapTable>
    );
  }

  render() {
    return (
      <div className='rc-network-config-nodes'>
        {this.renderNodeTable()}
      </div>
    );
  }
}

NetworkConfigNodes.propTypes = {
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
  nodesWithDrafts: React.PropTypes.array.isRequired,
}
