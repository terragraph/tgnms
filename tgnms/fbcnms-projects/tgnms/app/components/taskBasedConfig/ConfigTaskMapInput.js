/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import ConfigTaskInput from './ConfigTaskInput';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import {DATA_TYPE_TO_INPUT_TYPE} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {getTopLayerValue} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const STRING_MAP_VAL = 'string';

const useStyles = makeStyles(theme => ({
  inputLabel: {
    paddingBottom: theme.spacing(),
    fontSize: theme.typography.fontSize,
  },
  label: {
    color: 'black',
  },
}));

export type Props = {|
  configField: string,
  // In the event the metadata is a different path than the configField.
  metadataField?: string,
  label?: string,
  customKeyLabel?: string,
  buttonText?: string,
  onChange?: ({}) => void,
|};

export default function ConfigTaskMapInput(props: Props) {
  const {
    configField,
    metadataField,
    label,
    buttonText,
    onChange,
    customKeyLabel,
  } = props;
  const classes = useStyles();
  const {configData, configMetadata, onUpdate} = useConfigTaskContext();
  const [configValue, setConfigValue] = React.useState<{
    newKey?: {[string]: mixed} | string,
  }>({});
  const onUpdateRef = React.useRef(onUpdate);

  const configFieldArray = React.useMemo(() => configField.split('.'), [
    configField,
  ]);

  const metadata = (metadataField?.split('.') ?? configFieldArray).reduce(
    (result, key) => (result ? result[key] : result),
    configMetadata,
  );

  const {properties} =
    metadata?.mapVal?.mapVal?.objVal || metadata?.mapVal?.objVal || {};
  const requiredFields =
    properties &&
    Object.keys(properties)
      .filter(propertyKey => properties[propertyKey]?.required)
      .sort();

  const intialFields = React.useMemo(
    () =>
      configData.filter(config => config.field.join('.').includes(configField)),
    [configData, configField],
  );

  React.useEffect(() => {
    const initialValue = intialFields.reduce((result, initialField) => {
      const keyValue = initialField.field[configFieldArray.length];
      const configKey = initialField.field[configFieldArray.length + 1];
      if (!result[keyValue]) {
        result[keyValue] = {};
      }
      if (configKey) {
        result[keyValue][configKey] = getTopLayerValue({
          layers: initialField.layers,
        });
      } else {
        result[keyValue] = getTopLayerValue({
          layers: initialField.layers,
        });
      }
      return result;
    }, {});
    setConfigValue(initialValue);
  }, [intialFields, configFieldArray]);

  const handleInputChange = React.useCallback(
    (change, key, config) => {
      const tempConfig = {...configValue};
      if (config === STRING_MAP_VAL) {
        tempConfig[key] = String(change);
      } else if (config != null && typeof tempConfig[key] === 'object') {
        const configType = properties[config].type;
        let formattedChange = change;
        if (
          DATA_TYPE_TO_INPUT_TYPE[configType] ===
          DATA_TYPE_TO_INPUT_TYPE.INTEGER
        ) {
          formattedChange = Number(change);
        }
        tempConfig[key][config] = formattedChange;
      } else if (typeof change !== 'boolean') {
        tempConfig[change] = tempConfig[key];
        delete tempConfig[key];
      }
      setConfigValue(tempConfig);
      if (onChange) {
        return onChange(tempConfig);
      }
      onUpdateRef.current({configField, draftValue: tempConfig});
    },
    [configValue, configField, onChange, properties],
  );

  const handleAddMapKey = React.useCallback(() => {
    let newKeyValue = '';
    if (requiredFields) {
      newKeyValue = requiredFields.reduce((result, field) => {
        result[field] = '';
        return result;
      }, {});
    }
    const tempConfig = {...configValue};
    tempConfig.newKey = newKeyValue;
    setConfigValue(tempConfig);
  }, [configValue, requiredFields]);

  const handleDelete = React.useCallback(
    (key: string) => {
      const tempConfig = {...configValue};
      delete tempConfig[key];
      setConfigValue(tempConfig);
      if (onChange) {
        return onChange(tempConfig);
      }
      onUpdateRef.current({configField, draftValue: tempConfig});
    },
    [configValue, configField, onChange],
  );

  return (
    <Grid item>
      <Grid item container spacing={4}>
        <Grid item>
          {label != null && (
            <FormLabel>
              <Grid className={classes.inputLabel} item container spacing={1}>
                <Grid className={classes.label} item xs={12}>
                  {label}
                </Grid>
                <Grid item xs={12}>
                  {metadata?.desc}
                </Grid>
              </Grid>
            </FormLabel>
          )}
        </Grid>
        {Object.keys(configValue).map(key => (
          <Grid item container spacing={2}>
            <Grid item xs={2} container>
              <Grid item>
                <ConfigTaskInput
                  onChange={change => handleInputChange(change, key)}
                  label={customKeyLabel ?? 'Key'}
                  initialValue={key}
                />
              </Grid>
              <Grid item>
                <Button
                  type="delete"
                  data-testid="delete-button"
                  onClick={() => handleDelete(key)}>
                  <Grid container spacing={1}>
                    <Grid item>
                      <HighlightOffIcon />
                    </Grid>
                    <Grid item>Delete</Grid>
                  </Grid>
                </Button>
              </Grid>
            </Grid>
            <Grid item xs={10} container direction="column">
              {typeof configValue[key] === 'string' ? (
                <ConfigTaskInput
                  configField={configField + '.' + key}
                  onChange={change =>
                    handleInputChange(change, key, STRING_MAP_VAL)
                  }
                  label={'Value'}
                  initialValue={configValue[key] ? configValue[key] : ''}
                />
              ) : (
                configValue[key] &&
                Object.keys(configValue[key]).map(configKey => (
                  <ConfigTaskInput
                    configField={configField + '.' + configKey}
                    onChange={change =>
                      handleInputChange(change, key, configKey)
                    }
                    label={configKey}
                    initialValue={
                      typeof configValue[key] === 'object'
                        ? String(configValue[key][configKey])
                        : ''
                    }
                  />
                ))
              )}
            </Grid>
          </Grid>
        ))}
      </Grid>
      <Button
        type="submit"
        data-testid="add-button"
        variant="contained"
        color="primary"
        onClick={handleAddMapKey}>
        {buttonText ?? 'New Map Key Value Pair'}
      </Button>
    </Grid>
  );
}
