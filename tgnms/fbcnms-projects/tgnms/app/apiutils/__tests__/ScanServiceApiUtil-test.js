/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as apiUtil from '../ScanServiceAPIUtil';
import axios from 'axios';
import {mockCancelToken} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockExecutionResults} from '@fbcnms/tg-nms/app/tests/data/ScanServiceApi';

jest.mock('axios');

describe('getExecutionResults', () => {
  test('makes an axios request', async () => {
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockExecutionResults(),
    });

    const {results} = await apiUtil.getExecutionResults({
      executionId: '1',
      cancelToken: mockCancelToken(),
    });
    expect(getMock).toHaveBeenCalled();
    expect(results['0'].group_id).toBe(1);
    expect(results['0'].tx_status).toBe('FINISHED');
  });
});

describe('startExecution', () => {
  test('makes an axios request', async () => {
    const getMock = jest.spyOn(axios, 'post');

    await apiUtil.startExecution({
      type: 2,
      mode: 2,
      networkName: 'MockNetworkName',
      options: {tx_wlan_mac: 'MockMacAddr'},
    });
    expect(getMock).toHaveBeenCalledWith('/scan_service/start', {
      type: 2,
      mode: 2,
      network_name: 'MockNetworkName',
      options: {tx_wlan_mac: 'MockMacAddr'},
    });
  });
});
