/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import React from 'react';

import FormControl from '@material-ui/core/FormControl';
import InputAdornment from '@material-ui/core/InputAdornment';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import classnames from 'classnames';
import {withStyles} from '@material-ui/core/styles';

import type {
  NetworkTestArgument,
  NetworkTestParameter,
} from '../../apiutils/NetworkTestAPIUtil';

const styles = theme => ({
  field: {
    display: 'block',
    marginBottom: theme.spacing.unit * 2,
    margin: '0 auto',
  },
  input: {
    minWidth: 300,
  },
});

type Props = {|
  parameter: NetworkTestParameter,
  value: string,
  onChange: NetworkTestArgument => void,
|};

export default class NetworkTestParameterFactory extends React.PureComponent<Props> {
  render() {
    const {ui_type} = this.props.parameter.meta;
    const inputProps = {
      parameter: this.props.parameter,
      value: this.props.value,
      onChange: this.handleArgumentChange,
    };
    if (ui_type === 'range') {
      return <RangeNetworkTestParameter {...inputProps} />;
    }
    if (ui_type === 'dropdown') {
      return <DropdownNetworkTestParameter {...inputProps} />;
    }
    return <TextNetworkTestParameter {...inputProps} />;
  }
  handleArgumentChange = (e: SyntheticInputEvent<HTMLElement>) => {
    const argumentValue: NetworkTestArgument = {
      id: this.props.parameter.id,
      value: e.target.value,
    };
    this.props.onChange(argumentValue);
  };
}

type NetworkTestParameterControlProps = {
  parameter: NetworkTestParameter,
  value: string,
  onChange: (SyntheticInputEvent<HTMLElement>) => void,
  classes: {[string]: string},
};

const RangeNetworkTestParameter = withStyles(styles)(
  function RangeNetworkTestParameter({
    parameter,
    value,
    onChange,
    classes,
  }: NetworkTestParameterControlProps) {
    return (
      <TextField
        id={parameter.id}
        name={parameter.id}
        label={parameter.label}
        type="number"
        value={value}
        onChange={onChange}
        className={classes.field}
        InputProps={{
          className: classes.input,
          endAdornment: <UnitInputAdorner unit={parameter.meta.unit} />,
        }}
        inputProps={{
          min: (parameter.meta.range && parameter.meta.range.min_value) || null,
          max: (parameter.meta.range && parameter.meta.range.max_value) || null,
        }}
      />
    );
  },
);

const DropdownNetworkTestParameter = withStyles(styles)(
  function DropdownNetworkTestParameter({
    parameter,
    value,
    onChange,
    classes,
  }: NetworkTestParameterControlProps) {
    if (!parameter.meta.dropdown) {
      return null;
    }
    return (
      <FormControl className={classes.field}>
        <InputLabel htmlFor={parameter.id}>{parameter.label}</InputLabel>
        <Select
          className={classes.input}
          name={parameter.id}
          id={parameter.id}
          value={value}
          onChange={onChange}>
          {parameter.meta.dropdown.map(({value, label}) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  },
);

const TextNetworkTestParameter = withStyles(styles)(
  function TextNetworkTestParameter({
    parameter,
    value,
    onChange,
    classes,
  }: NetworkTestParameterControlProps) {
    return (
      <TextField
        className={classnames(classes.input, classes.field)}
        id={parameter.id}
        name={parameter.id}
        label={parameter.label}
        value={value}
        onChange={onChange}
        InputProps={{
          endAdornment: <UnitInputAdorner unit={parameter.meta.unit} />,
        }}
      />
    );
  },
);

function UnitInputAdorner({unit}: {unit: string}) {
  if (typeof unit !== 'string' || unit.toLowerCase() === 'none') {
    return null;
  }
  return <InputAdornment position="end">{unit}</InputAdornment>;
}
