/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AddIcon from '@material-ui/icons/Add';
import ConfigTableEntry from './ConfigTableEntry';
import Fab from '@material-ui/core/Fab';
import ModalConfigAddField from './ModalConfigAddField';
import React from 'react';
import SearchBar from '@fbcnms/tg-nms/app/components/common/SearchBar';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Tooltip from '@material-ui/core/Tooltip';
import {CONFIG_FIELD_DELIMITER} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TableOrder} from '@fbcnms/tg-nms/app/helpers/TableHelpers';
import {configRootHeightCss} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {isEqual, orderBy} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

import type {ConfigDataType} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
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
    height: configRootHeightCss(theme),
  },
  header: {
    backgroundColor: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  addButton: {
    position: 'fixed',
    bottom: 0,
    right: 0,
    margin: theme.spacing(2),
  },
}));

const columns = Object.freeze([
  {label: 'Field', orderBy: ['field']},
  {label: 'Description'},
  {label: 'Status', orderBy: ['hasOverride', 'field']},
  {
    label: 'Type',
    orderBy: ['metadata.type', 'hasOverride', 'field'],
  },
  {label: 'Value'},
]);

type Props = {
  hideDeprecatedFields: boolean,
};

export default function ConfigTable(props: Props) {
  const classes = useStyles();
  const {hideDeprecatedFields} = props;
  const {configData, onUpdate} = useConfigTaskContext();
  const [selectedField, setSelectedField] = React.useState(null);
  const [order, setOrder] = React.useState(TableOrder.ASCENDING);
  const [orderByValue, setOrderByValue] = React.useState(columns[0].orderBy);
  const [searchValue, setSearchValue] = React.useState('');
  const [searchFilter, setSearchFilter] = React.useState('');
  const {isOpen, open, close} = useModalState();

  const handleRequestSort = property => _event => {
    // Sort the table by the given property

    setOrder(
      orderByValue === property && order === TableOrder.DESCENDING
        ? TableOrder.ASCENDING
        : TableOrder.DESCENDING,
    );
    setOrderByValue(property);
  };

  const handleRowSelect = React.useCallback(
    field => {
      // Select a config field (and un-select anything else)
      setSelectedField(isEqual(field, selectedField) ? null : field);
    },
    [selectedField],
  );

  const handleSearch = query => {
    // Set the search filter
    setSelectedField(null);
    setSearchFilter(query);
  };

  const handleInput = e => {
    // Handle an input value update
    setSearchValue(e.target.value);
  };

  const handleClearInput = () => {
    // Clear the current input and filter
    setSelectedField(null);
    setSearchValue('');
    setSearchFilter('');
  };

  const isEntryVisible = (entry, filter) => {
    // Return whether this entry should be shown based on the search filter
    const {field, metadata} = entry;
    const fieldName = field.join(CONFIG_FIELD_DELIMITER).toLowerCase();
    return Boolean(
      filter === '' ||
        fieldName.indexOf(filter) > -1 ||
        (metadata.desc && metadata.desc.toLowerCase().indexOf(filter) > -1),
    );
  };

  const filter = searchFilter.trim().toLowerCase();
  const orderedData = orderBy(
    configData,
    orderByValue,
    Array(orderByValue.length).fill(order),
  );

  return (
    <div className={classes.root}>
      <div className={classes.searchContainer}>
        <SearchBar
          value={searchValue}
          autoFocus={true}
          onChange={handleInput}
          onClearInput={handleClearInput}
          onSearch={handleSearch}
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
                      col.orderBy && orderByValue === col.orderBy
                        ? order
                        : false
                    }>
                    {col.orderBy ? (
                      <Tooltip title="Sort" enterDelay={250}>
                        <TableSortLabel
                          active={orderByValue === col.orderBy}
                          direction={order}
                          onClick={handleRequestSort(col.orderBy)}>
                          {col.label}
                        </TableSortLabel>
                      </Tooltip>
                    ) : (
                      <TableSortLabel active={false} hideSortIcon={true}>
                        {col.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {orderedData.map((entry: ConfigDataType) => {
              if (hideDeprecatedFields && entry.metadata.deprecated) {
                return null;
              }
              return (
                <ConfigTableEntry
                  key={entry.field.join('\0')}
                  {...entry}
                  onUpdate={onUpdate}
                  onSelect={handleRowSelect}
                  isSelected={isEqual(entry.field, selectedField)}
                  isVisible={isEntryVisible(entry, filter)}
                  colSpan={columns.length}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Fab className={classes.addButton} color="primary" onClick={open}>
        <AddIcon />
      </Fab>
      <ModalConfigAddField isOpen={isOpen} onClose={close} />
    </div>
  );
}
