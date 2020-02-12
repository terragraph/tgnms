/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */
import Grid from '@material-ui/core/Grid';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

import type {AlertViewerProps} from '@fbcnms/alarms/components/rules/RuleInterface';

const useStyles = makeStyles({
  jsonText: {
    wordBreak: 'break-word',
  },
});

export default function EventAlertViewer({alert}: AlertViewerProps) {
  const classes = useStyles();
  const {alertname, id: _, severity, entity, network} = alert.labels || {};
  const {description, eventId, events} = alert.annotations || {};
  return (
    <Grid>
      <Typography>{alertname}</Typography>
      <Typography>{severity}</Typography>
      <Typography>{entity}</Typography>
      <Typography>{network}</Typography>
      <Typography>{description}</Typography>
      <Typography>{eventId}</Typography>
      <Typography className={classes.jsonText}>{events}</Typography>
    </Grid>
  );
}
