/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AssetTestResultDetails from '../../../views/network_test/AssetTestResultDetails';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '../../common/LoadingBox';
import NetworkContext from '../../../contexts/NetworkContext';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import useUnmount from '../../../hooks/useUnmount';
import {EXECUTION_STATUS} from '../../../constants/ScheduleConstants';
import {currentDefaultRouteRequest} from '../../../apiutils/DefaultRouteHistoryAPIUtil';
import {isTestRunning} from '../../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {mapDefaultRoutes} from '../../../helpers/DefaultRouteHelpers';
import {numToMegabits} from '../../../helpers/ScheduleHelpers';
import {useRouteContext} from '../../../contexts/RouteContext';

import type {AssetTestResultType} from '../../../views/network_test/NetworkTestTypes';
import type {ExecutionDetailsType} from '../../../../shared/dto/NetworkTestTypes';

export type Props = {
  executionResult: AssetTestResultType,
  execution: ExecutionDetailsType,
};

const useStyles = makeStyles(theme => ({
  actions: {
    marginTop: theme.spacing(2),
  },
  resultDivider: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2),
  },
}));
export default function ThroughputTestResult(props: Props) {
  const classes = useStyles();
  const {executionResult, execution} = props;
  const routes = useRouteContext();
  const {networkName, networkConfig} = React.useContext(NetworkContext);
  const [defaultRoute, setDefaultRoute] = React.useState(null);
  const {assetName} = executionResult ?? {assetName: null};
  const {topology} = networkConfig;
  const routesRef = React.useRef(routes);

  React.useEffect(() => {
    if (!assetName) {
      return;
    }
    const getDefaultRoute = async () => {
      const currentDefaultRoute = await currentDefaultRouteRequest({
        networkName,
        selectedNode: assetName,
      });
      setDefaultRoute(currentDefaultRoute);
    };
    getDefaultRoute();
  }, [assetName, networkName]);

  React.useEffect(() => {
    if (defaultRoute) {
      const {links, nodes} = mapDefaultRoutes({
        mapRoutes: defaultRoute,
        topology: topology,
      });
      routesRef.current.onUpdateRoutes({
        node: assetName,
        links,
        nodes,
      });
    }
  }, [defaultRoute, assetName, topology, routesRef]);

  useUnmount(() => routes.resetRoutes());

  return (
    <Grid container spacing={2}>
      {isTestRunning(execution.status) && (
        <Grid container direction="column" item justify="center">
          <Grid item>Running Test</Grid>
          <Grid item>
            <LoadingBox fullScreen={false} />
          </Grid>
        </Grid>
      )}
      {EXECUTION_STATUS[execution.status] === EXECUTION_STATUS.FAILED && (
        <Grid container direction="column" item justify="center">
          <Grid item>Throughput Test Failed</Grid>
        </Grid>
      )}
      {!isTestRunning(execution.status) &&
        executionResult &&
        EXECUTION_STATUS[execution.status] !== EXECUTION_STATUS.FAILED && (
          <Grid container direction="column" item spacing={1}>
            <Grid item>
              <ResultSummary
                direction="Download"
                result={executionResult.results[1].iperf_max_throughput}
              />
            </Grid>
            <Grid item>
              <ResultSummary
                direction="Upload"
                result={executionResult.results[0].iperf_max_throughput}
              />
            </Grid>
            <Divider className={classes.resultDivider} />
            <AssetTestResultDetails results={executionResult.results} />{' '}
          </Grid>
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
  result: ?number,
}) {
  const classes = useResultStyles();
  return (
    <Grid item container direction="column">
      <Grid container item>
        <Typography
          variant="body1"
          color="textSecondary"
          className={classes.direction}>
          {direction}
        </Typography>
      </Grid>
      <Grid container item>
        <Grid item>
          <Typography variant="body1" className={classes.throughput}>
            {numToMegabits(result || 0)}
            Mbps
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}
