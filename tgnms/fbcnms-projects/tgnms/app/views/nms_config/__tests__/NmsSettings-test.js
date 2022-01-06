/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NmsSettings from '../NmsSettings';
import React from 'react';
import axiosMock from 'axios';
import settingsEngine, {SETTINGS} from '../../../../server/settings/settings';
import {
  TestApp,
  initWindowConfig,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, waitFor} from '@testing-library/react';
import type {EnvMap, SettingsState} from '@fbcnms/tg-nms/shared/dto/Settings';

jest.mock('axios');

const getMock = jest.spyOn(axiosMock, 'get');
getMock.mockResolvedValue({
  data: makeSettings({API_REQUEST_TIMEOUT: '5000', LOG_LEVEL: 'DEBUG'}),
  status: 200,
});
const _postMock = jest
  .spyOn(axiosMock, 'post')
  .mockResolvedValue({data: null, status: 500, statusText: 'mock axios'});

beforeEach(() => {
  initWindowConfig({
    featureFlags: {
      NMS_SETTINGS_ENABLED: true,
    },
  });
});

describe('routing', () => {
  test('renders networks view by default', async () => {
    const {getByTestId} = await renderAsync(
      <TestApp route="/config">
        <NmsSettings />
      </TestApp>,
    );
    expect(getByTestId('nms-config')).toBeInTheDocument();
  });
  test('renders networks view when feature is disabled', async () => {
    initWindowConfig({
      featureFlags: {
        NMS_SETTINGS_ENABLED: false,
      },
    });
    const {getByTestId} = await renderAsync(
      <TestApp route="/config">
        <NmsSettings />
      </TestApp>,
    );
    expect(getByTestId('nms-config')).toBeInTheDocument();
  });

  test('renders services view when route is /config/_/services', async () => {
    const {getByText} = await renderAsync(
      <TestApp route="/config/_/services">
        <NmsSettings />
      </TestApp>,
    );
    expect(getByText(/^software portal$/i)).toBeInTheDocument();
  });
});

describe('Services', () => {
  test('after loading, service values show in text boxes', async () => {
    getMock.mockResolvedValueOnce(makeResponse({API_REQUEST_TIMEOUT: '3000'}));
    const {getByLabelText} = await renderAsync(
      <TestApp route="/config/_/services">
        <NmsSettings />
      </TestApp>,
    );
    expect(
      coerceClass(getByLabelText('API Request Timeout'), HTMLInputElement)
        .value,
    ).toBe('3000');
  });
  test('form requests confirmation before posting', async () => {
    getMock.mockResolvedValueOnce(makeResponse({API_REQUEST_TIMEOUT: '3000'}));
    const {getByText, getByLabelText, getByTestId} = await renderAsync(
      <TestApp route="/config/_/services">
        <NmsSettings />
      </TestApp>,
      {baseElement: document.body},
    );
    expect(_postMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.change(
        coerceClass(getByLabelText('API Request Timeout'), HTMLInputElement),
        {target: {value: '1000'}},
      );
    });
    await submitAndConfirm({getByTestId, getByText});

    expect(_postMock).toHaveBeenCalled();
  });
  test('request confirmation does not crash when things changed', async () => {
    getMock.mockResolvedValueOnce(makeResponse({API_REQUEST_TIMEOUT: '3000'}));
    const {getByText, getByLabelText, getByTestId} = await renderAsync(
      <TestApp route="/config/_/services">
        <NmsSettings />
      </TestApp>,
      {baseElement: document.body},
    );
    expect(_postMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.change(
        coerceClass(getByLabelText('Prometheus URL'), HTMLInputElement),
        {target: {value: 'anything'}},
      );
    });
    await submitAndConfirm({getByTestId, getByText});
    expect(_postMock).toHaveBeenCalled();
  });
});

async function submitAndConfirm({getByTestId, getByText}) {
  await act(async () => {
    fireEvent.click(getByTestId('submit-button'));
  });

  await waitFor(() => getByText('Confirm Settings Change'));
  await act(async () => {
    fireEvent.click(getByTestId('confirm-settings-change'));
  });
}

/**
 * Creates an axios response with settings created from env as the response data
 */
function makeResponse(env: EnvMap) {
  return {
    data: makeSettings(env),
    status: 200,
  };
}

/**
 * Make a SettingsState object with env as values. This does not simulate cli
 * overrides.
 *
 * Since NmsSettings renders real settings (like MYSQL_HOST), this makes
 * a SettingsState object using the actual list of registered settings which
 * can then be returned by axios mock.
 */
function makeSettings(env: EnvMap): SettingsState {
  const state = settingsEngine._makeSettings({
    registeredSettings: settingsEngine._makeSettingsMap(SETTINGS),
    envMaps: {
      defaults: {},
      initialEnv: {},
      dotenvEnv: {},
      settingsFileEnv: env,
    },
  });
  return state;
}

export function coerceClass<T>(value: {}, t: Class<T>): T {
  if (value instanceof t) {
    return value;
  }
  throw new Error('invalid instance type');
}
