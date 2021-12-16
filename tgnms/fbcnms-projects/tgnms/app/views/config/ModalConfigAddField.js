/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import ConfigMetadataBlock from './ConfigMetadataBlock';
import ConfigTaskInput from '@fbcnms/tg-nms/app/components/taskBasedConfig/ConfigTaskInput';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {
  CONFIG_BASE_TYPES,
  CONFIG_FIELD_DELIMITER,
  DATA_TYPE_TO_INPUT_TYPE,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {cloneDeep} from 'lodash';
import {difference, isPlainObject} from 'lodash';
import {
  getFieldMetadata,
  validateField,
} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {toTitleCase} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
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
  valueWrapper: {
    marginTop: theme.spacing(),
  },
}));

type Props = {
  isOpen: boolean,
  onClose: () => any,
};

export default function ModalConfigAddField(props: Props) {
  const {isOpen, onClose} = props;
  const classes = useStyles();

  const [fieldName, setFieldName] = React.useState('');
  const [type, setType] = React.useState('STRING');
  const [value, setValue] = React.useState('');
  const [fieldMetadata, setFieldMetadata] = React.useState(null);
  const [formErrors, setFormErrors] = React.useState({});
  const [fieldAutocomplete, setFieldAutocomplete] = React.useState([]);

  const {configData, configMetadata, onUpdate} = useConfigTaskContext();

  const menuAnchorEl = React.useRef<?HTMLElement>(null);

  const getField = React.useCallback(fieldName => {
    // Get the field (i.e. key array) for the given field name
    const trimmedName = fieldName.trim();
    return trimmedName === '' ? [] : trimmedName.split(CONFIG_FIELD_DELIMITER);
  }, []);

  const getAutocompleteResults = React.useCallback(
    field => {
      // Get autocomplete results for the given field
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
        CONFIG_BASE_TYPES.includes(metadata.type)
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
      const results = objectEntriesTypesafe<string, any>(metadata)
        .filter(([k, v]) => {
          const key = k.toLowerCase();
          return isPlainObject(v) && key.startsWith(query) && key !== query;
        })
        .map(([k, v]) => ({
          key: k,
          isBaseType:
            v.hasOwnProperty('desc') &&
            v.hasOwnProperty('type') &&
            CONFIG_BASE_TYPES.includes(v.type),
        }));
      return results;
    },
    [configMetadata],
  );

  const updateAutocompleteResults = React.useCallback(
    (newFieldName: string) => {
      // Update field autocomplete results
      const field = getField(newFieldName);

      // Update autocomplete results
      const newFieldAutocomplete = getAutocompleteResults(field);
      setFieldAutocomplete(newFieldAutocomplete);
    },
    [getField, getAutocompleteResults],
  );

  const clearFormErrors = React.useCallback(
    key => {
      // Clear the form error (if any)
      if (formErrors.hasOwnProperty(key)) {
        const newFormErrors = cloneDeep(formErrors);
        delete newFormErrors[key];
        setFormErrors(newFormErrors);
      }
    },
    [formErrors],
  );

  const getDefaultMetadata = () => {
    // Get the field metadata, or a reasonable default
    // Fill in the 'type' property if missing
    return fieldMetadata
      ? fieldMetadata.hasOwnProperty('type')
        ? fieldMetadata
        : {...fieldMetadata, type}
      : {type};
  };

  const updateMetadataAutoFill = React.useCallback(
    (newFieldName: string) => {
      const field = getField(newFieldName);
      const newFieldMetadata = getFieldMetadata(configMetadata, field);
      if (
        newFieldMetadata &&
        newFieldMetadata.type !== type &&
        CONFIG_BASE_TYPES.includes(newFieldMetadata.type)
      ) {
        setType(newFieldMetadata.type);
        setValue('');
      }

      setFieldMetadata(newFieldMetadata);
      updateAutocompleteResults(newFieldName);
      clearFormErrors('fieldName');
    },
    [
      type,
      clearFormErrors,
      configMetadata,
      updateAutocompleteResults,
      getField,
    ],
  );

  const handleAutocompleteClick = (key, isBaseType) => {
    // Handle clicking on an autocomplete result
    // Replace the last token in the current field
    // If this is NOT a base type, append a trailing delimiter
    const field = getField(fieldName);
    if (field.length === 0) {
      field.push(key);
    } else {
      field[field.length - 1] = key;
    }
    if (!isBaseType) {
      field.push('');
    }
    const newFieldName = field.join(CONFIG_FIELD_DELIMITER);
    setFieldName(newFieldName);
    updateMetadataAutoFill(newFieldName);
  };

  const handleFieldNameChange = e => {
    const newfieldName = e.target.value;
    menuAnchorEl.current = e.target;
    // Handle a field name change
    // Update metadata and type (if possible)
    setFieldName(newfieldName);
    updateMetadataAutoFill(newfieldName);
  };

  const handleTypeChange = e => {
    const newType = e.target.value;
    // Handle a type change
    setValue('');
    setType(newType);
    clearFormErrors('type');
  };

  const handleValueChange = newValue => {
    // Handle a value change
    setValue(newValue);
    clearFormErrors('value');
  };

  const handleSubmit = () => {
    // Submit the new field
    const fieldValue = value;
    const field = getField(fieldName);

    // Validate form inputs
    const errors = {};
    if (fieldName.trim() === '') {
      errors['fieldName'] = 'Please enter a field.';
    } else if (fieldMetadata && fieldMetadata.deprecated) {
      errors['fieldName'] = 'That field is deprecated.';
    } else {
      // Check if the current field is a sub-array of an existing field
      const superfield = configData?.find(
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
        const subfield = configData?.find(
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
    if (!validateField(fieldValue, getDefaultMetadata())) {
      errors['value'] = 'That value is invalid.';
    }

    // Set error (if any)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Submit the value
    onUpdate({configField: field.join('.'), draftValue: fieldValue});
    onClose();
  };

  const inputType = Object.keys(DATA_TYPE_TO_INPUT_TYPE).find(
    key => key === type.toUpperCase(),
  );
  // Render the form inputs
  const inputObjects = [
    {
      key: 'fieldName',
      inputField: (
        <TextField
          label="Field"
          id={`field-${fieldName}`}
          data-testid="field-name"
          InputLabelProps={{shrink: true}}
          margin="dense"
          value={fieldName}
          fullWidth
          onChange={handleFieldNameChange}
        />
      ),
    },
    {
      key: 'type',
      inputField: (
        <TextField
          label="Type"
          select
          id={`type-${fieldName}`}
          InputLabelProps={{shrink: true}}
          margin="dense"
          value={type}
          disabled={Boolean(
            fieldMetadata && CONFIG_BASE_TYPES.includes(fieldMetadata.type),
          )}
          fullWidth
          onChange={handleTypeChange}>
          {CONFIG_BASE_TYPES.map(type => (
            <MenuItem key={type} value={type}>
              {toTitleCase(type)}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      key: 'value',
      inputField: (
        <div className={classes.valueWrapper}>
          <ConfigTaskInput
            label="Value"
            type={inputType}
            onChange={handleValueChange}
            selectBoolean={true}
          />
        </div>
      ),
    },
  ];

  const showAutocomplete = isOpen && fieldAutocomplete.length > 0;

  const hasFieldMetadata =
    fieldMetadata &&
    (fieldMetadata.desc || fieldMetadata.action) &&
    CONFIG_BASE_TYPES.includes(fieldMetadata.type);

  return (
    <MaterialModal
      open={isOpen}
      onClose={onClose}
      modalTitle="Add New Field"
      modalContent={
        <>
          {inputObjects.map(({key, inputField}) => (
            <React.Fragment key={key}>
              {inputField}
              {formErrors.hasOwnProperty(key) ? (
                <Typography variant="subtitle2" className={classes.red}>
                  {formErrors[key]}
                </Typography>
              ) : null}
            </React.Fragment>
          ))}
          {
            <Collapse in={Boolean(hasFieldMetadata)}>
              <Paper className={classes.metadataPaper} elevation={1}>
                {hasFieldMetadata && fieldMetadata ? (
                  <ConfigMetadataBlock metadata={fieldMetadata} />
                ) : null}
              </Paper>
            </Collapse>
          }
          <Popper
            className={classes.autocompletePopper}
            open={showAutocomplete}
            anchorEl={menuAnchorEl.current}
            keepMounted
            transition>
            {({TransitionProps}) => (
              <Collapse {...TransitionProps} timeout={80}>
                <Paper
                  className={classes.autocompletePaper}
                  square
                  style={{
                    width: menuAnchorEl.current
                      ? menuAnchorEl.current.clientWidth
                      : null,
                  }}>
                  <List component="nav">
                    {fieldAutocomplete.map(({key, isBaseType}) => (
                      <ListItem
                        key={key}
                        button
                        dense
                        /* can't use onClick because of onBlur */
                        onMouseDown={() =>
                          handleAutocompleteClick(key, isBaseType)
                        }>
                        <ListItemText primary={key} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Collapse>
            )}
          </Popper>
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
            onClick={handleSubmit}>
            Add Field
          </Button>
        </>
      }
    />
  );
}
