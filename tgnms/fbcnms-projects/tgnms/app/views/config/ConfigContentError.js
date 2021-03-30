/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Grid from '@material-ui/core/Grid';
import React from 'react';
import WarningIcon from '@material-ui/icons/Warning';
import {CONFIG_PARAM_MODE} from '../../constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing(2),
  },
  errorIcon: {
    marginRight: theme.spacing(),
    color: 'red',
  },
}));

export default function ConfigContentError() {
  const {configParams, editMode} = useConfigTaskContext();
  const {baseConfigs} = configParams;
  const classes = useStyles();

  return (
    <div className={classes.root} data-testid={'error'}>
      <Grid cols={1}>
        <Grid item className={classes.container}>
          <WarningIcon className={classes.errorIcon} />
          {baseConfigs === null
            ? 'There was an error when loading the base config. Try reloading the page or selecting a different network.'
            : `Error when loading ${CONFIG_PARAM_MODE[editMode]}. This configuration data is unreachable.`}
        </Grid>
      </Grid>
    </div>
  );
}
