/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CheckBoxDropDown from '../common/CheckBoxDropdown';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import useForm from '../../hooks/useForm';
import {makeStyles} from '@material-ui/styles';

import type {TableOption} from './SchedulerTypes';

export type Props<T> = {
  onOptionsUpdate: (options: T) => any,
  optionsInput: Array<TableOption>,
};

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(),
  },
  legend: {
    marginBottom: theme.spacing(2),
  },
  formControl: {
    marginRight: theme.spacing(),
    minWidth: 150,
  },
  testOptionSelect: {
    textTransform: 'capitalize',
  },
  testOptionItem: {
    textTransform: 'capitalize',
  },
}));

export default function TableOptions<T>(props: Props<T>) {
  const {onOptionsUpdate, optionsInput} = props;
  const classes = useStyles();
  const firstRender = React.useRef(true);
  const dateRanges = React.useMemo(() => {
    const now = moment();
    return {
      day: now.subtract(1, 'days').format(),
      month: now.subtract(1, 'months').format(),
      quarter: now.subtract(3, 'months').format(),
      year: now.subtract(1, 'year').format(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment().dayOfYear()]); // only recompute when the day changes

  const {formState, handleInputChange, updateFormState} = useForm({
    initialState: optionsInput.reduce(
      (res, option) => {
        res[option.name] = option.initialValue || [];
        return res;
      },
      {startTime: dateRanges.month},
    ),
  });

  const handleCheckBoxChange = (value, array) => {
    updateFormState({[value]: array});
  };

  React.useEffect(() => {
    // only run this effect on update
    if (firstRender.current === true) {
      firstRender.current = false;
      return;
    }
    onOptionsUpdate(formState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  return (
    <div className={classes.root}>
      <Typography variant="srOnly">Filters</Typography>
      <FormGroup row>
        <FormControl className={classes.formControl}>
          <InputLabel htmlFor="startTime">Since</InputLabel>
          <Select
            value={formState.startTime}
            onChange={handleInputChange(val => ({startTime: val}))}
            inputProps={{
              id: 'startTime',
              name: 'startTime',
            }}>
            <MenuItem value={dateRanges.day}>Yesterday</MenuItem>
            <MenuItem value={dateRanges.month}>30 days ago</MenuItem>
            <MenuItem value={dateRanges.quarter}>90 days ago</MenuItem>
            <MenuItem value={dateRanges.year}>A year ago</MenuItem>
          </Select>
        </FormControl>
        {optionsInput.map(option => (
          <CheckBoxDropDown
            key={option.title}
            name={option.name}
            onChange={handleCheckBoxChange}
            title={option.title}
            menuItems={option.options.map(optionItem => ({
              value: optionItem.type,
              title: optionItem.title,
              enabled:
                option?.initialValue?.find(
                  value => value === optionItem.type,
                ) !== undefined,
            }))}
          />
        ))}
      </FormGroup>
    </div>
  );
}
