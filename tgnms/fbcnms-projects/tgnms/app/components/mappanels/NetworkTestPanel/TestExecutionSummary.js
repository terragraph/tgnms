/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AssetTestResult from './AssetTestResult';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '../../common/LoadingBox';
import NetworkContext from '../../../contexts/NetworkContext';
import NetworkTestResults from '../../../views/network_test/NetworkTestResults';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import React, {useMemo} from 'react';
import ThroughputTestResult from './ThroughputTestResult';
import Typography from '@material-ui/core/Typography';
import {
  EXECUTION_STATUS,
  NETWORK_TEST_DEFS,
} from '../../../constants/ScheduleConstants';
import {HEALTH_CODES} from '../../../constants/HealthConstants';
import {TopologyElementType} from '../../../constants/NetworkConstants.js';
import {getExecutionStatus} from '../../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {useLoadTestExecutionResults} from '../../../hooks/NetworkTestHooks';

import type {AssetTestResultType} from '../../../views/network_test/NetworkTestTypes';
import type {Element} from '../../../contexts/NetworkContext';
import type {ExecutionDetailsType} from '../../../../shared/dto/NetworkTestTypes';

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
    fontWeight: theme.typography.fontWeightMedium,
  },
}));

export default function TestExecutionSummary(props: Props) {
  const {testId} = props;
  const classes = useSummaryStyles();
  const {linkMap, selectedElement} = React.useContext(NetworkContext);
  const {loading, execution, results} = useLoadTestExecutionResults({testId});
  const {updateNetworkMapOptions} = React.useContext(NmsOptionsContext);

  const assetType =
    results && linkMap[results[0].asset_name]
      ? TopologyElementType.LINK
      : TopologyElementType.NODE;

  const mapTestResults = useMemo(() => {
    if (!results) {
      return;
    }

    const finalResults = {health: {}, mcs_avg: {}, iperf_avg_throughput: {}};
    results.forEach(res => {
      Object.keys(finalResults).forEach((link_overlay: string) => {
        const linkData = finalResults[link_overlay][res?.asset_name];
        const value =
          link_overlay === 'health'
            ? HEALTH_CODES[res[link_overlay]]
            : res[link_overlay];
        if (linkData) {
          linkData['Z'] = {[link_overlay]: value};
        } else {
          finalResults[link_overlay][res.asset_name] = {
            A: {[link_overlay]: value},
          };
        }
      });
    });
    return {
      results: finalResults,
      type: assetType,
    };
  }, [results, assetType]);

  const executionResults: Array<AssetTestResultType> = useMemo(() => {
    if (!results) {
      return [];
    }
    const finalResults: Array<AssetTestResultType> = [];
    results.forEach(result => {
      if (!finalResults.find(final => final.assetName === result.asset_name)) {
        finalResults.push({
          assetName: result.asset_name,
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

  const throughputTestMode = isThroughputTestMode(execution);

  if ((loading && !throughputTestMode && !execution) || !execution) {
    return <LoadingBox fullScreen={false} />;
  }

  const startDate = new Date(execution.start_dt);
  const assetTestResultMode =
    selectedElement &&
    isValidAssetSelected(selectedElement, executionResults) &&
    !throughputTestMode;

  return (
    <Grid container direction="column">
      <Typography
        className={classes.networkTestType}
        variant="subtitle1"
        gutterBottom>
        {throughputTestMode
          ? NETWORK_TEST_DEFS.partial.title
          : NETWORK_TEST_DEFS[execution.test_type.toLowerCase()].title ||
            execution.test_type}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Results from{' '}
        {startDate.toLocaleString('default', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Typography>
      <Divider className={classes.resultDivider} />
      {throughputTestMode && (
        <ThroughputTestResult
          executionResult={executionResults[0]}
          execution={execution}
        />
      )}
      {assetTestResultMode && (
        <AssetTestResult
          assetName={selectedElement?.name || ''}
          executionResults={executionResults}
        />
      )}
      {!throughputTestMode && !assetTestResultMode && (
        <NetworkTestResults
          executionResults={executionResults}
          assetType={assetType}
        />
      )}
    </Grid>
  );
}

function isValidAssetSelected(
  element: Element,
  executionResults: Array<AssetTestResultType>,
) {
  const result = executionResults.find(
    result => result.assetName === element.name,
  );
  return result && getExecutionStatus(result) === EXECUTION_STATUS.FINISHED;
}

function isThroughputTestMode(execution: ?ExecutionDetailsType) {
  return execution?.whitelist?.length === 1;
}
