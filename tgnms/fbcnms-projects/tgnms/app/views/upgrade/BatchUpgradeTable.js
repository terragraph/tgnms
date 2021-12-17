/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import BatchUpgradeTableEntry from './BatchUpgradeTableEntry';
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import UpgradeSection from './UpgradeSection';
import {TableOrder} from '@fbcnms/tg-nms/app/helpers/TableHelpers';
import {isEmpty, orderBy} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

import type {StructuredBatchType} from './NetworkUpgrade';

const styles = () => ({
  centerText: {
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  tableWrapper: {
    maxHeight: 300,
    width: '100%',
    overflow: 'auto',
  },
  title: {
    flex: '0 0 auto',
  },
});

const columns = [
  {id: 'name', label: 'Name'},
  {id: 'upgradeStatus', label: 'Upgrade Status'},
  {id: 'upgradeReqId', label: 'Upgrade Request ID'},
  {id: 'version', label: 'Current Image Version'},
  {id: 'nextVersion', label: 'Next Image Version'},
];

type Props = {
  classes: Object,
  data: Array<StructuredBatchType>,
  title: string,
};

type State = {
  order: $Values<typeof TableOrder>,
  orderBy: string,
};

class BatchUpgradeTable extends React.Component<Props, State> {
  state = {
    order: TableOrder.ASCENDING,
    orderBy: columns[0].id,
  };

  handleRequestSort = property => _event => {
    const orderBy = property;
    let order = TableOrder.DESCENDING;

    if (
      this.state.orderBy === property &&
      this.state.order === TableOrder.DESCENDING
    ) {
      order = TableOrder.ASCENDING;
    }

    this.setState({order, orderBy});
  };

  render() {
    const {classes, data} = this.props;

    return (
      <UpgradeSection data-testid="batchUpgrade">
        <Toolbar>
          <div className={classes.title}>
            <Typography variant="h6">
              {this.props.title} ({data.length})
            </Typography>
          </div>
        </Toolbar>
        <div className={classes.tableWrapper}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map(col => {
                  return (
                    <TableCell
                      className={classes.header}
                      key={col.id}
                      sortDirection={
                        this.state.orderBy === col.id ? this.state.order : false
                      }>
                      <Tooltip title="Sort" enterDelay={250}>
                        <TableSortLabel
                          active={this.state.orderBy === col.id}
                          direction={this.state.order}
                          onClick={this.handleRequestSort(col.id)}>
                          {col.label}
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {isEmpty(data) ? (
                <TableRow>
                  <TableCell
                    className={classes.centerText}
                    colSpan={columns.length}>
                    There is no data to display
                  </TableCell>
                </TableRow>
              ) : (
                orderBy(
                  data,
                  [this.state.orderBy],
                  [this.state.order],
                ).map(batch => (
                  <BatchUpgradeTableEntry key={batch.name} batch={batch} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </UpgradeSection>
    );
  }
}

export default withStyles(styles)(BatchUpgradeTable);
