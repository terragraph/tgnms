/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import Checkbox from '@material-ui/core/Checkbox';
import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import type {NodeSysdumpType} from './NodeSysdumps';

type Props = {
  sysdump: NodeSysdumpType,
  onClick: Function,
  isSelected: boolean,
};

class NodeSysdumpsTableEntry extends React.Component<Props> {
  render() {
    const {sysdump, onClick, isSelected} = this.props;

    return (
      <TableRow hover onClick={onClick(sysdump.filename)} selected={isSelected}>
        <TableCell padding="checkbox">
          <Checkbox checked={isSelected} color="primary" />
        </TableCell>
        <TableCell component="th" scope="row" padding="none">
          {sysdump.filename}
        </TableCell>
        <TableCell size="small">{sysdump.date}</TableCell>
        <TableCell size="small">{sysdump.size}</TableCell>
      </TableRow>
    );
  }
}

export default NodeSysdumpsTableEntry;
