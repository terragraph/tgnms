/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
