import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

import { availabilityColor } from '../../NetworkHelper.js';
import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

const upgradeStatusToString = {
  10: 'NONE',
  20: 'DOWNLOADING_IMAGE',
  30: 'DOWNLOAD_FAILED',
  40: 'FLASHING_IMAGE',
  50: 'FLASH_FAILED',
  60: 'FLASHED',
  70: 'COMMIT_FAILED',
}

export default class UpgradeNodesTable extends React.Component {
  state = {
    nodesSelected: []
  }

  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);
    this.siteSortFunc = this.siteSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
  }

  componentWillUnmount() {
    // clear the list of selected nodes when the table unmounts
    // workaround to the fact that we persist the nodes selected state so we can pass the data in to the modal
    this.props.onNodesSelected([]);
  }

  getTableRows(nodes): Array<{name:string,
                              site_name:string,
                              pop_node:boolean,
                              upgradeStatus:string,
                              version:string}>  {
    const rows = [];
    nodes.forEach(node => {
      var version = node.status_dump ? node.status_dump.version.slice(28) :
                                       'Not Available';

      const upgradeStatus = (node.status_dump && node.status_dump.upgradeStatus) ?
        upgradeStatusToString[node.status_dump.upgradeStatus.usType] : 'Not Available';

      rows.push(
        {
          name: node.name,
          site_name: node.site_name,
          pop_node: node.pop_node,
          version: version,
          upgradeStatus: upgradeStatus,

          key: node.name,
        },
      );
    });
    return rows;
  }

  onSelectAll = (isSelected) => {
    const nodes = this.props.topology.nodes;
    const nodesSelected = (isSelected) ? nodes.map(node => node.name) : [];

    this.setState({nodesSelected});
    this.props.onNodesSelected(nodesSelected);
  }

  tableOnRowSelect = (row, isSelected) => {
    let nodesSelected = [];
    if (isSelected) {
      nodesSelected = [...this.state.nodesSelected, row.name];
    } else {
      nodesSelected = this.state.nodesSelected.filter((node) => node !== row.name);
    }

    this.setState({nodesSelected});
    this.props.onNodesSelected(nodesSelected);
  }

  tableOnSortChange(sortName, sortOrder) {
    this.setState({
      sortName,
      sortOrder,
      selectedSiteName: undefined
    });
  }

  siteSortFunc(a, b, order) {
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

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {'' + cell}
      </span>);
  }

  render() {
    var selectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      hideSelectColumn: false,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect,
      selected: this.state.nodesSelected,
      onSelectAll: this.onSelectAll,
    };

    const tableOptions = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.tableOnSortChange,
      trClassName: 'break-word',
    };

    let nodesData = [];
    if (this.props.topology &&
        this.props.topology.nodes) {
      nodesData = this.props.topology.nodes;
    }

    return (
      <div className='rc-upgrade-nodes-table'>
        <BootstrapTable
            tableStyle={{
              width: 'calc(100% - 20px)',
              maxHeight: '700px',
              overflowY: 'auto',
            }}
            key="nodesTable"
            options={ tableOptions }
            data={this.getTableRows(nodesData)}
            striped={true} hover={true}
            selectRow={selectRowProp}
            trClassName= 'break-word'>
          <TableHeaderColumn width="170" dataSort={true} dataField="name" isKey={ true }>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn width="80"
                             dataSort={true}
                             dataField="site_name"
                             sortFunc={this.siteSortFunc}>
            Site
          </TableHeaderColumn>
          <TableHeaderColumn width="80"
                             dataSort={true}
                             dataField="pop_node"
                             dataFormat={this.renderStatusColor}>
            Pop?
          </TableHeaderColumn>
          <TableHeaderColumn width="80" dataSort={true} dataField="upgradeStatus">
            Upgrade Status
          </TableHeaderColumn>
          <TableHeaderColumn width="700" dataSort={true} dataField="version">
            Image Version
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeNodesTable.propTypes = {
  topology: React.PropTypes.object.isRequired,
  onNodesSelected: React.PropTypes.func,
};

UpgradeNodesTable.defaultProps = {
  onNodesSelected: ((nodes) => {
    // Dispatch an action that will be handled by the top level upgrade component
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_NODES_SELECTED,
      nodes,
    });
  })
};
