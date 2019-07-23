/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import Checkbox from '@material-ui/core/Checkbox';
import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import {isEqual} from 'lodash';
import {renderStatusColor} from '../../helpers/TableHelpers';

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
        <TableCell size="small">{renderStatusColor(node.alive)}</TableCell>
        <TableCell size="small">{node.siteName}</TableCell>
        <TableCell size="small">{renderStatusColor(node.popNode)}</TableCell>
        <TableCell size="small">{node?.upgradeStatus || '-'}</TableCell>
        <TableCell size="small">{node?.upgradeStatusReason || '-'}</TableCell>
        <TableCell size="small">{node?.version || '-'}</TableCell>
        <TableCell size="small">{node?.nextVersion || '-'}</TableCell>
      </TableRow>
    );
  }
}

export default NodeUpgradeTableEntry;
