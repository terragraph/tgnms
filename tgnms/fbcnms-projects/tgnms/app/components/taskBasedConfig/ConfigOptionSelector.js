/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Box from '@material-ui/core/Box';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Grid from '@material-ui/core/Grid';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {getDefaultSelected} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
  title: {
    color: 'black',
    fontSize: theme.typography.fontSize,
  },
}));

export type ConfigOption = {
  name: string,
  description?: string,
  configGroup?: React.Node,
  setConfigs?: Array<{configField: string, set?: string}>,
};

export default function ConfigOptionSelector({
  options,
  title,
}: {
  options: {[string]: ConfigOption},
  title?: string,
}) {
  const {configOverrides, onUpdate} = useConfigTaskContext();
  const classes = useStyles();

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

  const optionName = option.name;
  const optionRef = useLiveRef(option);
  const firstUpdate = React.useRef(true);

  React.useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    optionRef.current.setConfigs?.forEach(setConfig => {
      if (setConfig.set) {
        onUpdate({
          configField: setConfig.configField,
          draftValue: setConfig.set,
        });
      }
    });
  }, [optionName, optionRef, onUpdate, firstUpdate]);

  React.useEffect(
    () =>
      setFormState({
        optionKey: selectedOptionKey,
      }),
    [selectedOptionKey, setFormState],
  );

  return option ? (
    <Grid item container direction="column" spacing={1}>
      <Grid item className={classes.title}>
        {title}
      </Grid>
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
          {option.description && (
            <Box mb={2}>
              <FormHelperText>{option.description}</FormHelperText>
            </Box>
          )}
        </FormControl>
      </Grid>
      <Grid item container direction="column" spacing={3}>
        {option.configGroup}
      </Grid>
    </Grid>
  ) : (
    <Grid item />
  );
}
