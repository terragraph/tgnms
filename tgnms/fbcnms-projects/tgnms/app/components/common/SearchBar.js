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
import fbt from 'fbt';
import {debounce} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
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
});

type Props = {
  classes: {[string]: string},
  value: string,
  isLoading?: boolean,
  autoFocus?: boolean,
  onChange?: any => void,
  onClearInput?: () => void,
  onSearch?: string => void,
  debounceMs?: number,
};

class SearchBar extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    // Debounce search callbacks (if needed)
    const {debounceMs} = props;
    if (debounceMs !== undefined && debounceMs > 0) {
      this.handleSearch = debounce(this.handleSearch, debounceMs);
    }
  }

  handleSearch = str => {
    // Fire the search callback
    const {onSearch} = this.props;
    onSearch && onSearch(str);
  };

  handleInput = e => {
    // Handle a search input change event
    const {onChange} = this.props;
    const value = e.target.value;

    // If search field was cleared, reset state
    if (value === '') {
      this.handleClearInput(e);
      return;
    }
    onChange && onChange(e);

    // Send a search request
    if (value.trim().length > 0) {
      this.handleSearch(value.trim());
    }
  };

  handleBlur = e => {
    // Reset the search field if empty (when trimmed)
    const {value} = this.props;
    if (value.trim().length === 0) {
      this.handleClearInput(e);
    }
  };

  handleClearInput = e => {
    // Clear the input field (using onClearInput(), falling back to onChange())
    const {onChange, onClearInput} = this.props;
    (onClearInput && onClearInput()) || (onChange && onChange(e));
  };

  render() {
    const {classes, value, isLoading, autoFocus} = this.props;

    return (
      <Paper className={classes.inputPaper} elevation={2}>
        <Input
          className={classes.input}
          onChange={this.handleInput}
          onBlur={this.handleBlur}
          value={value ? value : ''}
          placeholder={fbt('Search', 'Search bar placeholder').toString()}
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
                  classes={{root: classes.clearIconButton}}
                  onClick={this.handleClearInput}>
                  <ClearIcon classes={{root: classes.icon}} />
                </IconButton>
              )}
            </InputAdornment>
          }
        />
      </Paper>
    );
  }
}

export default withStyles(styles)(SearchBar);
