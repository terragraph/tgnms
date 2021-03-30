/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as serviceApiUtil from '../../apiutils/ServiceAPIUtil';
import useTroubleshootAutomation from '../useTroubleshootAutomation';
import {act, renderHook} from '@testing-library/react-hooks';

const apiRequestSuccessMock = jest.fn(() => Promise.resolve({}));

jest
  .spyOn(serviceApiUtil, 'apiRequest')
  .mockImplementation(apiRequestSuccessMock);

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('../../hooks/useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

describe('useTroubleshootAutomation', () => {
  test('calling useTroubleshootAutomation returns a function', () => {
    const {result} = renderHook(() => useTroubleshootAutomation());
    expect(typeof result.current === 'function');
  });

  test('result can be called and triggers api call', () => {
    const {result} = renderHook(() => useTroubleshootAutomation());
    act(() => {
      result.current({
        apiCallData: {data: {}, endpoint: ''},
        successMessage: 'test',
      });
    });
    expect(apiRequestSuccessMock).toHaveBeenCalled();
  });

  test('if result is called and api call passes success snackbar is called', () => {
    const {result} = renderHook(() => useTroubleshootAutomation());
    act(() => {
      result.current({
        apiCallData: {data: {}, endpoint: ''},
        successMessage: 'test',
      });
    });
    expect(apiRequestSuccessMock).toHaveBeenCalled();
    expect(snackbarsMock.success).toHaveBeenCalled();
  });
});
