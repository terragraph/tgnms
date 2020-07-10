/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as React from 'react';
import * as api from '../apiutils/NetworkTestAPIUtil';
import axios from 'axios';
import useLiveRef from './useLiveRef';
import useUnmount from './useUnmount';
import {EXECUTION_STATUS} from '../constants/ScheduleConstants';
import {isTestRunning} from '../helpers/NetworkTestHelpers';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

import type {
  ExecutionDetailsType,
  ExecutionResultDataType,
  FilterOptionsType,
  InputGetType,
} from '../../shared/dto/NetworkTestTypes';

export function useLoadTestExecutionResults({testId}: {testId: string}) {
  const [loading, setLoading] = React.useState(true);
  const [execution, setExecution] = React.useState<?ExecutionDetailsType>(null);
  const [results, setResults] = React.useState<?Array<ExecutionResultDataType>>(
    null,
  );
  const [shouldUpdate, setShouldUpdate] = React.useState(false);

  const runningTestTimeoutRef = React.useRef<?TimeoutID>(null);

  React.useEffect(() => {
    const cancelSource = axios.CancelToken.source();

    const getExecutionResults = async () => {
      if (!testId) {
        return;
      }
      setLoading(true);
      try {
        const executionResults = await api.getExecutionResults({
          executionId: testId,
          cancelToken: cancelSource.token,
        });
        setExecution(executionResults.execution);
        setResults(executionResults.results);
        setLoading(false);
      } catch (_error) {
        setLoading(false);
      }
    };
    getExecutionResults();

    return () => cancelSource.cancel();
  }, [testId, shouldUpdate]);

  React.useEffect(() => {
    if (
      !runningTestTimeoutRef.current &&
      execution &&
      isTestRunning(execution.status)
    ) {
      runningTestTimeoutRef.current = setTimeout(() => {
        setShouldUpdate(!shouldUpdate);
        runningTestTimeoutRef.current = null;
      }, 10000);
    }
  }, [execution, shouldUpdate]);

  useUnmount(() => {
    if (runningTestTimeoutRef.current != null) {
      clearTimeout(runningTestTimeoutRef.current);
    }
  });

  return {loading, execution, results};
}

export function useLoadTestTableData({
  filterOptions,
  inputData,
  actionUpdate,
}: {
  filterOptions: FilterOptionsType,
  inputData: InputGetType,
  actionUpdate: boolean,
}) {
  const enqueueSnackbar = useEnqueueSnackbar();
  const [shouldUpdate, setShouldUpdate] = React.useState(actionUpdate);
  const runningTestTimeoutRef = React.useRef<?TimeoutID>(null);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);

  const filterOptionsRef = useLiveRef(filterOptions);
  const inputDataRef = useLiveRef(inputData);

  React.useEffect(() => {
    const currentInputData = inputDataRef.current;
    const currentFilterOptions = filterOptionsRef.current;

    setLoading(true);
    const cancelSource = axios.CancelToken.source();

    const loadData = async () => {
      const testTableData = await Promise.all([
        api.getSchedules({
          inputData: currentInputData,
          cancelToken: cancelSource.token,
        }),
        !currentFilterOptions?.status ||
        currentFilterOptions?.status.find(
          stat =>
            EXECUTION_STATUS[stat.toUpperCase()] !==
              EXECUTION_STATUS.SCHEDULED &&
            EXECUTION_STATUS[stat.toUpperCase()] !== EXECUTION_STATUS.PAUSED,
        )
          ? api.getExecutions({
              inputData: currentInputData,
              cancelToken: cancelSource.token,
            })
          : [],
      ]);

      const tempRows = {running: [], schedule: [], executions: []};
      testTableData.forEach(result => {
        if (result.includes('undefined')) {
          return;
        }
        if (typeof result === 'string') {
          return enqueueSnackbar(result, {
            variant: 'error',
          });
        }
        result.forEach(newRow => {
          if (newRow.status === undefined) {
            tempRows.schedule.push(newRow);
          } else if (isTestRunning(newRow.status)) {
            tempRows.running.push(newRow);
          } else {
            tempRows.executions.push(newRow);
          }
        });
        setLoading(false);
      });

      if (!runningTestTimeoutRef.current && tempRows.running.length) {
        runningTestTimeoutRef.current = setTimeout(() => {
          setShouldUpdate(!shouldUpdate);
          runningTestTimeoutRef.current = null;
        }, 10000);
      }

      setData([
        ...tempRows.running,
        ...tempRows.schedule.reverse(),
        ...tempRows.executions.reverse(),
      ]);
    };

    loadData();

    return () => cancelSource.cancel();
  }, [
    enqueueSnackbar,
    filterOptionsRef,
    inputDataRef,
    shouldUpdate,
    actionUpdate,
  ]);

  useUnmount(() => {
    if (runningTestTimeoutRef.current != null) {
      clearTimeout(runningTestTimeoutRef.current);
    }
  });

  return {loading, data};
}
