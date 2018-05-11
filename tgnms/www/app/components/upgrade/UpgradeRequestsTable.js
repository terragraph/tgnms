import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";

const classNames = require("classnames");

export default class UpgradeRequestsTable extends React.Component {
  constructor(props) {
    super(props);
  }

  componentWillUnmount() {
    // clear the list of selected requests when the table unmounts
    this.props.onReqsSelected([]);
  }

  getTableRows = pendingRequests => {
    return pendingRequests.map(pendingReq => {
      const reqId = pendingReq.urReq.upgradeReqId;

      return {
        reqId: reqId,
        key: reqId
      };
    });
  };

  onSelectAll = isSelected => {
    const { pendingRequests } = this.props;
    const selectedReqs = isSelected
      ? pendingRequests.map(req => req.urReq.upgradeReqId)
      : [];

    this.props.onReqsSelected(selectedReqs);
  };

  tableOnRowSelect = (row, isSelected) => {
    let selectedReqs = [];
    if (isSelected) {
      selectedReqs = [...this.props.selectedReqs, row.reqId];
    } else {
      selectedReqs = this.props.selectedReqs.filter(req => req !== row.reqId);
    }

    this.props.onReqsSelected(selectedReqs);
  };

  render() {
    const { pendingRequests, selectedReqs, height, isSelectable } = this.props;

    const tableOptions = {
      trClassName: "break-word"
    };

    var selectRowProp = isSelectable
      ? {
          mode: "checkbox",
          clickToSelect: true,
          hideSelectColumn: false,
          bgColor: "rgb(183,210,255)",
          onSelect: this.tableOnRowSelect,
          selected: selectedReqs,
          onSelectAll: this.onSelectAll
        }
      : {};

    return (
      <div className="rc-upgrade-requests-table">
        <BootstrapTable
          tableStyle={{ width: "calc(100% - 20px)" }}
          bodyStyle={{
            maxHeight: height + "px",
            overflowY: "auto"
          }}
          key="pendingReqsTable"
          options={tableOptions}
          data={this.getTableRows(pendingRequests)}
          selectRow={selectRowProp}
          striped={true}
          hover={true}
        >
          <TableHeaderColumn
            width="170"
            dataSort={true}
            dataField="reqId"
            isKey={true}
          >
            Request ID
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeRequestsTable.propTypes = {
  height: PropTypes.number.isRequired,
  pendingRequests: PropTypes.array.isRequired,
  selectedReqs: PropTypes.array,

  isSelectable: PropTypes.bool.isRequired,
  onReqsSelected: PropTypes.func
};

UpgradeRequestsTable.defaultProps = {
  selectedReqs: [],
  onReqsSelected: () => {}
};
