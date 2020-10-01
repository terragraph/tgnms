/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import InputAdornment from '@material-ui/core/InputAdornment';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import {DATATYPE, Validators} from '../../../shared/dto/Settings';
import {FEATURE_FLAGS} from '../../../shared/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useSecretToggle} from './useSecretToggle';
import {useSettingsFormContext} from './SettingsFormContext';

const dataTypeToInputType = {
  INT: 'number',
  STRING: 'text',
  SECRET_STRING: 'text',
  STRING_ARRAY: 'text',
  BOOL: 'checkbox',
};
const useStyles = makeStyles(theme => ({
  configKey: {
    color: theme.palette.text.secondary,
    transform: `translate(0, -20px) scale(0.75)`,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  overrideText: {
    color: theme.palette.warning.dark,
  },
}));
export type Props = {|
  setting: string,
  label: string,
  isFeatureToggle?: boolean,
|};
export default function SettingInput({setting, label, isFeatureToggle}: Props) {
  const classes = useStyles();
  const settingsForm = useSettingsFormContext();
  const {config, value, onChange} = settingsForm.getInput(setting);
  const [errorText, setErrorText] = React.useState<?string>();
  const validate = React.useCallback(
    (val: ?string) => {
      let validators: Array<(v: ?string) => boolean> = [];
      if (config?.required) {
        validators.push(Validators.required);
      }
      if (config?.validations) {
        validators = validators.concat(
          (config?.validations ?? []).map(key => Validators[key]),
        );
      }
      if (validators.length < 1) {
        return true;
      }
      try {
        for (const validator of validators) {
          const result = validator(val);
          if (result !== true) {
            setErrorText('Invalid setting');
            return false;
          }
        }
      } catch (err) {
        setErrorText(err?.message ?? 'Invalid setting');
        return false;
      }
      setErrorText(null);
      return true;
    },
    [config, setErrorText],
  );
  const hasError = React.useMemo<boolean>(() => !validate(value), [
    validate,
    value,
  ]);

  const {isHidden, isSecret, isSecretVisible, toggleSecret} = useSecretToggle(
    config?.dataType || DATATYPE.STRING,
  );

  const settingType = config ? dataTypeToInputType[config.dataType] : 'text';

  const isDefaultEnabled =
    isFeatureToggle == true &&
    (FEATURE_FLAGS[setting]?.isDefaultEnabled ?? false);
  return (
    <Grid item>
      {config && settingType === 'checkbox' && (
        <FormControlLabel
          control={React.createElement(
            isFeatureToggle === true ? Switch : Checkbox,
            {
              checked:
                typeof value !== 'undefined' && value !== ''
                  ? value === 'true'
                  : isDefaultEnabled,
              onChange: e => {
                onChange(e.target.checked ? 'true' : 'false');
              },
              value: value || '',
              color: 'primary',
            },
          )}
          label={label}
        />
      )}
      {config && settingType !== 'checkbox' && (
        <TextField
          id={config?.key}
          name={config?.key}
          error={hasError}
          helperText={errorText}
          label={label}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          fullWidth
          type={isHidden ? 'password' : 'text'}
          InputLabelProps={{
            shrink: true,
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <span className={classes.configKey}>{config?.key}</span>
                {isSecret && (
                  <Button
                    aria-label="toggle secret visibility"
                    onClick={toggleSecret}
                    size="small">
                    {isSecretVisible ? 'Hide' : 'Show'}
                  </Button>
                )}
              </InputAdornment>
            ),
          }}
        />
      )}
    </Grid>
  );
}
