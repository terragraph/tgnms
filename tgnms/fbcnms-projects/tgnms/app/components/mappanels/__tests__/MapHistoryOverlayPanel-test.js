/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import MapHistoryOverlayPanel from '../MapHistoryOverlayPanel';
import React from 'react';
import {HistoricalMetricsOverlayStrategy} from '../../../views/map/overlays';
import {MuiPickersWrapper, renderAsync} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

const overlay = new HistoricalMetricsOverlayStrategy();

const defaultProps = {
  overlaysConfig: overlay.getOverlaysConfig(),
  selectedOverlays: overlay.getDefaultOverlays(),
  onHistoricalTimeChange: jest.fn(),
  onHistoricalDateChange: jest.fn(),
  onOverlaySelectChange: jest.fn(),
  overlayLoading: false,
  date: new Date(),
  selectedTime: new Date(),
};

test('renders loading without crashing', () => {
  const {getByTestId} = render(
    <MuiPickersWrapper>
      <MapHistoryOverlayPanel {...defaultProps} overlayLoading={true} />
    </MuiPickersWrapper>,
  );
  expect(getByTestId('loadingCircle')).toBeInTheDocument();
});

test('renders after loading without crashing', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlayPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Current Value:')).toBeInTheDocument();
  expect(getByText('Link Lines Overlay')).toBeInTheDocument();
  expect(getByText('Online')).toBeInTheDocument();
});

test('date change triggers new api call', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlayPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Online')).toBeInTheDocument();
  const datePicker = document.getElementById('date');
  fireEvent.change(datePicker, {target: {value: '10/10/2010'}});
  expect(defaultProps.onHistoricalDateChange).toHaveBeenCalledTimes(1);
});

test('invalid date change does not trigger new api call', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlayPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Online')).toBeInTheDocument();
  const datePicker = document.getElementById('date');
  fireEvent.change(datePicker, {target: {value: '2010-10-20'}});
  expect(defaultProps.onHistoricalDateChange).not.toHaveBeenCalled();
});

test('selecting a new metric causes map update', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <MapHistoryOverlayPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Link Lines Overlay')).toBeInTheDocument();
  expect(getByText('Online')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('Online'));
  fireEvent.click(getByText('SNR'));
  expect(defaultProps.onOverlaySelectChange).toHaveBeenCalled();
});
