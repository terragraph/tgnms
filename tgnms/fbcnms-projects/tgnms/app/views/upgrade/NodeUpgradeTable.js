/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import Checkbox from '@material-ui/core/Checkbox';
import MenuItem from '@material-ui/core/MenuItem';
import ModalCommit from './ModalCommit';
import ModalFullUpgrade from './ModalFullUpgrade';
import ModalPrepare from './ModalPrepare';
import ModalReset from './ModalReset';
import NodeUpgradeTableEntry from './NodeUpgradeTableEntry';
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import TextField from '@material-ui/core/TextField';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import UpgradeSection from './UpgradeSection';
import {TableOrder} from '@fbcnms/tg-nms/app/helpers/TableHelpers';
import {getVersion} from '@fbcnms/tg-nms/app/helpers/VersionHelper';
import {isEmpty, orderBy} from 'lodash';
import {shortenVersionString} from '@fbcnms/tg-nms/app/helpers/VersionHelper';
import {withStyles} from '@material-ui/core/styles';

import type {StructuredNodeType} from './NetworkUpgrade';

const styles = () => ({
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
  {id: 'name', label: 'Name', filter: false},
  {id: 'alive', label: 'Alive?', filter: false},
  {id: 'siteName', label: 'Site', filter: false},
  {id: 'popNode', label: 'POP?', filter: false},
  {id: 'upgradeStatus', label: 'Upgrade Status', filter: false},
  {id: 'upgradeStatusReason', label: 'Reason', filter: false},
  {id: 'version', label: 'Image Version', filter: true},
  {id: 'nextVersion', label: 'Next Version', filter: true},
];

type Props = {
  classes: Object,
  controllerVersion: string,
  data: Array<StructuredNodeType>,
  networkName: string,
};

type State = {
  filteredData: Array<StructuredNodeType>,
  filters: {[string]: ?any},
  order: $Values<typeof TableOrder>,
  orderBy: string,
  selected: Array<string>,
};

class NodeUpgradeTable extends React.Component<Props, State> {
  state = {
    filteredData: [],
    filters: {},
    order: TableOrder.ASCENDING,
    orderBy: columns[0].id,
    selected: [],
  };

  static getDerivedStateFromProps(props, state) {
    const {filters} = state;

    return {
      filteredData: props.data.filter(node => {
        for (const key in filters) {
          if (node[key] !== filters[key]) {
            return false;
          }
        }
        return true;
      }),
    };
  }

  getExcludedNodes = (): Array<string> => {
    const selectedNames = new Set(this.state.selected);

    return this.props.data
      .map(node => node.name)
      .filter(nodeName => {
        return !selectedNames.has(nodeName);
      });
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

  handleSelectAllClick = event => {
    if (event.target.checked && this.state.selected.length === 0) {
      this.setState({selected: this.state.filteredData.map(node => node.name)});
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

  handleSelectFilter = colID => event => {
    const {filters} = this.state;

    if (event.target.value === null) {
      delete filters[colID];
    } else {
      filters[colID] = event.target.value;
    }

    this.setState({filters});
  };

  getColumnFilterOptions = colID => {
    // Remove duplicate options and entries where data is unavailable
    const deduped = this.props.data.reduce((accumulator, node) => {
      if (node[colID] && accumulator.indexOf(node[colID]) === -1) {
        accumulator.push(node[colID]);
      }
      return accumulator;
    }, []);

    // Add default entry for clearing the filter selection
    return [{label: '', value: null}].concat(
      deduped.map(entry => ({
        label: entry ? shortenVersionString(entry) : entry,
        value: entry,
      })),
    );
  };

  render() {
    const {classes, networkName} = this.props;
    const {filteredData, selected} = this.state;
    const numSelected = selected.length;
    const nodeCount = filteredData.length;

    return (
      <UpgradeSection data-testid="nodeUpgrade">
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
                <ModalFullUpgrade
                  controllerVersion={getVersion(this.props.controllerVersion)}
                  excluded={this.getExcludedNodes()}
                  selected={selected}
                  networkName={networkName}
                />
                <ModalPrepare
                  controllerVersion={getVersion(this.props.controllerVersion)}
                  selected={selected}
                  networkName={networkName}
                />
                <ModalCommit
                  excluded={this.getExcludedNodes()}
                  selected={selected}
                  networkName={networkName}
                />
                <ModalReset selected={selected} networkName={networkName} />
              </div>
            </>
          ) : (
            <div className={classes.title}>
              <Typography variant="h6">Node Upgrade Status</Typography>
            </div>
          )}
        </Toolbar>
        <div className={classes.tableWrapper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.header} padding="checkbox">
                  <Checkbox
                    checked={numSelected !== 0 && numSelected === nodeCount}
                    color="primary"
                    indeterminate={numSelected > 0 && numSelected < nodeCount}
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
                      {col.filter ? (
                        <TextField
                          fullWidth
                          margin="dense"
                          onChange={this.handleSelectFilter(col.id)}
                          select
                          value={this.state.filters[col.id] || ''}>
                          {this.getColumnFilterOptions(col.id).map(opt => {
                            return (
                              <MenuItem key={opt.label} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            );
                          })}
                        </TextField>
                      ) : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {isEmpty(filteredData) ? (
                <TableRow>
                  {/* Add 1 to colSpan for the checkbox column */}
                  <TableCell
                    className={classes.centerText}
                    colSpan={columns.length + 1}>
                    There is no data to display
                  </TableCell>
                </TableRow>
              ) : (
                orderBy<StructuredNodeType>(
                  filteredData,
                  [this.state.orderBy],
                  [this.state.order],
                ).map(node => {
                  return (
                    <NodeUpgradeTableEntry
                      key={node.name}
                      node={node}
                      onClick={this.handleClick}
                      isSelected={this.isSelected(node.name)}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </UpgradeSection>
    );
  }
}

export default withStyles(styles)(NodeUpgradeTable);
