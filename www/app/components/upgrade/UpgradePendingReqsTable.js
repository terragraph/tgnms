import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

const classNames = require('classnames');

export default class UpgradeBatchTable extends React.Component {
  constructor(props) {
    super(props);
  }

  getTableRows = (pendingRequests) => {
    return pendingRequests.map((pendingReq) => {
      const reqId = pendingReq.urReq.upgradeReqId;

      return {
        reqId: reqId,
        key: reqId
      };
    });
  }

  render() {
    const {pendingRequests, height} = this.props;

    const tableOptions = {
      trClassName: 'break-word',
    };

    return (
      <div className='rc-upgrade-pending-reqs-table'>
        <BootstrapTable
            tableStyle={{width: 'calc(100% - 20px)'}}
            bodyStyle={{
              maxHeight: height + 'px',
              overflowY: 'auto',
            }}
            key='pendingReqsTable'
            options={ tableOptions }
            data={this.getTableRows(pendingRequests)}
            striped={true} hover={true}
        >
          <TableHeaderColumn width="170" dataSort={true} dataField="reqId" isKey={ true }>
            Request ID
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeBatchTable.propTypes = {
  height: React.PropTypes.number.isRequired,
  pendingRequests: React.PropTypes.array.isRequired,
};
