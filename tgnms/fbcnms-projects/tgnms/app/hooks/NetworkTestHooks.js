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

export function useLoadTestResults({links = []}: {links?: Array<string>}) {
  const [loading, setLoading] = React.useState(true);
  const [results, setResults] = React.useState(null);

  React.useEffect(
    () => {
      setLoading(true);
      if (!links || links.length === 0) {
        return;
      }
      const cancelSource = axios.CancelToken.source();
      api
        .getTestResults({
          results: links,
          cancelToken: cancelSource.token,
        })
        .then(results => {
          setResults(results);
          setLoading(false);
        });
      return () => cancelSource.cancel();
    },
    /*eslint-disable react-hooks/exhaustive-deps*/ [...links],
  );
  /*eslint-enable react-hooks/exhaustive-deps*/
  return {
    loading,
    results,
  };
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
