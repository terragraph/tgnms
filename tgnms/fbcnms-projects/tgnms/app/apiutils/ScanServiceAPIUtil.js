/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios, {CancelToken} from 'axios';

import type {
  EditScheduleType,
  ExecutionResultsType,
  InputGetType,
  InputStartType,
} from '@fbcnms/tg-nms/shared/dto/ScanServiceTypes';
import type {TableResultType} from '@fbcnms/tg-nms/app/features/scans/ScanServiceTypes';

export const scheduleScan = (inputData: InputStartType) => {
  return axios.post<InputStartType, string>('/scan_service/schedule', {
    cron_expr: inputData.cronExpr,
    type: inputData.type,
    network_name: inputData.networkName,
    mode: inputData.mode,
  });
};

export const editScanSchedule = ({
  inputData,
  scheduleId,
}: {
  inputData: InputStartType,
  scheduleId: number,
}) => {
  return axios<EditScheduleType, null>({
    url: `/scan_service/schedule/${scheduleId}`,
    method: 'PUT',
    data: {
      enabled: inputData.enabled !== undefined ? inputData.enabled : true,
      cron_expr: inputData.cronExpr,
      network_name: inputData.networkName,
      type: inputData.type,
      mode: inputData.mode,
    },
  });
};

export const startExecution = (inputData: InputStartType) => {
  return axios.post<InputStartType, string>('/scan_service/start', {
    type: inputData.type,
    network_name: inputData.networkName,
    mode: inputData.mode,
    options: inputData.options,
  });
};

export const deleteSchedule = ({scheduleId}: {scheduleId: number}) => {
  return axios<null, null>({
    url: `/scan_service/schedule/${scheduleId}`,
    method: 'DELETE',
  });
};

export const getSchedules = ({
  inputData,
  cancelToken,
}: {
  inputData: InputGetType,
  cancelToken: CancelToken,
}) => {
  return axios<InputGetType, Array<TableResultType>>({
    url: `/scan_service/schedule`,
    method: 'GET',
    cancelToken: cancelToken,
    params: {
      type: inputData.type || null,
      network_name: inputData.networkName || null,
      mode: inputData.mode || null,
    },
  })
    .then(result => result.data)
    .catch(error => 'Could not get schedules: ' + error.message);
};

export const getScheduleExecutions = ({
  cancelToken,
  scheduleId,
}: {
  cancelToken: CancelToken,
  scheduleId: number,
}): Promise<any> => {
  return axios<null, Array<TableResultType>>({
    url: `/scan_service/schedule/${scheduleId}`,
    method: 'GET',
    cancelToken: cancelToken,
  })
    .then(result => result.data)
    .catch(error => 'Could not get executions: ' + error.message);
};

export const getExecutions = ({
  inputData,
  cancelToken,
}: {
  inputData: InputGetType,
  cancelToken: CancelToken,
}) => {
  return axios<InputGetType, Array<TableResultType>>({
    url: `/scan_service/executions`,
    method: 'GET',
    cancelToken: cancelToken,
    params: {
      type: inputData.type || null,
      network_name: inputData.networkName || null,
      mode: inputData.mode || null,
      status: inputData.status || null,
      start_dt: inputData.startTime || null,
    },
  })
    .then(result => result.data)
    .catch(error => 'Could not get executions: ' + error.message);
};

export const getExecutionResults = ({
  executionId,
  cancelToken,
}: {
  executionId: string,
  cancelToken: CancelToken,
}) => {
  return axios<null, ExecutionResultsType>({
    url: `/scan_service/execution_result/${executionId}`,
    method: 'GET',
    cancelToken: cancelToken,
  }).then(response => {
    return response.data;
  });
};
