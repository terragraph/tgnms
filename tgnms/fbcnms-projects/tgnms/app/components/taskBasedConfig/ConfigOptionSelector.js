/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {getDefaultSelected} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

export type ConfigOption = {
  name: string,
  description?: string,
  configGroup?: React.Node,
  setConfigs?: Array<{configField: string, set?: string}>,
};

export default function ConfigOptionSelector({
  options,
}: {
  options: {[string]: ConfigOption},
}) {
  const {configOverrides, onUpdate, selectedValues} = useConfigTaskContext();
  const {refreshConfig} = selectedValues;

  const selectedOptionKey = React.useMemo(
    () => getDefaultSelected({options, configData: configOverrides}),
    [options, configOverrides],
  );

  const {formState, handleInputChange, setFormState} = useForm({
    initialState: {
      optionKey: selectedOptionKey,
    },
  });

  const option = React.useMemo(() => options[formState.optionKey], [
    formState,
    options,
  ]);

  React.useEffect(() => {
    if (option) {
      option.setConfigs?.forEach(setConfig => {
        if (setConfig.set) {
          onUpdate({
            configField: setConfig.configField,
            draftValue: setConfig.set,
          });
        }
      });
    }
  }, [onUpdate, option, formState]);

  React.useEffect(
    () =>
      setFormState({
        optionKey: selectedOptionKey,
      }),
    [selectedOptionKey, setFormState, refreshConfig],
  );

  return option ? (
    <Grid item container direction="column" spacing={2}>
      <Grid item>
        <FormControl>
          <RadioGroup
            aria-label="Config Options"
            name="configOptions"
            value={formState.optionKey}
            onChange={handleInputChange(val => ({optionKey: val}))}
            row>
            {Object.keys(options).map(key => {
              const option = options[key];
              return (
                <FormControlLabel
                  value={key}
                  control={<Radio color="primary" />}
                  label={option.name}
                />
              );
            })}
          </RadioGroup>
        </FormControl>
        {option.description && (
          <Typography variant="body2" color="textSecondary">
            {option.description}
          </Typography>
        )}
      </Grid>
      <Grid item container direction="column" spacing={3}>
        {option.configGroup}
      </Grid>
    </Grid>
  ) : (
    <Grid item />
  );
}
