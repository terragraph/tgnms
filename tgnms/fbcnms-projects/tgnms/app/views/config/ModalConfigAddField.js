/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import ConfigFormInput from './ConfigFormInput';
import ConfigMetadataBlock from './ConfigMetadataBlock';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MaterialModal from '../../components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {
  CONFIG_FIELD_DELIMITER,
  ConfigBaseTypes,
} from '../../constants/ConfigConstants';
import {createSelectInput, createTextInput} from '../../helpers/FormHelpers';
import {debounce, difference, isPlainObject} from 'lodash';
import {getFieldMetadata, validateField} from '../../helpers/ConfigHelpers';
import {toTitleCase} from '../../helpers/StringHelpers';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: theme.spacing(),
  },
  red: {
    color: 'red',
  },
  autocompletePopper: {
    // Need to display popper over the modal (Dialog) element
    zIndex: theme.zIndex.modal + 1,
  },
  autocompletePaper: {
    maxHeight: 36 * 5 /* list items */ + theme.spacing() /* padding */,
    overflowY: 'auto',
    marginTop: theme.spacing(),
  },
  metadataPaper: {
    padding: theme.spacing(),
    marginTop: theme.spacing(),
  },
});

const initState = Object.freeze({
  fieldName: '',
  type: 'STRING',
  value: '',
  parsedValue: null,
  fieldMetadata: null,
  formErrors: {},
  fieldAutocomplete: [],
});

type Props = {
  classes: Object,
  isOpen: boolean,
  onClose: Function,
  onSubmit: Function,
  data: Array<Object>,
  configMetadata: Object,
};

type State = {
  fieldName: string,
  type: string,
  value: string | number | boolean,
  parsedValue: string | number | boolean | null,
  fieldMetadata: ?Object,
  formErrors: Object,
  fieldAutocomplete: Array<Object>, // [{key: string, isBaseType: bool}]
};

// Autocomplete debounce interval (in ms)
const AUTOCOMPLETE_DEBOUNCE_MS = 80;

class ModalConfigAddField extends React.Component<Props, State> {
  state = {...initState};

  // Anchor node for Popper element in autocomplete results
  popperNode = null;

  constructor(props) {
    super(props);

    // Debounce autocomplete
    this.updateAutocompleteResults = debounce(
      this.updateAutocompleteResults,
      AUTOCOMPLETE_DEBOUNCE_MS,
    );
  }

  clearFormErrors = key => {
    // Clear the form error (if any)
    const {formErrors} = this.state;
    if (formErrors.hasOwnProperty(key)) {
      delete formErrors[key];
      this.setState({formErrors});
    }
  };

  getField = fieldName => {
    // Get the field (i.e. key array) for the given field name
    const trimmedName = fieldName.trim();
    return trimmedName === '' ? [] : trimmedName.split(CONFIG_FIELD_DELIMITER);
  };

  getDefaultMetadata = () => {
    // Get the field metadata, or a reasonable default
    const {fieldMetadata, type} = this.state;

    // Fill in the 'type' property if missing
    return fieldMetadata
      ? fieldMetadata.hasOwnProperty('type')
        ? fieldMetadata
        : {...fieldMetadata, type}
      : {type};
  };

  getAutocompleteResults = field => {
    // Get autocomplete results for the given field
    const {configMetadata} = this.props;
    if (field.length === 0) {
      return []; // don't show anything for empty field name
    }

    // Start at the parent of the given field
    let metadata =
      field.length > 1
        ? getFieldMetadata(configMetadata, field.slice(0, field.length - 1))
        : configMetadata;
    if (!metadata) {
      return []; // parent not present in metadata
    }
    if (
      metadata.hasOwnProperty('desc') &&
      metadata.hasOwnProperty('type') &&
      ConfigBaseTypes.includes(metadata.type)
    ) {
      return []; // reached an actual field, so don't show anything
    }

    // Handle object values...
    if (metadata.type === 'OBJECT' && metadata.hasOwnProperty('objVal')) {
      metadata = metadata.objVal.properties;
    }

    // If this is a map value, quit here (need a map key)
    if (metadata.type === 'MAP' && metadata.hasOwnProperty('mapVal')) {
      return [];
    }

    // If we have an exact match, don't show any results
    const query = field[field.length - 1].toLowerCase();
    if (Object.keys(metadata).find(k => k.toLowerCase() === query)) {
      return [];
    }

    // Filter by the last part of the field
    const results = Object.entries(metadata)
      .filter(([k, v]) => {
        const key = k.toLowerCase();
        return isPlainObject(v) && key.startsWith(query) && key !== query;
      })
      .map(([k, v]) => ({
        key: k,
        isBaseType:
          v.hasOwnProperty('desc') &&
          v.hasOwnProperty('type') &&
          ConfigBaseTypes.includes(v.type),
      }));
    return results;
  };

