import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

import { availabilityColor } from '../../NetworkHelper.js';


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
  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);
    this.siteSortFunc = this.siteSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);

    this.state = {};
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
      const version = node.status_dump ? node.status_dump.version.slice(28) :
                                       'Not Available';

      // next version
      const nextVersion = (node.status_dump && node.status_dump.upgradeStatus) ?
        node.status_dump.upgradeStatus.nextImage.version.slice(28) : 'N/A';

      const upgradeStatus = (node.status_dump && node.status_dump.upgradeStatus) ?
        upgradeStatusToString[node.status_dump.upgradeStatus.usType] : 'Not Available';

      rows.push(
        {
          name: node.name,
          site_name: node.site_name,
          pop_node: node.pop_node,
          version: version,
          nextVersion: nextVersion,
          upgradeStatus: upgradeStatus,

          key: node.name,
        },
      );
    });
    return rows;
  }

  onSelectAll = (isSelected) => {
    const {nodes} = this.props;
    const selectedNodes = (isSelected) ? nodes.map(node => node.name) : [];

    this.props.onNodesSelected(selectedNodes);
  }

  tableOnRowSelect = (row, isSelected) => {
    let selectedNodes = [];
    if (isSelected) {
      selectedNodes = [...this.props.selectedNodes, row.name];
    } else {
      selectedNodes = this.props.selectedNodes.filter((node) => node !== row.name);
    }

    this.props.onNodesSelected(selectedNodes);
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
      selected: this.props.selectedNodes,
      onSelectAll: this.onSelectAll,
    };

    const tableOptions = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.tableOnSortChange,
      trClassName: 'break-word',
    };

    return (
      <div className='rc-upgrade-nodes-table'>
        <BootstrapTable
            tableStyle={{width: 'calc(100% - 20px)'}}
            bodyStyle={{
              maxHeight: '700px',
              overflowY: 'auto',
            }}
            key="nodesTable"
            options={ tableOptions }
            data={this.getTableRows(this.props.nodes)}
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
          <TableHeaderColumn width="180" dataSort={true} dataField="upgradeStatus">
            Upgrade Status
          </TableHeaderColumn>
          <TableHeaderColumn width="700" dataSort={true} dataField="version">
            Image Version
          </TableHeaderColumn>
          <TableHeaderColumn width="700" dataSort={true} dataField="nextVersion">
            Next Version
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeNodesTable.propTypes = {
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
  onNodesSelected: React.PropTypes.func,
};

UpgradeNodesTable.defaultProps = {
  onNodesSelected: (() => {})
};
