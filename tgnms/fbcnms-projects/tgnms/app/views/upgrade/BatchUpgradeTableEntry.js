/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {isEqual} from 'lodash-es';
import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

type Props = {
  batch: Object,
};

type State = {};

class BatchUpgradeTableEntry extends React.Component<Props, State> {
  shouldComponentUpdate(nextProps, _nextState) {
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
