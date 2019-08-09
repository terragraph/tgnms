/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import {isEqual} from 'lodash';

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
        <TableCell component="th" scope="row" size="small">
          {batch.name}
        </TableCell>
        <TableCell size="small">
          {batch?.upgradeStatus || 'Not Available'}
        </TableCell>
        <TableCell size="small">{batch?.upgradeReqId || 'N/A'}</TableCell>
        <TableCell size="small">{batch?.version || 'Not Available'}</TableCell>
        <TableCell size="small">{batch?.nextVersion || 'N/A'}</TableCell>
      </TableRow>
    );
  }
}

export default BatchUpgradeTableEntry;
