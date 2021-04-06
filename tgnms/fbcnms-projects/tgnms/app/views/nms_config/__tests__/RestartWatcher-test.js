/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as settingsApi from '../../../apiutils/SettingsAPIUtil';
import React from 'react';
import RestartWatcher, {useRestartWatcher} from '../RestartWatcher';
import {cleanup, render} from '@testing-library/react';
import {act as hooksAct, renderHook} from '@testing-library/react-hooks';

jest.useFakeTimers();

const restartStatusMock = jest
  .spyOn(settingsApi, 'checkRestartStatus')
  .mockImplementation(() => Promise.resolve(false));
const defaultWatcher = {
  start: jest.fn(),
  state: 'IDLE',
};
beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: {reload: jest.fn()},
  });
});
describe('RestartWatcher', () => {
  test('renders nothing if watcher state is idle', async () => {
    const {queryByTestId} = render(
      <RestartWatcher watcher={defaultWatcher} />,
      {baseElement: document.body ?? undefined},
    );
    const modal = getModal({queryByTestId});
    expect(modal).toBe(null);
  });
  test('renders modal if watcher state is not idle', async () => {
    const {queryByTestId, getByTestId} = render(
      <RestartWatcher watcher={{...defaultWatcher, state: 'LOADING'}} />,
      {baseElement: document.body ?? undefined},
    );
    const modal = getModal({queryByTestId});
    expect(modal).not.toBe(null);
    expect(getByTestId('loading-status')).toBeInTheDocument();
    expect(queryByTestId('error-status')).not.toBeInTheDocument();
    expect(queryByTestId('success-status')).not.toBeInTheDocument();
  });
  test('renders success title and status if watcher state is success', () => {
    const {queryByTestId, getByTestId, getByText} = render(
      <RestartWatcher watcher={{...defaultWatcher, state: 'SUCCESS'}} />,
      {baseElement: document.body ?? undefined},
    );
    const modal = getModal({queryByTestId});
    expect(modal).not.toBe(null);
    expect(getByTestId('success-status')).toBeInTheDocument();
    expect(getByText(/^restart successful$/i)).toBeInTheDocument();
    expect(queryByTestId('loading-status')).not.toBeInTheDocument();
    expect(queryByTestId('error-status')).not.toBeInTheDocument();
  });

  test('refreshes the webpage after success + timeout', () => {
    const reloadSpy = jest
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});
    const {} = render(
      <RestartWatcher watcher={{...defaultWatcher, state: 'SUCCESS'}} />,
      {baseElement: document.body ?? undefined},
    );
    expect(reloadSpy).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(reloadSpy).toHaveBeenCalled();
  });
});

describe('useRestartWatcher hook', () => {
  const MINUTE_MS = 60 * 60 * 1000;
  test('Does nothing until start is called', () => {
    const {result} = renderHook(() => useRestartWatcher());
    expect(result.current.state).toBe('IDLE');
    hooksAct(() => {
      result.current.start();
    });
    expect(result.current.state).toBe('LOADING');
  });
  test('Triggers error state if timeout is exceeded', async () => {
    const {result} = renderHook(() => useRestartWatcher());
    expect(result.current.state).toBe('IDLE');
    hooksAct(() => {
      result.current.start();
    });
    expect(result.current.state).toBe('LOADING');

    // after a minute of waiting, the restart may have failed
    await advanceTime(MINUTE_MS);
    expect(result.current.state).toBe('ERROR');
  });
  test('Polls for NMS restart', async () => {
    let statusIdx = 0;
    // we expect NMS to transition from up->down->up
    const statusValues = [true, true, true, false, false, true];
    restartStatusMock.mockImplementation(() =>
      Promise.resolve(statusValues[statusIdx]),
    );
    const {result} = renderHook(() => useRestartWatcher());
    await hooksAct(async () => {
      result.current.start();
    });
    for (; statusIdx < statusValues.length; statusIdx++) {
      await advanceTime(500);
    }

    expect(result.current.state).toBe('SUCCESS');
  });
});

function getModal({queryByTestId}): ?HTMLElement {
  return queryByTestId('restart-watcher-modal');
}

async function advanceTime(time: number): Promise<void> {
  await hooksAct(async () => {
    jest.advanceTimersByTime(time);
  });
}
