/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import MapHistoryOverlayPanel from '../MapHistoryOverlayPanel';
import nullthrows from '@fbcnms/util/nullthrows';
import {
  MapContextWrapper,
  NmsOptionsContextWrapper,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  MuiPickersWrapper,
  TestApp,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {NmsOptionsContextProvider} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import {act, fireEvent} from '@testing-library/react';
import {mockNetworkMapOptions} from '@fbcnms/tg-nms/app/tests/data/NmsOptionsContext';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {NmsOptionsContextType} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';

jest.mock('axios');

test('renders loading without crashing', async () => {
  const setIsOverlayLoading = jest.fn();
  jest
    .spyOn(require('axios'), 'get')
    .mockImplementation(() => Promise.resolve({data: {}}));
  expect(setIsOverlayLoading).not.toHaveBeenCalled();
  await renderAsync(
    <Wrapper mapValue={{setIsOverlayLoading}}>
      <MapHistoryOverlayPanel />
    </Wrapper>,
  );
  expect(setIsOverlayLoading).toHaveBeenCalledWith(true);
});

test('renders after loading without crashing', async () => {
  jest
    .spyOn(require('axios'), 'get')
    .mockImplementation(() => Promise.resolve({data: {}}));
  const {getByText} = await renderAsync(
    <Wrapper>
      <MapHistoryOverlayPanel />
    </Wrapper>,
  );
  expect(getByText('Current Value:')).toBeInTheDocument();
});

test('date change triggers new api call', async () => {
  const axiosMock = jest
    .spyOn(require('axios'), 'get')
    .mockImplementation(() => Promise.resolve({data: {}}));
  const setOverlayMock = jest.fn();
  await renderAsync(
    <Wrapper mapValue={{setOverlayData: setOverlayMock}}>
      <MapHistoryOverlayPanel />
    </Wrapper>,
  );
  const datePicker = nullthrows(document.getElementById('date'));
  // should be called once at load
  expect(axiosMock).toHaveBeenCalledTimes(1);
  await act(async () => {
    fireEvent.change(datePicker, {target: {value: '10/10/2010'}});
  });
  // and once after date change
  expect(axiosMock).toHaveBeenCalledTimes(2);
  expect(setOverlayMock).toHaveBeenCalled();
});

test('invalid date change does not trigger new api call', async () => {
  const axiosMock = jest
    .spyOn(require('axios'), 'get')
    .mockImplementation(() => Promise.resolve({data: {}}));
  await renderAsync(
    <Wrapper>
      <MapHistoryOverlayPanel />
    </Wrapper>,
  );
  expect(axiosMock).toHaveBeenCalledTimes(1);
  const datePicker = nullthrows(document.getElementById('date'));
  await act(async () => {
    fireEvent.change(datePicker, {target: {value: '2010-10-20'}});
  });
  expect(axiosMock).toHaveBeenCalledTimes(1);
});

test('render with default provider succeeds', async () => {
  const _axiosMock = jest
    .spyOn(require('axios'), 'get')
    .mockImplementation(() => Promise.resolve({data: {}}));
  const {getByTestId} = await renderAsync(
    <TestApp>
      <MuiPickersWrapper>
        <NmsOptionsContextProvider>
          <MapHistoryOverlayPanel />
        </NmsOptionsContextProvider>
      </MuiPickersWrapper>
    </TestApp>,
  );
  expect(getByTestId('map-history-overlay-panel')).toBeInTheDocument();
});

function Wrapper({
  children,
  mapValue,
  optionsValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
  optionsValue?: $Shape<NmsOptionsContextType>,
}) {
  return (
    <TestApp>
      <MuiPickersWrapper>
        <NmsOptionsContextWrapper
          contextValue={{
            networkMapOptions: mockNetworkMapOptions(
              (optionsValue || {}).networkMapOptions,
            ),
          }}>
          <MapContextWrapper contextValue={mapValue}>
            {children}
          </MapContextWrapper>
        </NmsOptionsContextWrapper>
      </MuiPickersWrapper>
    </TestApp>
  );
}
