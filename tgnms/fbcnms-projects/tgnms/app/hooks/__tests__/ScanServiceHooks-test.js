/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import {renderHook} from '@testing-library/react-hooks';
import {
  useLoadScanExecutionResults,
  useLoadScanTableData,
} from '../ScanServiceHooks';

jest.mock('@fbcnms/ui/hooks/useSnackbar');
jest.mock('../../apiutils/ScanServiceAPIUtil', () => ({
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
