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
} from '../../shared/dto/NetworkTestTypes';
import type {TableResultType} from '../views/network_test/NetworkTestTypes';

export const scheduleTest = (inputData: InputStartType) => {
  return axios.post<InputStartType, string>('/network_test/schedule', {
    cron_expr: inputData.cronExpr,
    test_type: inputData.testType,
    network_name: inputData.networkName,
    iperf_options: inputData.iperfOptions,
  });
};

export const editTestSchedule = ({
  inputData,
  scheduleId,
}: {
  inputData: InputStartType,
  scheduleId: number,
}) => {
  return axios<EditScheduleType, null>({
    url: `/network_test/schedule/${scheduleId}`,
    method: 'PUT',
    data: {
      enabled: inputData.enabled !== undefined ? inputData.enabled : true,
      cron_expr: inputData.cronExpr,
      network_name: inputData.networkName,
      iperf_options: inputData.iperfOptions,
    },
  });
};

export const startExecution = (inputData: InputStartType) => {
  return axios.post<InputStartType, string>('/network_test/start', {
    test_type: inputData.testType,
    network_name: inputData.networkName,
    iperf_options: inputData.iperfOptions,
  });
};

export const startThroughputTest = (inputData: InputStartType) => {
  return axios.post<InputStartType, string>('/network_test/start', {
    test_type: 'multihop',
    network_name: inputData.networkName,
    whitelist: inputData.whitelist,
  });
};

export const stopExecution = ({executionId}: {executionId: number}) => {
  return axios<null, null>({
    url: `/network_test/execution/${executionId}`,
    method: 'DELETE',
  });
};

export const deleteSchedule = ({scheduleId}: {scheduleId: number}) => {
  return axios<null, null>({
    url: `/network_test/schedule/${scheduleId}`,
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
    url: `/network_test/schedule`,
    method: 'GET',
    cancelToken: cancelToken,
    params: {
      test_type: inputData.testType || null,
      network_name: inputData.networkName || null,
      protocol: inputData.protocol || null,
      status: inputData.status || null,
      partial: inputData.partial || null,
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
    url: `/network_test/schedule/${scheduleId}`,
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
    url: `/network_test/executions`,
    method: 'GET',
    cancelToken: cancelToken,
    params: {
      test_type: inputData.testType || null,
      network_name: inputData.networkName || null,
      protocol: inputData.protocol || null,
      status: inputData.status || null,
      start_dt: inputData.startTime || null,
      partial: inputData.partial || null,
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
    url: `/network_test/execution_result/${executionId}`,
    method: 'GET',
    cancelToken: cancelToken,
  }).then(response => {
    return response.data;
  });
};
