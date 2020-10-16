/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ScanServiceOverlayPanel from '../ScanServiceOverlayPanel';
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
      <ScanServiceOverlayPanel />
    </Wrapper>,
  );
  expect(setOverlaysConfig).toHaveBeenCalled();
});

function Wrapper({
  children,
  mapValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
}) {
  return (
    <TestApp>
      <MuiPickersWrapper>
        <NmsOptionsContextWrapper
          contextValue={{
            networkMapOptions: mockNetworkMapOptions(),
          }}>
          <MapContextWrapper contextValue={mapValue}>
            {children}
          </MapContextWrapper>
        </NmsOptionsContextWrapper>
      </MuiPickersWrapper>
    </TestApp>
  );
}
