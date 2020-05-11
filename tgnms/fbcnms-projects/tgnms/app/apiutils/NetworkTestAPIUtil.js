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
      enabled: true,
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

// soon to be deprecated api utils below:

import {HEALTH_CODES} from '../constants/HealthConstants';
import {TEST_STATUS} from '../../shared/dto/TestResult';
import {TEST_TYPE_CODES} from '../../shared/dto/TestExecution';
import type {TablePage} from '../../shared/dto/TablePage';
import type {TestExecution as TestExecutionDto} from '../../shared/dto/TestExecution';
import type {TestResult as TestResultDto} from '../../shared/dto/TestResult';
import type {TestSchedule as TestScheduleDto} from '../../shared/dto/TestSchedule';

export const getTestResults = ({
  executionId,
  results,
  metrics,
}: {
  executionId?: string,
  results?: Array<string>,
  metrics?: Array<$Keys<TestResultDto>>,
}) => {
  const url = new URL('/network_test/results', window.location);
  if (typeof executionId !== 'undefined') {
    url.searchParams.append('executionId', executionId);
  }
  if (typeof metrics !== 'undefined') {
    url.searchParams.append('metrics', metrics.join(','));
  }
  if (typeof results !== 'undefined') {
    url.searchParams.append('results', results.join(','));
  }
  return axios
    .get<null, Array<TestResultDto>>(url.toString())
    .then(response => response.data.map<TestResultDto>(deserializeTestResult));
};

/**
 * Gets the various types of network tests and their parameters
 */
export const getTestOptions = () => {
  return axios.get('/network_test/options').then(response => {
    const tests: ScheduleNetworkTestSchema = formatHelpApiResponse(
      response.data,
    );
    return tests;
  });
};

export const startTest = (formData: ScheduleNetworkTestFormData) => {
  const startTestRequest = Object.keys(formData.arguments).reduce(
    (request, key) => {
      request[key] = formData.arguments[key].value;
      return request;
    },
    {test_code: parseFloat(formData.testType)},
  );
  return axios.post<any, any>('/network_test/start', startTestRequest);
};

export const startSpeedTest = (request: any) => {
  return axios.post<any, any>('/network_test/start', {
    test_code: parseFloat(TEST_TYPE_CODES.MULTI_HOP),
    asap: 1,
    ...request,
  });
};

export const stopTest = (networkName: ?string) => {
  return axios.post<any, any>('/network_test/stop', {
    topology_name: networkName,
  });
};

export const getExecutionsByNetworkName = ({
  networkName,
  afterDate = '',
  testType = '',
  protocol = '',
}: {
  networkName: string,
  afterDate?: string,
  testType?: ?string,
  protocol?: string,
}): Promise<TablePage<TestExecutionDto>> => {
  const url = new URL('/network_test/executions', window.location);
  url.searchParams.append('network', networkName);
  url.searchParams.append('afterDate', afterDate);
  url.searchParams.append('testType', testType || '');
  url.searchParams.append('protocol', protocol || '');
  return axios
    .get<any, TablePage<TestExecutionDto>>(url.toString())
    .then(({data}) =>
      Object.assign(data, {
        rows: data.rows && data.rows.map(row => deserializeTestExecution(row)),
      }),
    );
};

export const getTestExecution = ({
  executionId,
  includeTestResults,
  cancelToken,
}: {
  executionId: string,
  includeTestResults?: boolean,
  cancelToken: CancelToken,
}) => {
  const url = new URL(
    `/network_test/executions/${executionId}`,
    window.location,
  );
  url.searchParams.append(
    'includeTestResults',
    (!!includeTestResults).toString(),
  );
  return axios<null, TestExecutionDto>({
    url: url.toString(),
    cancelToken: cancelToken,
  }).then(response => deserializeTestExecution(response.data));
};

export const getTestSchedule = ({
  networkName,
  cancelToken,
}: {
  networkName: string,
  cancelToken?: CancelToken,
}) => {
  const url = new URL(`/network_test/schedule/${networkName}`, window.location);
  return axios({
    url: url.toString(),
    cancelToken: cancelToken || axios.CancelToken.source().token,
  }).then(
    response => response.data && response.data.map(deserializeTestSchedule),
  );
};

export const deleteTestSchedule = ({
  scheduleId,
  cancelToken,
}: {
  scheduleId: number,
  cancelToken: CancelToken,
}) => {
  const url = new URL(`/network_test/schedule/${scheduleId}`, window.location);
  return axios<null, null>({
    url: url.toString(),
    method: 'DELETE',
    cancelToken: cancelToken,
  });
};

function formatHelpApiResponse(data: any): ScheduleNetworkTestSchema {
  return Object.freeze({
    test_types: data.start_test.map((testType, _index) => {
      return {
        label: testType.label,
        value: testType.test_code,
        parameters: testType.parameters.map(({key, ...rest}) => ({
          id: key,
          ...rest,
        })),
      };
    }),
  });
}

// convert from JSON serialized to actually match the expected flow type
function deserializeTestExecution(serialized: any): TestExecutionDto {
  return Object.assign({}, serialized, {
    end_date_utc: new Date(serialized.end_date_utc),
    start_date_utc: new Date(serialized.start_date_utc),
    expected_end_date_utc: new Date(serialized.expected_end_date_utc),
    test_results:
      serialized.test_results &&
      serialized.test_results.map(deserializeTestResult),
  });
}

function deserializeTestResult(serialized: any): TestResultDto {
  return Object.assign({}, serialized, {
    start_date_utc: new Date(serialized.start_date_utc),
    end_date_utc: new Date(serialized.end_date_utc),
    /**
     * even though the test has not completed, the network test backend
     * will still mark the health as excellent. This means that aborted / failed
     * will show as green. This takes that into account without backend changes.
     * A getter is used instead of a normal property to make it apparent why the
     * health is different from the db value.
     * Modification happens at this layer so that all the callsites which
     * depend on health won't have to change.
     */
    // $FlowFixMe - getter makes it more apparent that health is overridden
    get health() {
      if (serialized.status !== TEST_STATUS.FINISHED) {
        return HEALTH_CODES.UNKNOWN;
      }
      return serialized.health;
    },
  });
}

function deserializeTestSchedule(serialized: any): TestScheduleDto {
  return Object.assign({}, serialized, {
    test_execution: serialized.test_execution
      ? deserializeTestExecution(serialized.test_execution)
      : null,
  });
}

export type ScheduleNetworkTestSchema = {|
  test_types: Array<NetworkTestDefinition>,
|};

export type NetworkTestDefinition = {|
  label: string,
  value?: string,
  parameters: Array<NetworkTestParameter>,
|};

export type NetworkTestParameter = {|
  id: string,
  label: string,
  value: string,
  meta: {
    range?: {
      min_value: number,
      max_value: number,
    },
    dropdown?: Array<{label: string, value: string}>,
    unit: string,
    type: NetworkTestParameterType,
    ui_type: NetworkTestUiTypeHint,
  },
|};

type NetworkTestParameterType = 'int' | 'float' | 'str';

type NetworkTestUiTypeHint = 'range' | 'dropdown' | 'input';

export type ScheduleNetworkTestFormData = {
  testType: string,
  arguments: {
    [string]: NetworkTestArgument,
  },
};

export type NetworkTestArgument = {|
  id: string,
  value: string,
|};
