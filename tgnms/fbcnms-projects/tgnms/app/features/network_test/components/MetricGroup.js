/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as StringHelpers from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

import type {MetricType} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestTypes';

const useMetricStyles = makeStyles(theme => ({
  metric: {
    marginBottom: theme.spacing(),
  },
  header: {
    width: '100%',
    textTransform: 'capitalize',
  },
  label: {
    paddingLeft: theme.spacing(),
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
}));

export default function MetricGroup({
  header,
  metrics,
  groupUnits = '',
  format,
  toolTip,
}: {
  header: string,
  metrics: Array<MetricType>,
  groupUnits?: string,
  format?: number => string,
  toolTip?: React.Node,
}) {
  const classes = useMetricStyles();
  return (
    <>
      <Grid className={classes.metric} container item spacing={0} key={header}>
        <Typography className={classes.header} variant="subtitle2" gutterBottom>
          {header} {toolTip || null}
        </Typography>
        {metrics.map(({val, label, metricUnit}) => {
          const unit = metricUnit || groupUnits;
          return (
            <Grid item container key={label}>
              <Grid item xs={6}>
                <Typography className={classes.label} variant="body2">
                  {label}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  {renderVal(val, format)} {unit !== '' ? unit : null}
                </Typography>
              </Grid>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}

function renderVal(
  val: number | string | boolean | null,
  format: ?(number) => string,
) {
  if (typeof val === 'boolean') {
    return val.toString();
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'number') {
    return format ? format(val) : StringHelpers.formatNumber(val, 2);
  }
  return 'N/A';
}
