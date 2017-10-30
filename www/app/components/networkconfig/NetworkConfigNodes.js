// NetworkConfigNodes.js
// list of nodes + a search bar

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';
import {changeEditMode, selectNodes} from '../../actions/NetworkConfigActions.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

export default class NetworkConfigNodes extends React.Component {
  constructor(props) {
    super(props);
  }

  formatNodeName = (cell, row, enumObject, index) => {
    const nodeName = row.name;
    const nodesWithDraftsSet = new Set(this.props.nodesWithDrafts);

    const unsavedAsterisk = nodesWithDraftsSet.has(nodeName) ? (
      <span style={{color: '#cc0000', 'fontWeight': 800}}>*</span>
    ) : '';

    return (
      <span>{nodeName}{unsavedAsterisk}</span>
    );
  }

  tableOnRowSelect = (row, isSelected) => {
    // force at least 1 node to be selected at all times
    selectNodes({
      nodes: [row.name]
    });
  }

  renderNodeTable = () => {
    const nodesForTable = this.props.nodes.map(node => {
      return {name: node};
    });

    const selectRowProp = {
      mode: 'radio',
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.props.selectedNodes,
    };

    return (
      <BootstrapTable
        tableStyle={{margin: 0}}
        data={ nodesForTable }
        bordered={ false }
        selectRow={selectRowProp}
      >
        <TableHeaderColumn
          dataField='name'
          isKey={true}
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
