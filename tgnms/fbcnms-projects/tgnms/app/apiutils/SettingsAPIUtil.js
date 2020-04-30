/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import axios from 'axios';
import type {
  EnvMap,
  SettingsState,
  TestResultMap,
} from '../../shared/dto/Settings';

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
