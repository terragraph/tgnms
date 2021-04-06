/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkTestOverlayPanel from '../NetworkTestOverlayPanel';
import {
  MapContextWrapper,
  NmsOptionsContextWrapper,
} from '../../../../tests/testHelpers';
import {
  MuiPickersWrapper,
  TestApp,
  renderAsync,
} from '../../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';
import {mockNetworkMapOptions} from '../../../../tests/data/NmsOptionsContext';

import type {MapContext} from '../../../../contexts/MapContext';
import type {NmsOptionsContextType} from '../../../../contexts/NmsOptionsContext';

jest.mock('axios');
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

test('renders without crashing', async () => {
  const setOverlaysConfig = jest.fn();
  jest
    .spyOn(require('axios'), 'get')
    .mockImplementation(() => Promise.resolve({data: {}}));
  expect(setOverlaysConfig).not.toHaveBeenCalled();
  await renderAsync(
    <Wrapper mapValue={{setOverlaysConfig}}>
      <NetworkTestOverlayPanel />
    </Wrapper>,
  );
  expect(setOverlaysConfig).toHaveBeenCalled();
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
