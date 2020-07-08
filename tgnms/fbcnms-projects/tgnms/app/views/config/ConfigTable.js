/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ConfigTableEntry from './ConfigTableEntry';
import React from 'react';
import SearchBar from '../../components/common/SearchBar';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Tooltip from '@material-ui/core/Tooltip';
import {CONFIG_FIELD_DELIMITER} from '../../constants/ConfigConstants';
import {TableOrder} from '../../helpers/TableHelpers';
import {isEqual, orderBy} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  searchContainer: {
    padding: theme.spacing(2),
  },
  tableContainer: {
    width: '100%',
    overflow: 'auto',
    paddingBottom: theme.spacing(),

    // TODO - HACK! - Figure out how to actually set the height to 100% screen
    height: `calc(100vh - ${
      /* pad */ theme.spacing() +
      /* appbar */ 64 +
      /* toolbar */ 48 +
      /* search bar */ 72
    }px)`,
  },
  header: {
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
});

const columns = Object.freeze([
  {label: 'Description', orderBy: ['field']},
  {label: 'Field', orderBy: ['field']},
  {label: 'Status', orderBy: ['hasTopLevelOverride', 'hasOverride', 'field']},
  {
    label: 'Type',
    orderBy: ['metadata.type', 'hasTopLevelOverride', 'hasOverride', 'field'],
  },
  {label: 'Value'},
]);

type Props = {
  classes: {[string]: string},
  data: ?Array<Object>,
  onDraftChange: (?Array<string>, ?(string | number)) => any,
  selectedField: ?Array<string>,
  onSelectField: (?Array<string>) => any,
  hideDeprecatedFields: boolean,
};

type State = {
  order: $Values<typeof TableOrder>,
  orderBy: Array<string>,
  searchValue: string,
  searchFilter: string,
};

class ConfigTable extends React.Component<Props, State> {
  state = {
    order: TableOrder.ASCENDING,
    orderBy: columns[0].orderBy,
    searchValue: '',
    searchFilter: '',
  };

  handleRequestSort = property => _event => {
    // Sort the table by the given property
    const {order, orderBy} = this.state;
    this.setState({
      order:
        orderBy === property && order === TableOrder.DESCENDING
          ? TableOrder.ASCENDING
          : TableOrder.DESCENDING,
      orderBy: property,
    });
  };

  handleRowSelect = field => {
    // Select a config field (and un-select anything else)
    const {selectedField, onSelectField} = this.props;
    onSelectField(isEqual(field, selectedField) ? null : field);
  };

  handleSearch = query => {
    // Set the search filter
    const {onSelectField} = this.props;
    onSelectField(null);
    this.setState({searchFilter: query});
  };

  handleInput = e => {
    // Handle an input value update
    this.setState({searchValue: e.target.value});
  };

  handleClearInput = () => {
    // Clear the current input and filter
    const {onSelectField} = this.props;
    onSelectField(null);
    this.setState({searchValue: '', searchFilter: ''});
  };

  isEntryVisible = (entry, filter) => {
    // Return whether this entry should be shown based on the search filter
    const {field, metadata} = entry;
    const fieldName = field.join(CONFIG_FIELD_DELIMITER).toLowerCase();
    return (
      filter === '' ||
      fieldName.indexOf(filter) > -1 ||
      (metadata.desc && metadata.desc.toLowerCase().indexOf(filter) > -1)
    );
  };

  render() {
    const {
      classes,
      data,
      hideDeprecatedFields,
      onDraftChange,
      selectedField,
    } = this.props;
    const {searchValue, searchFilter} = this.state;
    const filter = searchFilter.trim().toLowerCase();
    const orderedData = orderBy(
      data,
      this.state.orderBy,
      Array(this.state.orderBy.length).fill(this.state.order),
    );

    return (
      <div className={classes.root}>
        <div className={classes.searchContainer}>
          <SearchBar
            value={searchValue}
            autoFocus={true}
            onChange={this.handleInput}
            onClearInput={this.handleClearInput}
            onSearch={this.handleSearch}
            debounceMs={100}
          />
        </div>
        <div className={classes.tableContainer}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map(col => {
                  return (
                    <TableCell
                      className={classes.header}
                      key={col.label}
                      sortDirection={
                        col.orderBy && this.state.orderBy === col.orderBy
                          ? this.state.order
                          : false
                      }>
                      {col.orderBy ? (
                        <Tooltip title="Sort" enterDelay={250}>
                          <TableSortLabel
                            active={this.state.orderBy === col.orderBy}
                            direction={this.state.order}
                            onClick={this.handleRequestSort(col.orderBy)}>
                            {col.label}
                          </TableSortLabel>
                        </Tooltip>
                      ) : (
                        <TableSortLabel active={false}>
                          {col.label}
                        </TableSortLabel>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {orderedData.map(entry => {
                if (hideDeprecatedFields && entry.metadata.deprecated) {
                  return null;
                }
                return (
                  <ConfigTableEntry
                    key={entry.field.join('\0')}
                    {...entry}
                    onDraftChange={onDraftChange}
                    onSelect={this.handleRowSelect}
                    isSelected={isEqual(entry.field, selectedField)}
                    isVisible={this.isEntryVisible(entry, filter)}
                    colSpan={columns.length}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(ConfigTable);