  updateAutocompleteResults = () => {
    // Update field autocomplete results
    const {fieldName} = this.state;
    const field = this.getField(fieldName);

    // Update autocomplete results
    const fieldAutocomplete = this.getAutocompleteResults(field);
    this.setState({fieldAutocomplete});
  };

  clearAutocompleteResults = () => {
    // Clear field autocomplete results
    this.setState({fieldAutocomplete: []});
  };

  handleAutocompleteClick = (key, isBaseType) => {
    // Handle clicking on an autocomplete result
    const {fieldName} = this.state;

    // Replace the last token in the current field
    // If this is NOT a base type, append a trailing delimiter
    const field = this.getField(fieldName);
    if (field.length === 0) {
      field.push(key);
    } else {
      field[field.length - 1] = key;
    }
    if (!isBaseType) {
      field.push('');
    }
    const newFieldName = field.join(CONFIG_FIELD_DELIMITER);
    this.setState({fieldName: newFieldName});

    // Trigger name change event
    this.handleFieldNameChange(newFieldName);
  };

  handleEnter = () => {
    // Reset the modal state on enter
    this.setState(initState);
  };

  handleFieldNameChange = fieldName => {
    // Handle a field name change
    const {configMetadata} = this.props;
    const {type} = this.state;

    // Update metadata and type (if possible)
    const field = this.getField(fieldName);
    const fieldMetadata = getFieldMetadata(configMetadata, field);
    const typeProps =
      fieldMetadata &&
      fieldMetadata.type !== type &&
      ConfigBaseTypes.includes(fieldMetadata.type)
        ? {type: fieldMetadata.type, value: '', parsedValue: null}
        : {};

    this.setState(
      {fieldMetadata, ...typeProps},
      this.updateAutocompleteResults,
    );
    this.clearFormErrors('fieldName');
  };

  handleTypeChange = _type => {
    // Handle a type change
    this.setState({value: '', parsedValue: null});
    this.clearFormErrors('type');
  };

  handleValueChange = (value, parsedValue) => {
    // Handle a value change
    this.setState({value, parsedValue});
    this.clearFormErrors('value');
  };

  handleSubmit = () => {
    // Submit the new field
    const {data, onSubmit, onClose} = this.props;
    const {fieldName, type, value, parsedValue, fieldMetadata} = this.state;
    const fieldValue = parsedValue === null ? value : parsedValue;
    const field = this.getField(fieldName);

    // Validate form inputs
    const errors = {};
    if (fieldName.trim() === '') {
      errors['fieldName'] = 'Please enter a field.';
    } else if (fieldMetadata && fieldMetadata.deprecated) {
      errors['fieldName'] = 'That field is deprecated.';
    } else {
      // Check if the current field is a sub-array of an existing field
      const superfield = data.find(
        entry => difference(field, entry.field).length === 0,
      );
      if (superfield) {
        // Make sure there is actually a non-null value
        // Otherwise, we could be showing a fake base layer
        if (superfield.layers.find(layer => layer.value !== null)) {
          errors['fieldName'] = 'That field already exists.';
        }
      } else {
        // Check if an existing field is a sub-array of the current field
        const subfield = data.find(
          entry => difference(entry.field, field).length === 0,
        );
        if (subfield) {
          const subfieldName = subfield.field.join(CONFIG_FIELD_DELIMITER);
          errors[
            'fieldName'
          ] = `This field would shadow an existing field (${subfieldName}).`;
        }
      }
    }
    if (type === '') {
      errors['type'] = 'Please select a data type.';
    }
    if (!validateField(fieldValue, this.getDefaultMetadata())) {
      errors['value'] = 'That value is invalid.';
    }

    // Set error (if any)
    if (Object.keys(errors).length > 0) {
      this.setState({formErrors: errors});
      return;
    }

    // Submit the value
    onSubmit(field, fieldValue);
    onClose();
  };

