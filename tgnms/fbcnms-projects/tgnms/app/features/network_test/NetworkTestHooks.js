/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as React from 'react';
import * as api from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import axios from 'axios';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {TEST_EXECUTION_STATUS} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {isTestRunning} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHelpers';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {
  ExecutionDetailsType,
  ExecutionResultDataType,
  FilterOptionsType,
  InputGetType,
} from '@fbcnms/tg-nms/shared/dto/NetworkTestTypes';

export function useLoadTestExecutionResults({
  networkTestId,
}: {
  networkTestId: string,
}) {
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
      if (!networkTestId) {
        return;
      }
      setLoading(true);
      try {
        const executionResults = await api.getExecutionResults({
          executionId: networkTestId,
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
  }, [networkTestId, shouldUpdate]);

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
  const [shouldUpdate, setShouldUpdate] = React.useState(actionUpdate);
  const runningTestTimeoutRef = React.useRef<?TimeoutID>(null);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const snackbars = useSnackbars();
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
            TEST_EXECUTION_STATUS[stat.toUpperCase()] !==
              TEST_EXECUTION_STATUS.SCHEDULED &&
            TEST_EXECUTION_STATUS[stat.toUpperCase()] !==
              TEST_EXECUTION_STATUS.PAUSED,
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
          return setLoading(false);
        }
        if (typeof result === 'string') {
          setLoading(false);
          return snackbars.error(result);
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

      const sortedExecutions = [...tempRows.executions].sort(
        (a, b) =>
          new Date(b.start_dt).getTime() - new Date(a.start_dt).getTime(),
      );

      if (!runningTestTimeoutRef.current && tempRows.running.length) {
        runningTestTimeoutRef.current = setTimeout(() => {
          setShouldUpdate(!shouldUpdate);
          runningTestTimeoutRef.current = null;
        }, 10000);
      }

      setData([
        ...tempRows.running,
        ...tempRows.schedule.reverse(),
        ...sortedExecutions,
      ]);
    };

    loadData();

    return () => cancelSource.cancel();
  }, [filterOptionsRef, inputDataRef, shouldUpdate, snackbars]);

  useUnmount(() => {
    if (runningTestTimeoutRef.current != null) {
      clearTimeout(runningTestTimeoutRef.current);
    }
  });

  return {loading, data};
}
