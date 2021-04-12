/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as api from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import axios from 'axios';
import useLiveRef from './useLiveRef';
import useUnmount from './useUnmount';
import {SCAN_EXECUTION_STATUS} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {
  AggregatedInrType,
  ExecutionDetailsType,
  ExecutionResultDataType,
  FilterOptionsType,
  InputGetType,
} from '@fbcnms/tg-nms/shared/dto/ScanServiceTypes';

export function useLoadScanExecutionResults({scanId}: {scanId: string}) {
  const [loading, setLoading] = React.useState(true);
  const [execution, setExecution] = React.useState<?ExecutionDetailsType>(null);
  const [results, setResults] = React.useState<?Array<ExecutionResultDataType>>(
    null,
  );
  const [aggregatedInr, setAggregatedInr] = React.useState<?AggregatedInrType>(
    null,
  );

  React.useEffect(() => {
    if (!scanId) {
      return;
    }
    const cancelSource = axios.CancelToken.source();
    setLoading(true);
    const getScanExecutionResults = async () => {
      try {
        const scanExecutionData = await api.getExecutionResults({
          executionId: scanId,
          cancelToken: cancelSource.token,
        });
        setLoading(false);
        setExecution(scanExecutionData.execution);
        setAggregatedInr(scanExecutionData.aggregated_inr);
        setResults(
          objectValuesTypesafe<ExecutionResultDataType>(
            scanExecutionData.results,
          ),
        );
      } catch {
        setLoading(false);
      }
    };

    getScanExecutionResults();
    return () => cancelSource.cancel();
  }, [scanId]);

  return {loading, execution, aggregatedInr, results};
}

export function useLoadScanTableData({
  filterOptions,
  inputData,
  actionUpdate,
}: {
  filterOptions: ?FilterOptionsType,
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
            SCAN_EXECUTION_STATUS[stat.toUpperCase()] !==
              SCAN_EXECUTION_STATUS.SCHEDULED &&
            SCAN_EXECUTION_STATUS[stat.toUpperCase()] !==
              SCAN_EXECUTION_STATUS.PAUSED,
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
          setLoading(false);
          return;
        }
        if (typeof result === 'string') {
          return snackbars.error(result);
        }
        result.forEach(newRow => {
          if (newRow.status === undefined) {
            tempRows.schedule.push(newRow);
          } else if (
            SCAN_EXECUTION_STATUS[newRow.status] ===
              SCAN_EXECUTION_STATUS.RUNNING ||
            SCAN_EXECUTION_STATUS[newRow.status] ===
              SCAN_EXECUTION_STATUS.QUEUED
          ) {
            tempRows.running.push(newRow);
          } else {
            tempRows.executions.push(newRow);
          }
        });
      });
      setLoading(false);

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
  }, [filterOptionsRef, inputDataRef, shouldUpdate, actionUpdate, snackbars]);

  useUnmount(() => {
    if (runningTestTimeoutRef.current != null) {
      clearTimeout(runningTestTimeoutRef.current);
    }
  });

  return {loading, data};
}
