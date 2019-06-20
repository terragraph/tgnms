/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import Checkbox from '@material-ui/core/Checkbox';
import {isEqual} from 'lodash';
import React from 'react';
import {renderStatusColor} from '../../helpers/TableHelpers';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

import type {StructuredNodeType} from './NetworkUpgrade';

type Props = {
  node: StructuredNodeType,
  onClick: Function,
  isSelected: boolean,
};

class NodeUpgradeTableEntry extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    return (
      !isEqual(this.props.node, nextProps.node) ||
      this.props.isSelected !== nextProps.isSelected
    );
  }

  render() {
    const {node, onClick, isSelected} = this.props;

    return (
      <TableRow hover onClick={onClick(node.name)} selected={isSelected}>
        <TableCell padding="checkbox">
          <Checkbox checked={isSelected} color="primary" />
        </TableCell>
        <TableCell component="th" scope="row" padding="none">
          {node.name}
        </TableCell>
        <TableCell padding="dense">{renderStatusColor(node.alive)}</TableCell>
        <TableCell padding="dense">{node.siteName}</TableCell>
        <TableCell padding="dense">{renderStatusColor(node.popNode)}</TableCell>
        <TableCell padding="dense">{node?.upgradeStatus || '-'}</TableCell>
        <TableCell padding="dense">
          {node?.upgradeStatusReason || '-'}
        </TableCell>
        <TableCell padding="dense">{node?.version || '-'}</TableCell>
        <TableCell padding="dense">{node?.nextVersion || '-'}</TableCell>
      </TableRow>
    );
  }
}

export default NodeUpgradeTableEntry;
