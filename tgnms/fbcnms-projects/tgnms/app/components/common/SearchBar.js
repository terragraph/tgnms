/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import ClearIcon from '@material-ui/icons/Clear';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import SearchIcon from '@material-ui/icons/Search';
import {debounce} from 'lodash';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  inputPaper: {
    display: 'flex',
    height: 40,
  },
  input: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(1),
  },
  searchIconButton: {
    padding: 6,
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  clearIconButton: {
    padding: 6,
  },
  icon: {
    opacity: 0.5,
    color: theme.palette.grey[500],
  },
}));

type Props = {
  value: string,
  isLoading?: boolean,
  autoFocus?: boolean,
  onChange?: any => void,
  onClearInput?: () => void,
  onSearch?: string => void,
  debounceMs?: number,
};

export default function SearchBar(props: Props) {
  const classes = useStyles();
  const {
    onClearInput,
    onChange,
    onSearch,
    debounceMs,
    value,
    isLoading,
    autoFocus,
  } = props;

  const handleSearch = React.useMemo(() => {
    const searchFunc = str => onSearch && onSearch(str);
    if (debounceMs !== undefined && debounceMs > 0) {
      return debounce(searchFunc, debounceMs);
    }
    return searchFunc;
  }, [onSearch, debounceMs]);

  const handleClearInput = React.useCallback(
    e => {
      // Clear input field falling back to onChange())
      (onClearInput && onClearInput()) || (onChange && onChange(e));
    },
    [onClearInput, onChange],
  );

  const handleInput = React.useCallback(
    e => {
      // Handle a search input change event
      const val = e.target.value;

      // If search field was cleared, reset state
      if (val === '') {
        handleClearInput(e);
        return;
      }
      onChange && onChange(e);

      // Send a search request
      if (val.trim().length > 0) {
        handleSearch(val.trim());
      }
    },
    [handleSearch, onChange, handleClearInput],
  );

  const handleBlur = React.useCallback(
    e => {
      // Reset the search field if empty (when trimmed)
      if (value.trim().length === 0) {
        handleClearInput(e);
      }
    },
    [handleClearInput, value],
  );

  return (
    <Paper className={classes.inputPaper} elevation={2}>
      <Input
        className={classes.input}
        onChange={handleInput}
        onBlur={handleBlur}
        value={value ? value : ''}
        placeholder="Search"
        fullWidth
        disableUnderline
        autoFocus={autoFocus}
        endAdornment={
          <InputAdornment position="end">
            {isLoading ? (
              <CircularProgress size={24} />
            ) : value === '' ? (
              <IconButton
                disableRipple
                classes={{root: classes.searchIconButton}}>
                <SearchIcon classes={{root: classes.icon}} />
              </IconButton>
            ) : (
              <IconButton
                data-testid="clear-button"
                classes={{root: classes.clearIconButton}}
                onClick={handleClearInput}>
                <ClearIcon classes={{root: classes.icon}} />
              </IconButton>
            )}
          </InputAdornment>
        }
      />
    </Paper>
  );
}
