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
import {DATA_TYPE_TO_INPUT_TYPE} from '../../constants/ConfigConstants';
import {getTopLayerValue} from '../../helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

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
  configField?: string,
  label?: string,
  onChange?: (string | number | boolean) => void,
  type?: $Keys<typeof DATA_TYPE_TO_INPUT_TYPE>,
  selectBoolean?: boolean,
  initialValue?: ?string | number | boolean,
|};

export default function ConfigTaskInput(props: Props) {
  const {configField, label, onChange, type, initialValue} = props;
  const selectBoolean = props.selectBoolean || false;
  const classes = useStyles();
  const {
    configData,
    configMetadata,
    onUpdate,
    selectedValues,
  } = useConfigTaskContext();
  const {refreshConfig} = selectedValues;

  const onUpdateRef = React.useRef(onUpdate);

  const metadata = configField?.split('.').reduce((result, key) => {
    if (result?.type == 'OBJECT') {
      return result?.objVal?.properties[key];
    } else if (result?.type == 'MAP') {
      return result?.mapVal?.objVal?.properties[key] ?? {};
    } else {
      return result ? result[key] : result;
    }
  }, configMetadata);

  const initialVal = React.useMemo(() => {
    if (initialValue != null) {
      return initialValue;
    }

    const layers = configData.find(
      config => config.field.join('.') === configField,
    )?.layers;

    return getTopLayerValue({layers}) ?? '';
  }, [configData, configField, initialValue]);

  const [draftValue, setDraftValue] = React.useState(initialVal);

  React.useEffect(() => {
    if (initialVal != null) {
      setDraftValue(initialVal);
    }
  }, [initialVal, refreshConfig]);

  React.useEffect(() => {
    if (initialValue != null) {
      setDraftValue(initialValue);
    }
  }, [initialValue]);

  let settingType =
    metadata && metadata?.type
      ? DATA_TYPE_TO_INPUT_TYPE[metadata?.type]
      : 'text';

  if (type) {
    settingType = DATA_TYPE_TO_INPUT_TYPE[type];
  }

  const {strVal, allowedValues} = metadata || {};

  const selectList =
    strVal?.allowedValues || allowedValues
      ? strVal?.allowedValues || allowedValues
      : null;

  const handleInputChange = React.useCallback(
    e => {
      let tempDraftValue = e.target.value;
      if (settingType === DATA_TYPE_TO_INPUT_TYPE.BOOLEAN && !selectBoolean) {
        tempDraftValue = e.target.checked;
      } else if (settingType === DATA_TYPE_TO_INPUT_TYPE.INTEGER) {
        tempDraftValue = Number(e.target.value);
      }
      if (onChange) {
        onChange(tempDraftValue);
      } else if (configField != null) {
        onUpdateRef.current({configField, draftValue: tempDraftValue});
      }
      setDraftValue(tempDraftValue);
    },
    [settingType, selectBoolean, configField, onChange],
  );

  const inputLabel = (
    <Grid className={classes.inputLabel} item container spacing={1}>
      <Grid className={classes.label} item xs={12}>
        {label}
      </Grid>
      <Grid item xs={12}>
        {metadata?.desc}
      </Grid>
    </Grid>
  );

  return (
    <Grid item>
      {settingType === DATA_TYPE_TO_INPUT_TYPE.BOOLEAN ? (
        !selectBoolean ? (
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
              label={label || ''}
            />
          </>
        ) : (
          <>
            {label != null && <FormLabel>{inputLabel}</FormLabel>}
            <TextField
              data-testid="select"
              select
              value={draftValue}
              InputLabelProps={{shrink: true}}
              fullWidth
              onChange={handleInputChange}>
              {[true, false].map(select => (
                <MenuItem key={String(select)} value={select}>
                  {String(select)}
                </MenuItem>
              ))}
            </TextField>
          </>
        )
      ) : selectList ? (
        <>
          {label != null && <FormLabel>{inputLabel}</FormLabel>}
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
          {label != null && <FormLabel>{inputLabel}</FormLabel>}
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
