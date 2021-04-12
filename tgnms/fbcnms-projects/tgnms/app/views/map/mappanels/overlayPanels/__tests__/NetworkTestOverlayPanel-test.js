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
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  MuiPickersWrapper,
  TestApp,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {mockNetworkMapOptions} from '@fbcnms/tg-nms/app/tests/data/NmsOptionsContext';

import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {NmsOptionsContextType} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';

jest.mock('axios');

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