  renderAutocompleteResults = () => {
    // Render the autocomplete results
    const {classes, isOpen} = this.props;
    const {fieldAutocomplete} = this.state;
    const showAutocomplete = isOpen && fieldAutocomplete.length > 0;

    return (
      <Popper
        className={classes.autocompletePopper}
        open={showAutocomplete}
        anchorEl={this.popperNode}
        keepMounted
        transition>
        {({TransitionProps}) => (
          <Collapse {...TransitionProps} timeout={80}>
            <Paper
              className={classes.autocompletePaper}
              square
              style={{
                width: this.popperNode ? this.popperNode.clientWidth : null,
              }}>
              <List component="nav">
                {fieldAutocomplete.map(({key, isBaseType}) => (
                  <ListItem
                    key={key}
                    button
                    dense
                    /* can't use onClick because of onBlur */
                    onMouseDown={() =>
                      this.handleAutocompleteClick(key, isBaseType)
                    }>
                    <ListItemText primary={key} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Collapse>
        )}
      </Popper>
    );
  };

  renderForm = () => {
    // Render the form inputs
    const {classes} = this.props;
    const {value, fieldMetadata, formErrors} = this.state;

    const inputs = [
      {
        func: createTextInput,
        label: 'Field',
        value: 'fieldName',
        autoFocus: true,
        onChange: this.handleFieldNameChange,
        onFocus: this.updateAutocompleteResults,
        onBlur: this.clearAutocompleteResults,
        ref: node => {
          this.popperNode = node;
        },
      },
      {
        func: createSelectInput,
        label: 'Type',
        value: 'type',
        menuItems: ConfigBaseTypes.map(type => (
          <MenuItem key={type} value={type}>
            {toTitleCase(type)}
          </MenuItem>
        )),
        disabled: Boolean(
          fieldMetadata && ConfigBaseTypes.includes(fieldMetadata.type),
        ),
        onChange: this.handleTypeChange,
      },
    ];
    const inputObjects = inputs.map(input => ({
      key: input.value,
      inputField: input.func({...input}, this.state, this.setState.bind(this)),
    }));
    inputObjects.push({
      key: 'value',
      inputField: (
        <ConfigFormInput
          label="Value"
          metadata={this.getDefaultMetadata()}
          value={value}
          onChange={this.handleValueChange}
        />
      ),
    });

    return inputObjects.map(({key, inputField}) => (
      <React.Fragment key={key}>
        {inputField}
        {formErrors.hasOwnProperty(key) ? (
          <Typography variant="subtitle2" className={classes.red}>
            {formErrors[key]}
          </Typography>
        ) : null}
      </React.Fragment>
    ));
  };

  renderMetadata = () => {
    // Render the current metadata (if any)
    const {classes} = this.props;
    const {fieldMetadata} = this.state;
    const hasFieldMetadata =
      fieldMetadata &&
      (fieldMetadata.desc || fieldMetadata.action) &&
      ConfigBaseTypes.includes(fieldMetadata.type);

    return (
      <Collapse in={Boolean(hasFieldMetadata)}>
        <Paper className={classes.metadataPaper} elevation={1}>
          {hasFieldMetadata ? (
            <ConfigMetadataBlock metadata={fieldMetadata} />
          ) : null}
        </Paper>
      </Collapse>
    );
  };

  render() {
    const {classes, isOpen, onClose} = this.props;

    return (
      <MaterialModal
        open={isOpen}
        onClose={onClose}
        onEnter={this.handleEnter}
        modalTitle="Add New Field"
        modalContent={
          <>
            {this.renderForm()}
            {this.renderMetadata()}
            {this.renderAutocompleteResults()}
          </>
        }
        modalActions={
          <>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={onClose}>
              Cancel
            </Button>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={this.handleSubmit}>
              Add Field
            </Button>
          </>
        }
      />
    );
  }
}

export default withStyles(styles)(ModalConfigAddField);
