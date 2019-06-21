/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as api from '../../../apiutils/NetworkTestAPIUtil';
import * as axios from 'axios';

import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import {getStatusDef} from '../../network_test/TestStatus';
import {TEST_STATUS} from '../../../../shared/dto/TestExecution';
import type {TestExecution} from '../../../../shared/dto/TestExecution';

// test statuses which require us to poll
const inProgressStatuses = new Set([
  TEST_STATUS.SCHEDULED,
  TEST_STATUS.QUEUED,
  TEST_STATUS.RUNNING,
]);

const completeStatuses = new Set([
  TEST_STATUS.ABORTED,
  TEST_STATUS.FAILED,
  TEST_STATUS.FINISHED,
]);

export type Props = {
  testId: string,
  onComplete: (execution: TestExecution) => any,
};

export default function SpeedTestStatus({testId, onComplete}: Props) {
  const {testExecution, testProgress} = useSpeedTestStatus({
    testId,
    onComplete,
  });
  return (
    <Grid container justify="center" direction="column" alignItems="center">
      <Grid item>
        <Typography variant="body1" paragraph>
          {testProgress.message}
        </Typography>
      </Grid>
      <Grid item xs={4}>
        {testExecution && <TestStatus execution={testExecution} />}
      </Grid>
    </Grid>
  );
}

function TestStatus(props: {execution: TestExecution}) {
  const {execution} = props;
  const {text, icon} = getStatusDef(execution.status);
  return (
    <Grid container direction="column" alignItems="center" spacing={16}>
      <Grid item>{React.createElement(icon, {execution})}</Grid>
      <Grid item>
        <Typography variant="body1">{text}</Typography>
      </Grid>
    </Grid>
  );
}

function useSpeedTestStatus({testId, onComplete}) {
  const [testExecution, setTestExecution] = React.useState<?TestExecution>(
    null,
  );
  const [testProgress, setTestProgress] = React.useState<SpeedTestProgress>({
    message: '',
  });

  React.useEffect(() => {
    let cancelToken: axios.CancelTokenSource;
    let timeoutId: TimeoutID;
    setTestProgress({loading: true, message: 'Loading test info'});
    async function makeRequest() {
      cancelToken = axios.CancelToken.source();
      try {
        const execution = await api.getTestExecution({
          executionId: testId,
          includeTestResults: true,
          cancelToken: cancelToken.token,
        });
        // check if it returned something weird
        if (!execution || typeof execution.id !== 'number') {
          return setTestProgress({
            message: 'Loading test failed',
            loading: false,
            error: true,
          });
        }
        setTestExecution(execution);
        setTestProgress({});
        if (inProgressStatuses.has(execution.status)) {
          timeoutId = setTimeout(makeRequest, 1000);
        } else if (completeStatuses.has(execution.status)) {
          onComplete && onComplete(execution);
        }
      } catch (error) {
        setTestProgress({
          message: error.message || 'Speed test failed',
        });
      }
    }
    makeRequest();
    return () => {
      if (cancelToken) {
        cancelToken.cancel();
      }
      if (typeof timeoutId === 'number') {
        clearTimeout(timeoutId);
      }
    };
  }, [testId, onComplete]);

  return {testExecution, testProgress};
}

type SpeedTestProgress = {
  message?: ?string,
  loading?: ?boolean,
  error?: ?boolean,
};
