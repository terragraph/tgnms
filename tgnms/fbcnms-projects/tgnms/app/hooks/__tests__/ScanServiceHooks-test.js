/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {renderHook} from '@testing-library/react-hooks';
import {
  useLoadScanExecutionResults,
  useLoadScanTableData,
} from '../ScanServiceHooks';

jest.mock('../useSnackbar');
jest.mock('@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil', () => ({
  getSchedules: ({inputData: {}, cancelToken: {}}) =>
    Promise.resolve([{id: 1, status: 'SCHEDULED'}]),
  getExecutions: ({inputData: {}, cancelToken: {}}) =>
    Promise.resolve([{id: 1, status: 'FINISHED'}]),
  getExecutionResults: ({executionId: {}, cancelToken: {}}) =>
    Promise.resolve({
      execution: {id: 'scanExecution'},
      results: {id: 'scanResults'},
    }),
}));

describe('useLoadScanExecutionResults', () => {
  test('calling useLoadScanExecutionResults loading initially ', () => {
    const {result} = renderHook(() =>
      useLoadScanExecutionResults({scanId: '1'}),
    );
    expect(result.current.loading).toBe(true);
  });
});

describe('useLoadScanTableData', () => {
  test('calling useLoadScanTableData initializes loading to true initially', () => {
    const {result} = renderHook(() =>
      useLoadScanTableData({
        filterOptions: null,
        inputData: {networkName: 'testNetwork'},
        actionUpdate: false,
      }),
    );
    expect(result.current.loading).toBe(true);
  });
});
