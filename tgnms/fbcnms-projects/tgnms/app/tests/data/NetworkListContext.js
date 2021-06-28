/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import type {NetworkList} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {NetworkListContextType} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';

export function mockNetworkListContext(
  overrides?: $Shape<NetworkListContextType>,
): NetworkListContextType {
  return {
    waitForNetworkListRefresh: jest.fn(),
    getNetworkName: jest.fn(() => ''),
    changeNetworkName: jest.fn(name => name),
    networkList: ({}: $Shape<NetworkList>),
    ...(overrides ?? {}: $Shape<NetworkListContextType>),
  };
}
