/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Grid from '@material-ui/core/Grid';
import LoadingBox from '../../common/LoadingBox';
import React from 'react';
import Typography from '@material-ui/core/Typography';

import {makeStyles} from '@material-ui/styles';
import {useLoadScanExecutionResults} from '../../../hooks/ScanServiceHooks';

type Props = {
  scanId: string,
};

const useSummaryStyles = makeStyles(theme => ({
  header: {
    textTransform: 'uppercase',
    marginBottom: theme.spacing(1),
  },
  resultDivider: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2),
  },
  networkTestType: {
    fontStyle: 'italic',
  },
}));

export default function ScanServiceSummary(props: Props) {
  const {scanId} = props;
  const classes = useSummaryStyles();
  const {loading, execution} = useLoadScanExecutionResults({scanId});

  if (loading || !execution) {
    return <LoadingBox fullScreen={false} />;
  }

  return (
    <Grid container direction="column">
      <Typography className={classes.header} variant="subtitle1">
        scan execution {execution.id}
      </Typography>
    </Grid>
  );
}
