/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import MapHistoryOverlay from '../MapHistoryOverlay';
import React from 'react';
import {HistoricalLinkMetricsOverlayStrategy} from '../../../views/map/overlays';
import {MuiPickersWrapper, renderAsync} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

import * as prometheusAPIUtil from '../../../apiutils/PrometheusAPIUtil';

const queryDataArrayMock = jest
  .spyOn(prometheusAPIUtil, 'queryDataArray')
  .mockImplementation(() => Promise.resolve({data: {}}));

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

const defaultProps = {
  overlayConfig: {
    layerId: 'test_layer',
    overlays: new HistoricalLinkMetricsOverlayStrategy().getOverlays(),
    changeOverlayRange: jest.fn(),
    legend: {},
  },
  networkName: 'testNetwork',
  onUpdateMap: jest.fn(),
  expanded: false,
  onPanelChange: jest.fn(),
  siteToNodesMap: {},
};

test('renders loading without crashing', () => {
  const {getByTestId} = render(
    <MuiPickersWrapper>
      <MapHistoryOverlay {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByTestId('loadingCircle')).toBeInTheDocument();
});

test('renders after loading without crashing', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlay {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Current Value:')).toBeInTheDocument();
  expect(getByText('Link Lines Overlay')).toBeInTheDocument();
  expect(getByText('Online')).toBeInTheDocument();
});

test('date change triggers new api call', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlay {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Online')).toBeInTheDocument();
  const datePicker = document.getElementById('date');
  fireEvent.change(datePicker, {target: {value: '10/10/2010'}});
  expect(queryDataArrayMock).toHaveBeenCalledTimes(2);
});

test('invalid date change does not trigger new api call', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlay {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Online')).toBeInTheDocument();
  const datePicker = document.getElementById('date');
  fireEvent.change(datePicker, {target: {value: '2010-10-20'}});
  expect(queryDataArrayMock).toHaveBeenCalledTimes(1);
});

test('selecting a new metric causes map update', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlay {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Link Lines Overlay')).toBeInTheDocument();
  expect(getByText('Online')).toBeInTheDocument();
  fireEvent.click(getByText('Online'));
  fireEvent.click(getByText('SNR'));
  expect(defaultProps.onUpdateMap).toHaveBeenCalled();
});

test('api request fails and error message shows', async () => {
  queryDataArrayMock.mockImplementation(() =>
    Promise.reject({message: 'error'}),
  );
  const {getByTestId} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlay {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(queryDataArrayMock).toHaveBeenCalled();
  expect(getByTestId('errorMessage')).toBeInTheDocument();
});
