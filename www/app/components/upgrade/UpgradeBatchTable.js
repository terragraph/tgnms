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

export default class UpgradeBatchTable extends React.Component {
  state = {}

  constructor(props) {
    super(props);
    this.tableOnSortChange = this.tableOnSortChange.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
  }

  getTableRows(nodes): Array<{name:string,
                              version:string,
                              nextVersion:string,
                              upgradeStatus:string,
                              upgradeReqId:string}>  {
    const rows = [];
    nodes.forEach(node => {
      var version = node.status_dump ? node.status_dump.version.slice(28) :
                                       'Not Available';

      const upgradeStatus = (node.status_dump && node.status_dump.upgradeStatus) ?
        upgradeStatusToString[node.status_dump.upgradeStatus.usType] : 'Not Available';

      // request id
      const upgradeReqId = (node.status_dump && node.status_dump.upgradeStatus) ?
        node.status_dump.upgradeStatus.upgradeReqId : 'N/A';

      // next version
      const nextVersion = (node.status_dump && node.status_dump.upgradeStatus) ?
        node.status_dump.upgradeStatus.nextImage.version.slice(28) : 'N/A';

      // TODO: some clever manipulation to get the batch as well, also: sort by batch then name

      rows.push(
        {
          name: node.name,
          version: version,
          nextVersion: nextVersion,
          upgradeStatus: upgradeStatus,
          upgradeReqId: upgradeReqId,

          key: node.name,
        },
      );
    });
    return rows;
  }

  tableOnSortChange(sortName, sortOrder) {
    this.setState({
      sortName,
      sortOrder
    });
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {"" + cell}
      </span>);
  }


  render() {
    const tableOptions = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      trClassName: 'break-word',
    };

    return (
      <div className='rc-upgrade-batch-table'>
        <BootstrapTable
            tableStyle={{
              width: 'calc(100% - 20px)',
              maxHeight: this.props.height + 'px',
              overflowY: 'auto',
            }}
            key='nodesTable'
            options={ tableOptions }
            data={this.getTableRows(this.props.nodes)}
            striped={true} hover={true}
            trClassName= 'break-word'>
          <TableHeaderColumn width="170" dataSort={true} dataField="name" isKey={ true }>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn width="80" dataSort={true} dataField="upgradeStatus">
            Upgrade Status
          </TableHeaderColumn>
          <TableHeaderColumn width="120" dataSort={true} dataField="upgradeReqId">
            Upgrade Request Id
          </TableHeaderColumn>
          <TableHeaderColumn width="600" dataSort={true} dataField="version">
            Current Image Version
          </TableHeaderColumn>
          <TableHeaderColumn width="600" dataSort={true} dataField="nextVersion">
            Next Image Version
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeBatchTable.propTypes = {
  height: React.PropTypes.number.isRequired,
  nodes: React.PropTypes.array.isRequired,
};
