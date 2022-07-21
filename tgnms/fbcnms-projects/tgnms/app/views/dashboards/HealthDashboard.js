/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import InfoIcon from '@material-ui/icons/Info';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(5),
  },
  title: {
    fontSize: theme.spacing(3),
  },
  subtext: {
    color: '#959595',
  },
  infoIcon: {
    paddingLeft: theme.spacing(1),
    color: '#E0E0E0',
  },
}));

export default function HealthDashboard() {
  const classes = useStyles();
  return (
    <>
      <Grid container className={classes.container}>
        <Grid item xs={12}>
          <Typography variant="h6" className={classes.title}>
            Network Health
            <Tooltip
              className={classes.infoIcon}
              title={'TODO'}
              placement="top">
              <InfoIcon fontSize="small" />
            </Tooltip>
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" className={classes.subtext}>
            Percentage of networks that are healthy
          </Typography>
        </Grid>
        <Grid item xs={12}>
          TODO
        </Grid>
      </Grid>
      <Grid container className={classes.container}>
        <Grid item xs={12}>
          <Typography variant="h6" className={classes.title}>
            Network Summary
          </Typography>
        </Grid>
        <Grid item xs={12}>
          TODO
        </Grid>
      </Grid>
    </>
  );
}
