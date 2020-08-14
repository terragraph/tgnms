/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import Checkbox from '@material-ui/core/Checkbox';
import ModalDelete from './ModalDelete';
import NodeSysdumpsTableEntry from './NodeSysdumpsTableEntry';
import Paper from '@material-ui/core/Paper';
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
import {TableOrder} from '../../helpers/TableHelpers';
import {getVersion} from '../../helpers/VersionHelper';
import {isEmpty, orderBy} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

import type {NodeSysdumpType} from './NodeSysdumps';

const styles = theme => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(),
    margin: theme.spacing(),
  },
  centerText: {
    textAlign: 'center',
  },
  flexContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: 0,
  },
  header: {
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  spacer: {
    flex: '1 1 100%',
  },
  tableWrapper: {
    maxHeight: 500,
    width: '100%',
    overflow: 'auto',
  },
  title: {
    flex: '0 0 auto',
  },
});

const columns = [
  {id: 'filename', label: 'Filename', filter: false},
  {id: 'date', label: 'Date', filter: false},
  {id: 'size', label: 'Size', filter: false},
];

type Props = {
  classes: Object,
  controllerVersion: string,
  data: Array<NodeSysdumpType>,
  onDelete: (Array<string>) => void,
};

type State = {
  selected: Array<string>,
  order: $Values<typeof TableOrder>,
  orderBy: string,
};

class NodeSysdumpsTable extends React.Component<Props, State> {
  state = {selected: [], order: TableOrder.ASCENDING, orderBy: columns[0].id};
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

  handleSelectAllClick = event => {
    if (event.target.checked && this.state.selected.length === 0) {
      this.setState({
        selected: this.props.data.map(sysdump => sysdump.filename),
      });
    } else {
      this.setState({selected: []});
    }
  };

  handleClick = name => _event => {
    // Add "name" to "selected" if it is currently unchecked. Otherwise,
    // identify the index of "name" and remove it accordingly.
    const {selected} = this.state;
    const selectedIndex = selected.indexOf(name);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    this.setState({selected: newSelected});
  };

  isSelected = name => {
    return this.state.selected.indexOf(name) !== -1;
  };

  render() {
    const {classes, data} = this.props;
    const {selected} = this.state;
    const numSelected = selected.length;
    const sysdumpCount = data.length;

    return (
      <Paper className={classes.root} elevation={2} data-testid="sysdumps">
        <Toolbar>
          {numSelected > 0 ? (
            <>
              <div className={classes.title}>
                <Typography variant="subtitle1">
                  {numSelected} selected
                </Typography>
              </div>
              <div className={classes.spacer} />
              <div
                className={classes.flexContainer}
                data-testid="actionButtonContainer">
                <ModalDelete
                  controllerVersion={getVersion(this.props.controllerVersion)}
                  selected={selected}
                  onDelete={() => {
                    this.props.onDelete(selected);
                    this.setState({selected: []});
                  }}
                />
              </div>
            </>
          ) : (
            <div className={classes.title}>
              <Typography variant="h6">Node Sysdumps</Typography>
            </div>
          )}
        </Toolbar>
        <div className={classes.tableWrapper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.header} padding="checkbox">
                  <Checkbox
                    checked={numSelected !== 0 && numSelected === sysdumpCount}
                    color="primary"
                    indeterminate={
                      numSelected > 0 && numSelected < sysdumpCount
                    }
                    onChange={this.handleSelectAllClick}
                    data-testid="selectAllBox"
                  />
                </TableCell>
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
              {isEmpty(this.props.data) ? (
                <TableRow>
                  {/* Add 1 to colSpan for the checkbox column */}
                  <TableCell
                    className={classes.centerText}
                    colSpan={columns.length + 1}>
                    There is no data to display
                  </TableCell>
                </TableRow>
              ) : (
                orderBy<NodeSysdumpType>(
                  data,
                  [this.state.orderBy],
                  [this.state.order],
                ).map(sysdump => {
                  return (
                    <NodeSysdumpsTableEntry
                      key={sysdump.filename}
                      sysdump={sysdump}
                      onClick={this.handleClick}
                      isSelected={this.isSelected(sysdump.filename)}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Paper>
    );
  }
}

export default withStyles(styles)(NodeSysdumpsTable);
