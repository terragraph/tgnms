/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import {mockNetworkConfig} from '../../tests/data/NetworkConfig';
import {renderHook} from '@testing-library/react-hooks';
import {useNodeConfig} from '../useNodeConfig';

jest.mock('../../contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
    networkConfig: mockNetworkConfig(),
  }),
}));

describe('useNodeConfig', () => {
  test('calling useNodeConfig returns initial loading', () => {
    const {result} = renderHook(() => useNodeConfig({nodeName: 'testNode'}));
    expect(result.current.loading).toBe(true);
  });
});
