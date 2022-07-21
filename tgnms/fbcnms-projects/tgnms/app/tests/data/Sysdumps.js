/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import type {NodeSysdumpType} from '@fbcnms/tg-nms/app/views/sysdumps/NodeSysdumps';

export function mockSysdumpData(): Array<NodeSysdumpType> {
  return [
    {
      filename: 'test1',
      date: 'test1-date',
      size: 123,
    },
    {
      filename: 'test2',
      date: 'test2-date',
      size: 123,
    },
    {
      filename: 'test3',
      date: 'test3-date',
      size: 123,
    },
  ];
}

export function mockSysdumpEntryData(): NodeSysdumpType {
  return {
    filename: 'testFilename',
    date: 'testDate',
    size: 123,
  };
}
