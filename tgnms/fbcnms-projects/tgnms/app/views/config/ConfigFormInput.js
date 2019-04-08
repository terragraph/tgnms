/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  createNumericInput,
  createSelectInput,
  createTextInput,
  formParseFloat,
  formParseInt,
} from '../../helpers/FormHelpers';
import {ConfigBaseTypes} from '../../constants/ConfigConstants';
import {isEqual} from 'lodash-es';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import {shallowEqual, validateField} from '../../helpers/ConfigHelpers';
import {withStyles} from '@material-ui/core/styles';

const styles = {};

type Props = {
  classes: Object,
  metadata: Object,
  value: string | number | boolean,
  label: ?string,
  onChange: Function, // value => void
};

type State = {
  localValue: string | number | boolean,
};

class ConfigFormInput extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {localValue: props.value};
  }

  static getDerivedStateFromProps(nextProps, _prevState) {
    // Update local input field
    return {localValue: nextProps.value};
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      !shallowEqual(this.state, nextState) ||
      this.props.label !== nextProps.label ||
      nextProps.value !== this.state.localValue || // lock input field position
      !isEqual(this.props.metadata, nextProps.metadata)
    );
  }

  getDataType = () => {
    // Get the data type in the metadata, or default to the default value's type
    const {metadata, value} = this.props;
    const {type} = metadata;

    // Is the metadata type valid?
    if (type && ConfigBaseTypes.includes(type)) {
      return type;
    }

    // Use the type of the default value
    switch (typeof value) {
      case 'number':
        return 'INTEGER';
      case 'boolean':
        return 'BOOLEAN';
      default:
        return 'STRING';
    }
  };

  parseFormInputValue = value => {
    // Parse the form input value (to handle numeric types)
    const type = this.getDataType();
    return type === 'INTEGER'
      ? formParseInt(value)
      : type === 'FLOAT'
      ? formParseFloat(value)
      : value;
  };

  validateFormInputValue = value => {
    // Validate the form input value
    const {metadata} = this.props;

    const parsedValue = this.parseFormInputValue(value);
    return parsedValue !== null && validateField(parsedValue, metadata);
  };

  render() {
    const {onChange, value, label} = this.props;

    // Create the associated form input
    const type = this.getDataType();
    let inputFormFunc = null;
    const inputFormOptions = {};
    if (type === 'STRING') {
      inputFormFunc = createTextInput;
    } else if (type === 'INTEGER' || type === 'FLOAT') {
      inputFormFunc = createNumericInput;
    } else if (type === 'BOOLEAN') {
      inputFormFunc = createSelectInput;
      inputFormOptions.menuItems = [true, false].map(val => (
        <MenuItem key={String(val)} value={val}>
          {String(val)}
        </MenuItem>
      ));
    } else {
      return null; // shouldn't happen
    }

    return inputFormFunc(
      {
        ...inputFormOptions,
        label,
        error: !this.validateFormInputValue(value),
        value: 'localValue',
        onChange: newValue =>
          onChange(newValue, this.parseFormInputValue(newValue)),
      },
      this.state,
      this.setState.bind(this),
    );
  }
}

export default withStyles(styles)(ConfigFormInput);
