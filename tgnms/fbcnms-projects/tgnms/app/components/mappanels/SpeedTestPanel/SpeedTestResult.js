/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as StringHelpers from '../../../helpers/StringHelpers';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '../../common/LoadingBox';
import NetworkContext from '../../../NetworkContext';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {Link} from 'react-router-dom';
import {makeStyles} from '@material-ui/styles';
import {makeTestResultLink} from '../../../helpers/NetworkTestHelpers';
import {useLoadTestExecution} from '../../../hooks/NetworkTestHooks';
import {useNetworkRoutes} from '../../../hooks/MapHooks';
import type {TestResult} from '../../../../shared/dto/TestResult';

const MEGABITS = Math.pow(1000, 2);

export type Props = {
  testId: string,
};

const useStyles = makeStyles(theme => ({
  actions: {
    marginTop: theme.spacing(2),
  },
}));
export default function SpeedTestResult(props: Props) {
  const classes = useStyles();
  const {networkName} = React.useContext(NetworkContext);
  const {loading, execution} = useLoadTestExecution({testId: props.testId});
  const nodes =
    execution &&
    execution.test_results &&
    execution.test_results.map(x => x.origin_node);
  useNetworkRoutes({nodes: nodes || [], useNearestPop: false});

  return (
    <Grid container spacing={16}>
      {loading && (
        <Grid container item justify="center">
          <LoadingBox fullScreen={false} />
        </Grid>
      )}
      {!loading && execution && execution.test_results && (
        <>
          <Grid container item spacing={8}>
            <Grid item xs={6}>
              <ResultSummary
                direction="Download"
                result={execution.test_results[1]}
              />
            </Grid>
            <Grid item xs={6}>
              <ResultSummary
                direction="Upload"
                result={execution.test_results[0]}
              />
            </Grid>
          </Grid>
          <Grid item container justify="center" className={classes.actions}>
            <Button
              component={Link}
              variant="contained"
              to={makeTestResultLink({
                networkName,
                executionId: execution.id,
                linkName: execution.test_results[0].link_name,
              })}>
              View Full Results
            </Button>
          </Grid>
        </>
      )}
    </Grid>
  );
}

const useResultStyles = makeStyles(theme => ({
  direction: {
    marginBottom: theme.spacing(),
  },
  throughput: {
    fontWeight: 'bold',
  },
}));
function ResultSummary({
  direction,
  result,
}: {
  direction: string,
  result: TestResult,
}) {
  const classes = useResultStyles();
  return (
    <Grid item container direction="column">
      <Grid container item justify="center">
        <Typography
          variant="body1"
          color="textSecondary"
          className={classes.direction}>
          {direction}
        </Typography>
      </Grid>
      <Grid container item justify="center">
        <Grid item>
          <Typography variant="body1" className={classes.throughput}>
            {StringHelpers.formatNumber(
              result.iperf_throughput_max / MEGABITS,
              2,
            )}
            mbps
          </Typography>
        </Grid>
      </Grid>
      <Grid container item spacing={8} justify="center" alignItems="center">
        <Grid item>
          <Typography variant="body2" color="textSecondary">
            {typeof result.ping_avg_latency === 'number'
              ? `${result.ping_avg_latency}ms ping`
              : 'unknown'}
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}
