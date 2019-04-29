/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import type {TablePage} from '../../shared/dto/TablePage';
import type {TestResult as TestResultDto} from '../../shared/dto/TestResult';
import {TEST_STATUS} from '../../shared/dto/TestResult';
import type {TestExecution as TestExecutionDto} from '../../shared/dto/TestExecution';
import axios, {CancelToken} from 'axios';
import {HEALTH_CODES} from '../constants/HealthConstants';

export const getTestResults = ({executionId}: {executionId: string}) => {
  return axios
    .get<null, Array<TestResultDto>>(
      `/network_test/executions/${executionId}/results`,
    )
    .then(response => response.data.map<TestResultDto>(deserializeTestResult));
};

/**
 * Gets the various types of network tests and their parameters
 */
export const getTestOptions = () => {
  return axios.get('/network_test/options').then(response => {
    const tests: StartNetworkTestSchema = formatHelpApiResponse(response.data);
    return tests;
  });
};

export const startTest = (formData: StartNetworkTestFormData) => {
  const startTestRequest = Object.keys(formData.arguments).reduce(
    (request, key) => {
      request[key] = formData.arguments[key].value;
      return request;
    },
    {test_code: parseFloat(formData.testType)},
  );
  return axios.post<any, any>('/network_test/start', startTestRequest);
};

export const stopTest = () => {
  return axios.post<any, any>('/network_test/stop');
};

export const getExecutionsByNetworkName = ({
  networkName,
  afterDate = '',
  testType = '',
  protocol = '',
}: {
  networkName: string,
  afterDate?: string,
  testType?: string,
  protocol?: string,
}): Promise<TablePage<TestExecutionDto>> => {
  return axios
    .get<any, TablePage<TestExecutionDto>>(
      `/network_test/executions?network=${networkName}&afterDate=${encodeURIComponent(
        afterDate,
      )}&testType=${encodeURIComponent(
        testType || '',
      )}&protocol=${encodeURIComponent(protocol || '')}`,
    )
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
  return axios<null, TestExecutionDto>({
    url: `/network_test/executions/${executionId}?includeTestResults=${(!!includeTestResults).toString()}`,
    cancelToken: cancelToken,
  }).then(response => deserializeTestExecution(response.data));
};

function formatHelpApiResponse(data: any): StartNetworkTestSchema {
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

export type StartNetworkTestSchema = {|
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

export type StartNetworkTestFormData = {
  testType: string,
  arguments: {
    [string]: NetworkTestArgument,
  },
};

export type NetworkTestArgument = {|
  id: string,
  value: string,
|};
