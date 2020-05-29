/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LinkTestResult from './LinkTestResult';
import LoadingBox from '../../common/LoadingBox';
import NetworkContext from '../../../contexts/NetworkContext';
import NetworkTestResults from '../../../views/network_test/NetworkTestResults';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import React, {useMemo} from 'react';
import Typography from '@material-ui/core/Typography';
import {
  EXECUTION_STATUS,
  NETWORK_TEST_TYPES,
} from '../../../constants/ScheduleConstants';
import {TopologyElementType} from '../../../constants/NetworkConstants.js';
import {
  createTestMapLink,
  getExecutionStatus,
} from '../../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {useLoadTestExecutionResults} from '../../../hooks/NetworkTestHooks';

import type {Element} from '../../../contexts/NetworkContext';
import type {LinkTestResultType} from '../../../views/network_test/NetworkTestTypes';

type Props = {
  testId: string,
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

export default function TestExecutionSummary(props: Props) {
  const {testId} = props;
  const classes = useSummaryStyles();
  const {selectedElement} = React.useContext(NetworkContext);
  const {loading, execution, results} = useLoadTestExecutionResults({testId});
  const {updateNetworkMapOptions} = React.useContext(NmsOptionsContext);
  const {networkName} = React.useContext(NetworkContext);

  const createTestUrl = React.useCallback(
    ({executionId}) => {
      const url = new URL(
        createTestMapLink({
          executionId,
          networkName,
        }),
        window.location.origin,
      );
      url.search = window.location.search;
      if (executionId) {
        url.searchParams.set('test', executionId);
        url.searchParams.set('mapMode', 'NETWORK_TEST');
      }
      // can't use an absolute url in react-router
      return `${url.pathname}${url.search}`;
    },
    [networkName],
  );

  const mapTestResults = useMemo(() => {
    const finalResults = {health: {}, mcs_avg: {}, iperf_avg_throughput: {}};
    results &&
      results.forEach(res => {
        Object.keys(finalResults).forEach((link_overlay: string) => {
          const linkData = finalResults[link_overlay][res?.asset_name];
          if (linkData) {
            linkData['Z'] = {[link_overlay]: res[link_overlay]};
          } else {
            finalResults[link_overlay][res.asset_name] = {
              A: {[link_overlay]: res[link_overlay]},
            };
          }
        });
      });
    return finalResults;
  }, [results]);

  const executionResults: Array<LinkTestResultType> = useMemo(() => {
    if (!results) {
      return [];
    }
    const finalResults: Array<LinkTestResultType> = [];
    results.forEach(result => {
      if (!finalResults.find(final => final.linkName === result.asset_name)) {
        finalResults.push({
          linkName: result.asset_name,
          results: results.filter(res => res.asset_name === result.asset_name),
        });
      }
    });
    return finalResults;
  }, [results]);

  React.useEffect(() => {
    if (!results) {
      return;
    }
    updateNetworkMapOptions({
      testExecutionData: mapTestResults,
    });
  }, [results, mapTestResults, updateNetworkMapOptions]);

  if (loading || !execution) {
    return <LoadingBox fullScreen={false} />;
  }

  const startDate = new Date(execution.start_dt);

  return (
    <Grid container direction="column">
      <Typography className={classes.header} variant="subtitle1">
        results from{' '}
        {startDate.toLocaleString('default', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Typography>
      <Typography
        className={classes.networkTestType}
        variant="body1"
        gutterBottom>
        {NETWORK_TEST_TYPES[execution.test_type.toLowerCase()] ||
          execution.test_type}
      </Typography>
      <Divider className={classes.resultDivider} />
      {selectedElement &&
      isValidLinkSelected(selectedElement, executionResults) ? (
        <LinkTestResult
          linkName={selectedElement.name}
          executionResults={executionResults}
        />
      ) : (
        <>
          <NetworkTestResults
            createTestUrl={createTestUrl}
            executionResults={executionResults}
          />
        </>
      )}
    </Grid>
  );
}

function isValidLinkSelected(
  element: Element,
  executionResults: Array<LinkTestResultType>,
) {
  const result = executionResults.find(
    result => result.linkName === element.name,
  );
  return (
    element.type === TopologyElementType.LINK &&
    result &&
    getExecutionStatus(result) === EXECUTION_STATUS.FINISHED
  );
}
