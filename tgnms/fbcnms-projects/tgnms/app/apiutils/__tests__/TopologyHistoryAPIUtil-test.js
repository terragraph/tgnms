/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as apiUtil from '../TopologyHistoryAPIUtil';
import axios from 'axios';
import {mockCancelToken} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockTopologyResults} from '@fbcnms/tg-nms/app/tests/data/TopologyHistoryApi';

jest.mock('axios');

describe('getTopologyHistory', () => {
  test('makes an axios request', async () => {
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockTopologyResults().topologies,
    });

    const results = await apiUtil.getTopologyHistory({
      inputData: {
        networkName: 'test_network',
        startTime: '2021-07-28T20:22:05',
      },
      cancelToken: mockCancelToken(),
    });
    expect(getMock).toHaveBeenCalled();
    expect(results.length).toBe(2);
    expect(results[0].topology.name).toBe('puma_e2e_dryrun');
  });
});
