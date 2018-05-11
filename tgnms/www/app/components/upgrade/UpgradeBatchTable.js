import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";

import { Actions } from "../../constants/NetworkConstants.js";
import Dispatcher from "../../NetworkDispatcher.js";

const classNames = require("classnames");

const upgradeStatusToString = {
  10: "NONE",
  20: "DOWNLOADING_IMAGE",
  30: "DOWNLOAD_FAILED",
  40: "FLASHING_IMAGE",
  50: "FLASH_FAILED",
  60: "FLASHED",
  70: "COMMIT_FAILED"
};

export default class UpgradeBatchTable extends React.Component {
  constructor(props) {
    super(props);
    this.getTableRows = this.getTableRows.bind(this);
    this.state = {};
  }

  getTableRows(
    nodes
  ): Array<{
    name: string,
    version: string,
    nextVersion: string,
    upgradeStatus: string,
    upgradeReqId: string
  }> {
    const rows = [];
    nodes.forEach(node => {
      // .slice(28) is used to remove the "Facebook Terragraph Release" prefix from the image name
      // e.g:
      // "Facebook Terragraph Release RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"
      // turns into "RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"

      // current version
      var version = node.status_dump
        ? node.status_dump.version.slice(28)
        : "Not Available";

      const upgradeStatus =
        node.status_dump && node.status_dump.upgradeStatus
          ? upgradeStatusToString[node.status_dump.upgradeStatus.usType]
          : "Not Available";

      // request id
      const upgradeReqId =
        node.status_dump && node.status_dump.upgradeStatus
          ? node.status_dump.upgradeStatus.upgradeReqId
          : "N/A";

      // next version
      const nextVersion =
        node.status_dump && node.status_dump.upgradeStatus
          ? node.status_dump.upgradeStatus.nextImage.version.slice(28)
          : "N/A";

      rows.push({
        name: node.name,
        version: version,
        nextVersion: nextVersion,
        upgradeStatus: upgradeStatus,
        upgradeReqId: upgradeReqId,

        key: node.name
      });
    });
    return rows;
  }

  render() {
    const { nodes, height } = this.props;

    const tableOptions = {
      trClassName: "break-word"
    };

    return (
      <div className="rc-upgrade-batch-table">
        <BootstrapTable
          tableStyle={{ width: "calc(100% - 20px)" }}
          bodyStyle={{
            maxHeight: height + "px",
            overflowY: "auto"
          }}
          key="nodesTable"
          options={tableOptions}
          data={this.getTableRows(nodes)}
          striped={true}
          hover={true}
        >
          <TableHeaderColumn
            width="170"
            dataSort={true}
            dataField="name"
            isKey={true}
          >
            Name
          </TableHeaderColumn>
          <TableHeaderColumn
            width="180"
            dataSort={true}
            dataField="upgradeStatus"
          >
            Upgrade Status
          </TableHeaderColumn>
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="upgradeReqId"
          >
            Upgrade Request Id
          </TableHeaderColumn>
          <TableHeaderColumn width="400" dataSort={true} dataField="version">
            Current Image Version
          </TableHeaderColumn>
          <TableHeaderColumn
            width="400"
            dataSort={true}
            dataField="nextVersion"
          >
            Next Image Version
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

UpgradeBatchTable.propTypes = {
  height: PropTypes.number.isRequired,
  nodes: PropTypes.array.isRequired
};
