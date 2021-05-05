/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import EditLegendButton from '../EditLegendButton';
import {MapContextWrapper, TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const mapContextValue = {
  overlaysConfig: {
    link_lines: {
      layerId: 'link_lines',
      overlays: [
        {
          name: 'mcs',
          type: 'metric',
          id: 'mcs',
          range: [20, 10, 5, 0],
        },
      ],
      legend: {},
    },
  },
  selectedOverlays: {
    link_lines: 'mcs',
    site_icons: 'health',
  },
};

test('Renders legend in container ', async () => {
  const {getByTestId} = await render(
    <TestApp>
      <MapContextWrapper contextValue={mapContextValue}>
        <EditLegendButton />
      </MapContextWrapper>
    </TestApp>,
  );
  expect(getByTestId('edit-legend-button')).toBeInTheDocument();
});

test('Renders legend in container ', async () => {
  const {getByTestId, getByText} = await render(
    <TestApp>
      <MapContextWrapper contextValue={mapContextValue}>
        <EditLegendButton />
      </MapContextWrapper>
    </TestApp>,
  );
  fireEvent.click(getByTestId('edit-legend-button'));
  expect(getByText('Edit Link mcs Display Color Ranges')).toBeInTheDocument();
});

test('Renders legend in container ', async () => {
  const {getByTestId, getByText} = await render(
    <TestApp>
      <MapContextWrapper contextValue={mapContextValue}>
        <EditLegendButton />
      </MapContextWrapper>
    </TestApp>,
  );
  fireEvent.click(getByTestId('edit-legend-button'));
  expect(getByText('Edit Link mcs Display Color Ranges')).toBeInTheDocument();
  expect(getByTestId('modal-open')).toBeInTheDocument();
  fireEvent.click(getByText('Cancel'));
  expect(getByTestId('modal-closed')).toBeInTheDocument();
});

test('Renders legend in container ', async () => {
  const setOverlaysConfig = jest.fn();
  const {getByTestId, getByText} = await render(
    <TestApp>
      <MapContextWrapper contextValue={{...mapContextValue, setOverlaysConfig}}>
        <EditLegendButton />
      </MapContextWrapper>
    </TestApp>,
  );
  fireEvent.click(getByTestId('edit-legend-button'));
  expect(getByText('Edit Link mcs Display Color Ranges')).toBeInTheDocument();
  expect(getByTestId('modal-open')).toBeInTheDocument();
  fireEvent.click(getByText('Done'));
  expect(getByTestId('modal-closed')).toBeInTheDocument();
  expect(setOverlaysConfig).toHaveBeenCalled();
});
