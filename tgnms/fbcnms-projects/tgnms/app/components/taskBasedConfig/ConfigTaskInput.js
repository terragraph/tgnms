/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

const dataTypeToInputType = {
  INTEGER: 'number',
  STRING: 'text',
  BOOLEAN: 'checkbox',
};

const useStyles = makeStyles(theme => ({
  inputLabel: {
    marginRight: '-15vw',
    paddingBottom: theme.spacing(),
    fontSize: theme.typography.fontSize,
  },
  label: {
    color: 'black',
  },
}));

export type Props = {|
  configField: string,
  label: string,
|};

export default function ConfigTaskInput({configField, label}: Props) {
  const classes = useStyles();
  const {configData, configMetadata, onUpdate} = useConfigTaskContext();
  const onUpdateRef = React.useRef(onUpdate);

  const metadata = configField.split('.').reduce((result, key) => {
    if (result?.type == 'OBJECT') {
      return result?.objVal?.properties[key];
    } else if (result?.type == 'MAP') {
      return result?.mapVal?.objVal?.properties[key] ?? {};
    } else {
      return result ? result[key] : result;
    }
  }, configMetadata);

  const initialValue =
    configData
      ?.find(config => config.field.join('.') === configField)
      ?.layers.slice(-1)
      .pop().value || '';

  const [draftValue, setDraftValue] = React.useState(initialValue);

  React.useEffect(() => {
    setDraftValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    if (draftValue !== '') {
      onUpdateRef.current({configField, draftValue});
    }
  }, [draftValue, configField, onUpdateRef]);

  const settingType =
    metadata && metadata?.type ? dataTypeToInputType[metadata?.type] : 'text';

  const {strVal, allowedValues} = metadata || {};

  const selectList =
    strVal?.allowedValues || allowedValues
      ? strVal?.allowedValues || allowedValues
      : null;

  const handleInputChange = React.useCallback(
    e => {
      if (settingType === dataTypeToInputType.BOOLEAN) {
        return setDraftValue(e.target.checked);
      } else if (settingType === dataTypeToInputType.INTEGER) {
        return setDraftValue(Number(e.target.value));
      }
      setDraftValue(e.target.value);
    },
    [settingType],
  );

  const inputLabel = (
    <Grid className={classes.inputLabel} item container spacing={1}>
      <Grid className={classes.label} item xs={12}>
        {label}:
      </Grid>
      <Grid item xs={12}>
        {metadata?.desc}
      </Grid>
    </Grid>
  );

  return (
    <Grid item>
      {settingType === dataTypeToInputType.BOOLEAN ? (
        <>
          <FormLabel>
            <Grid className={classes.inputLabel} item container spacing={1}>
              <Grid item xs={12}>
                {metadata?.desc}
              </Grid>
            </Grid>
          </FormLabel>
          <FormControlLabel
            data-testid="checkbox"
            control={React.createElement(Checkbox, {
              checked: draftValue === true,
              onChange: handleInputChange,
              value: String(draftValue) || '',
              color: 'primary',
            })}
            label={label}
          />
        </>
      ) : selectList ? (
        <>
          <FormLabel>{inputLabel}</FormLabel>
          <TextField
            data-testid="select"
            select
            value={draftValue || ''}
            InputLabelProps={{shrink: true}}
            fullWidth
            onChange={handleInputChange}>
            {selectList.map(select => (
              <MenuItem key={select} value={select}>
                {select}
              </MenuItem>
            ))}
          </TextField>
        </>
      ) : (
        <>
          <FormLabel>{inputLabel}</FormLabel>
          <TextField
            data-testid={settingType}
            value={draftValue || ''}
            onChange={handleInputChange}
            fullWidth
            type={settingType}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </>
      )}
    </Grid>
  );
}
