import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

const classNames = require('classnames');

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
};

export default class UpgradeBatchTable extends React.Component {
  constructor(props) {
    super(props);
    this.getTableRows = this.getTableRows.bind(this);
    this.state = {

    };
  }

  getTableRows(nodes): Array<{name:string,
                              version:string,
                              nextVersion:string,
                              upgradeStatus:string,
                              upgradeReqId:string}>  {
    const rows = [];
    nodes.forEach(node => {
      // .slice(28) is used to remove the "Facebook Terragraph Release" prefix from the image name
      // e.g:
      // "Facebook Terragraph Release RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"
      // turns into "RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"

      // current version
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

      rows.push(
        {
          name: node.name,
          version: version,
          nextVersion: nextVersion,
          upgradeStatus: upgradeStatus,
          upgradeReqId: upgradeReqId,

          batchIdx: node.batchIdx,

          key: node.name,
        },
      );
    });
    return rows;
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {"" + cell}
      </span>);
  }

  render() {
    const {nodes, height, pendingBatch} = this.props;

    const tableOptions = {
      trClassName: 'break-word',
    };

    const batchColumn = (
      <TableHeaderColumn width="70" dataSort={true} dataField="batchIdx">
        Batch number
      </TableHeaderColumn>
    );

    return (
      <div className='rc-upgrade-batch-table'>
        <BootstrapTable
            tableStyle={{width: 'calc(100% - 20px)'}}
            bodyStyle={{
              maxHeight: height + 'px',
              overflowY: 'auto',
            }}
            key='nodesTable'
            options={ tableOptions }
            data={this.getTableRows(nodes)}
            striped={true} hover={true}
            bodyContainerClass={classNames('react-bs-container-body', 'upgrade-batch-table-body')}
        >
          <TableHeaderColumn width="70" dataSort={true} dataField="batchIdx" hidden={!pendingBatch}>
            Batch number
          </TableHeaderColumn>
          <TableHeaderColumn width="170" dataSort={true} dataField="name" isKey={ true }>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataSort={true} dataField="upgradeStatus">
            Upgrade Status
          </TableHeaderColumn>
          <TableHeaderColumn width="120" dataSort={true} dataField="upgradeReqId">
            Upgrade Request Id
          </TableHeaderColumn>
          <TableHeaderColumn width="700" dataSort={true} dataField="version">
            Current Image Version
          </TableHeaderColumn>
          <TableHeaderColumn width="700" dataSort={true} dataField="nextVersion">
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
  pendingBatch: React.PropTypes.bool,
};

UpgradeBatchTable.defaultProps = {
  pendingBatch: false
};
