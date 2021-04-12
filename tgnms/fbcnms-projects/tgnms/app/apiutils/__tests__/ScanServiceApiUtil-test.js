/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
