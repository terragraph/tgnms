/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
import axios from 'axios';
import type {
  EnvMap,
  SettingsState,
  TestResultMap,
} from '@fbcnms/tg-nms/shared/dto/Settings';

export async function testSettings(env: EnvMap): Promise<TestResultMap> {
  const response = await axios.post<EnvMap, TestResultMap>(
    '/settings/test',
    env,
  );
  return response.data;
}

export async function getSettings(): Promise<SettingsState> {
  const response = await axios.get<void, SettingsState>('/settings');
  return response.data;
}

export async function postSettings(env: EnvMap): Promise<SettingsState> {
  const response = await axios.post<EnvMap, SettingsState>('/settings', env);
  return response.data;
}

export async function checkRestartStatus(
  req: ?{
    timeout?: number,
  },
): Promise<boolean> {
  const {timeout} = {timeout: 1000, ...(req || {})};
  try {
    await axios.get('/healthcheck', {
      timeout: timeout,
    });
    return true;
  } catch (error) {
    return false;
  }
}
