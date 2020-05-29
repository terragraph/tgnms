/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as React from 'react';
import * as api from '../apiutils/NetworkTestAPIUtil';
import axios from 'axios';
import type {TestExecution} from '../../shared/dto/TestExecution';

import type {
  ExecutionDetailsType,
  ExecutionResultDataType,
} from '../../shared/dto/NetworkTestTypes';

export function useLoadTestExecutionResults({testId}: {testId: string}) {
  const [loading, setLoading] = React.useState(true);
  const [execution, setExecution] = React.useState<?ExecutionDetailsType>(null);
  const [results, setResults] = React.useState<?Array<ExecutionResultDataType>>(
    null,
  );

  React.useEffect(() => {
    if (!testId) {
      return;
    }
    setLoading(true);
    const cancelSource = axios.CancelToken.source();
    api
      .getExecutionResults({
        executionId: testId,
        cancelToken: cancelSource.token,
      })
      .then(data => {
        setLoading(false);
        setExecution(data.execution);
        setResults(data.results);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => cancelSource.cancel();
  }, [testId]);

  return {loading, execution, results};
}

export function useLoadTestExecution({testId}: {testId: string}) {
  const [loading, setLoading] = React.useState(true);
  const [execution, setExecution] = React.useState<?TestExecution>(null);
  React.useEffect(() => {
    if (!testId) {
      return;
    }
    setLoading(true);
    const cancelSource = axios.CancelToken.source();
    api
      .getTestExecution({
        executionId: testId,
        includeTestResults: true,
        cancelToken: cancelSource.token,
      })
      .then(execution => {
        setLoading(false);
        setExecution(execution);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => cancelSource.cancel();
  }, [testId]);

  return {loading, execution};
}
