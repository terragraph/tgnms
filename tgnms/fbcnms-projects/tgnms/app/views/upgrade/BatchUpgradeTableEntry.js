/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import {isEqual} from 'lodash-es';
import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

import type {StructuredBatchType} from './NetworkUpgrade';

type Props = {
  batch: StructuredBatchType,
};

class BatchUpgradeTableEntry extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    return !isEqual(this.props.batch, nextProps.batch);
  }

  render() {
    const {batch} = this.props;

    return (
      <TableRow hover>
        <TableCell component="th" scope="row" padding="dense">
          {batch.name}
        </TableCell>
        <TableCell padding="dense">
          {batch?.upgradeStatus || 'Not Available'}
        </TableCell>
        <TableCell padding="dense">{batch?.upgradeReqId || 'N/A'}</TableCell>
        <TableCell padding="dense">
          {batch?.version || 'Not Available'}
        </TableCell>
        <TableCell padding="dense">{batch?.nextVersion || 'N/A'}</TableCell>
      </TableRow>
    );
  }
}

export default BatchUpgradeTableEntry;
