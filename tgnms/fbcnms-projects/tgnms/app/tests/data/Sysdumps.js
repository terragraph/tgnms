/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
