/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as configAPIUtil from '@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {act} from '@testing-library/react';
import {renderHook} from '@testing-library/react-hooks';
import {useUpdateConfig} from '../useUpdateConfig';

import type {NodeConfigType} from '@fbcnms/tg-nms/shared/types/NodeConfig';

jest.mock('@fbcnms/tg-nms/app/contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
  }),
}));

const setNetworkOverridesConfigMock = jest.fn();
const setNodeOverridesConfigMock = jest.fn();

jest
  .spyOn(configAPIUtil, 'setNetworkOverridesConfig')
  .mockImplementation(setNetworkOverridesConfigMock);

jest
  .spyOn(configAPIUtil, 'setNodeOverridesConfig')
  .mockImplementation(setNodeOverridesConfigMock);

jest.mock('../useSnackbar');

describe('useUpdateConfig', () => {
  test('calling useUpdateConfig returns functions', () => {
    const {result} = renderHook(() => useUpdateConfig());
    expect(result.current.network).toBeInstanceOf(Function);
    expect(result.current.node).toBeInstanceOf(Function);
    expect(result.current.controller).toBeInstanceOf(Function);
    expect(result.current.aggregator).toBeInstanceOf(Function);
  });

  test('calling function from useUpdateConfig calls update api', () => {
    const {result} = renderHook(() => useUpdateConfig());
    const currentConfig: $Shape<NodeConfigType> = {};
    act(() => result.current.network({drafts: {}, currentConfig}));
    expect(setNetworkOverridesConfigMock).toHaveBeenCalled();
  });

  test('calling delete issues the correct request', () => {
    const {result} = renderHook(() => useUpdateConfig());
    act(() =>
      result.current.delete({
        type: FORM_CONFIG_MODES.NODE,
        paths: ['my.path.field1', 'alternate.field1'],
        currentConfig: {
          random: {field: 1},
          my: {path: {field1: 1, field2: 2}},
          alternate: {field1: 1},
        },
      }),
    );
    expect(setNodeOverridesConfigMock).toHaveBeenCalledWith(
      'testNetwork',
      {
        my: {path: {field2: 2}},
        alternate: {},
      },
      expect.anything(),
      expect.anything(),
    );
  });
});
