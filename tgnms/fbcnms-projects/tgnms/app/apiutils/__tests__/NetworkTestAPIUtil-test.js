/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as apiUtil from '../NetworkTestAPIUtil';
import axios from 'axios';
import {mockCancelToken} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockExecutionResults} from '@fbcnms/tg-nms/app/tests/data/NetworkTestApi';

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
    expect(results[0].id).toBe(1);
    expect(results[0].status).toBe('FINISHED');
  });
});
