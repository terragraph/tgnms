/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormLabel from '@material-ui/core/FormLabel';
import MaterialReactSelect from '@fbcnms/tg-nms/app/components/common/MaterialReactSelect';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import TextField from '@material-ui/core/TextField';

/** Create a "checkbox group" input type. */
export function createCheckboxGroupInput(options, state, setState) {
  const {label, helperText, choices} = options;
  return (
    <FormControl
      key={choices.map(choice => choice.value).join('-')}
      margin="dense"
      fullWidth>
      <FormLabel>{label}</FormLabel>
      <FormGroup>
        {choices.map(choice => {
          return (
            <FormControlLabel
              key={choice.value}
              label={choice.label}
              style={{marginLeft: '-8px'}}
              control={
                <Checkbox
                  checked={state[choice.value]}
                  color={choice.color}
                  onChange={ev => {
                    const v = ev.target.checked;
                    setState(
                      {[choice.value]: v},
                      choice.onChange ? () => choice.onChange(v) : null,
                    );
                  }}
                  style={{padding: '6px'}}
                />
              }
            />
          );
        })}
      </FormGroup>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}

/** Create a "radio group" input type. */
export function createRadioGroupInput(options, state, setState) {
  const {label, choices, helperText, value, required, onChange} = options;
  return (
    <FormControl
      key={choices.map(choice => choice.value).join('-')}
      margin="dense"
      fullWidth
      required={required}>
      <FormLabel>{label}</FormLabel>
      <RadioGroup
        onChange={ev => {
          const v = ev.target.value;
          setState({[value]: v}, onChange ? () => onChange(v) : null);
        }}
        value={state[value]}>
        {choices.map(choice => {
          return (
            <FormControlLabel
              key={choice.value}
              label={choice.label}
              style={{marginLeft: '-8px'}}
              control={<Radio color={choice.color} style={{padding: '6px'}} />}
              value={choice.value}
              disabled={!!choice.disabled}
            />
          );
        })}
      </RadioGroup>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}

/** Create a "text" input type. */
export function createTextInput(options, state, setState) {
  const {
    label,
    adornment,
    helperText,
    placeholder,
    value,
    ref,
    required,
    error,
    disabled,
    autoFocus,
    isPassword,
    onChange,
    onFocus,
    onBlur,
  } = options;
  return (
    <TextField
      id={value}
      key={value}
      label={label}
      helperText={helperText}
      placeholder={placeholder}
      type={isPassword ? 'password' : 'text'}
      InputLabelProps={{shrink: true}}
      InputProps={{...(adornment || {}), inputRef: ref || null}}
      margin="dense"
      fullWidth
      required={required}
      error={error}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={ev => {
        const v = ev.target.value;
        setState({[value]: v}, onChange ? () => onChange(v) : null);
      }}
      value={state[value]}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

/** Create a "number" input type. */
export function createNumericInput(options, state, setState) {
  const {
    label,
    adornment,
    helperText,
    value,
    ref,
    required,
    error,
    disabled,
    autoFocus,
    onChange,
    step,
    onFocus,
    onBlur,
  } = options;
  return (
    <TextField
      id={value}
      key={value}
      label={label}
      helperText={helperText}
      type="number"
      InputLabelProps={{shrink: true}}
      InputProps={{...(adornment || {}), inputRef: ref || null}}
      inputProps={{step}}
      margin="dense"
      fullWidth
      required={required}
      error={error}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={ev => {
        const v = ev.target.value;
        setState({[value]: v}, onChange ? () => onChange(v) : null);
      }}
      value={state[value]}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

/** Create a "select" input type (via material-ui). */
export function createSelectInput(options, state, setState) {
  const {
    label,
    helperText,
    value,
    required,
    disabled,
    onChange,
    menuItems,
  } = options;
  return (
    <TextField
      id={value}
      key={value}
      label={label}
      helperText={helperText}
      select
      InputLabelProps={{shrink: true}}
      margin="dense"
      fullWidth
      required={required}
      disabled={disabled}
      onChange={ev => {
        const v = ev.target.value;
        setState({[value]: v}, onChange ? () => onChange(v) : null);
      }}
      value={state[value]}>
      {menuItems}
    </TextField>
  );
}

/** Create a "select" input type (via react-select). */
export function createReactSelectInput(options, state, setState) {
  const {label, value, required, onChange, selectOptions} = options;

  // <Select> 'value' field is an Object{label, value} instead of a string
  const fakeValueLabel = selectOptions.find(opt => opt.value === state[value]);
  const fakeValue =
    fakeValueLabel === undefined
      ? undefined
      : {label: fakeValueLabel.label, value: state[value]};

  return (
    <MaterialReactSelect
      id={value}
      key={value}
      textFieldProps={{
        label: required ? label + ' *' : label,
        InputLabelProps: {shrink: true},
      }}
      getOptionValue={option => option.label}
      options={selectOptions}
      required={required}
      onChange={val => {
        const v = val.value;
        setState({[value]: v}, onChange ? () => onChange(v) : null);
      }}
      value={fakeValue}
    />
  );
}

/**
 * Parses an integer field value from createNumericInput().
 * Returns the input (string) as an integer or null.
 */
export function formParseInt(value, radix = 10) {
  const parsedValue = parseInt(value, radix);
  return isNaN(parsedValue) ? null : parsedValue;
}

/**
 * Parses a floating-point field value from createNumericInput().
 * Returns the input (string) as a float or null.
 */
export function formParseFloat(value) {
  const parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? null : parsedValue;
}
