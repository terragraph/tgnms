/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import AsyncSelect from 'react-select/lib/Async';
import CancelIcon from '@material-ui/icons/Cancel';
import Chip from '@material-ui/core/Chip';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {emphasize} from '@material-ui/core/styles/colorManipulator';
import {withStyles} from '@material-ui/core/styles';

/* Copied from: https://material-ui.com/demos/autocomplete/#react-select */

const styles = theme => ({
  input: {
    display: 'flex',
    padding: 0,
    height: '100%',
  },
  valueContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    flex: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  chip: {
    margin: `${theme.spacing(0.5)}px ${theme.spacing(0.25)}px`,
  },
  chipFocused: {
    backgroundColor: emphasize(
      theme.palette.type === 'light'
        ? theme.palette.grey[300]
        : theme.palette.grey[700],
      0.08,
    ),
  },
  chipLabel: {
    whiteSpace: 'normal',
  },
  chipRoot: {
    whiteSpace: 'normal',
  },
  noOptionsMessage: {
    padding: `${theme.spacing(1)}px ${theme.spacing(2)}px`,
  },
  singleValue: {
    fontSize: 16,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  placeholder: {
    position: 'absolute',
    left: 2,
    fontSize: 16,
  },
  paper: {
    position: 'absolute',
    marginTop: theme.spacing(1),
    left: 0,
    right: 0,
  },
  wrap: {
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    display: 'inline-block',
    width: '100%',
    maxWidth: '100%',
  },
  ellipsis: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

function NoOptionsMessage(props) {
  return (
    <Typography
      color="textSecondary"
      className={props.selectProps.classes.noOptionsMessage}
      {...props.innerProps}>
      {props.children}
    </Typography>
  );
}

function inputComponent({inputRef, ...props}) {
  return <div ref={inputRef} {...props} />;
}

function Control(props) {
  return (
    <TextField
      margin="dense"
      fullWidth
      InputProps={{
        inputComponent,
        inputProps: {
          className: props.selectProps.classes.input,
          inputRef: props.innerRef,
          children: props.children,
          ...props.innerProps,
        },
      }}
      {...props.selectProps.textFieldProps}
    />
  );
}

function Option(props) {
  return (
    <MenuItem
      buttonRef={props.innerRef}
      selected={props.isFocused}
      component="div"
      style={{
        fontWeight: props.isSelected ? 500 : 400,
        whiteSpace: props.selectProps.wrapOptions ? 'normal' : '',
      }}
      {...props.innerProps}>
      <span
        className={
          props.selectProps.wrapOptions === true
            ? props.selectProps.classes.wrap
            : props.selectProps.classes.ellipsis
        }>
        {props.children}
      </span>
    </MenuItem>
  );
}

function Placeholder(props) {
  return (
    <Typography
      color="textSecondary"
      className={props.selectProps.classes.placeholder}
      {...props.innerProps}>
      {props.children}
    </Typography>
  );
}

function SingleValue(props) {
  return (
    <Typography
      className={props.selectProps.classes.singleValue}
      {...props.innerProps}>
      {props.children}
    </Typography>
  );
}

function ValueContainer(props) {
  return (
    <div className={props.selectProps.classes.valueContainer}>
      {props.children}
    </div>
  );
}

function MultiValue(props) {
  return (
    <Chip
      tabIndex={-1}
      label={props.children}
      classes={{
        root: props.selectProps.classes.chipRoot,
        label: props.selectProps.classes.chipLabel,
      }}
      className={classNames(props.selectProps.classes.chip, {
        [props.selectProps.classes.chipFocused]: props.isFocused,
      })}
      onDelete={props.removeProps.onClick}
      deleteIcon={<CancelIcon {...props.removeProps} />}
    />
  );
}

function Menu(props) {
  return (
    <Paper
      elevation={2}
      square
      className={props.selectProps.classes.paper}
      {...props.innerProps}>
      {props.children}
    </Paper>
  );
}

const components = {
  Control,
  Menu,
  MultiValue,
  NoOptionsMessage,
  Option,
  Placeholder,
  SingleValue,
  ValueContainer,
};

class MaterialReactSelect extends React.Component {
  render() {
    const selectStyles = {
      input: base => ({
        ...base,
        color: this.props.theme.palette.text.primary,
        '& input': {
          font: 'inherit',
        },
      }),
      menuPortal: base => ({...base, zIndex: 9999}),
    };
    const selectProps = {
      styles: selectStyles,
      components,
      ...this.props,
      placeholder: this.props.placeholder || '',

      // Set the menu parent to <body> with high z-index
      menuPortalTarget: document.body,
    };

    return this.props.async ? (
      <AsyncSelect {...selectProps} />
    ) : (
      <Select {...selectProps} />
    );
  }
}

MaterialReactSelect.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  async: PropTypes.bool,
};

export default withStyles(styles, {withTheme: true})(MaterialReactSelect);
