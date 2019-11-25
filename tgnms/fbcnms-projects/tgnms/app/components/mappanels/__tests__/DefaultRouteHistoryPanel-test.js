/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import DefaultRouteHistoryPanel from '../DefaultRouteHistoryPanel';
import React from 'react';
import {
  MuiPickersWrapper,
  mockNode,
  mockTopology,
  renderAsync,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {
  expectedOnUpdateRouteCall,
  testDefaultRouteHistory,
  testNodeMap,
} from '../../../tests/data/DefaultRouteHistory';

import * as defaultRouteApiUtil from '../../../apiutils/DefaultRouteHistoryAPIUtil';
import * as serviceApiUtil from '../../../apiutils/ServiceAPIUtil';

const apiServiceRequestMock = jest
  .spyOn(serviceApiUtil, 'apiServiceRequest')
  .mockImplementation(() =>
    Promise.resolve({data: {defaultRoutes: {test_node_name: {}}}}),
  );

const getDefaultRouteHistoryMock = jest
  .spyOn(defaultRouteApiUtil, 'getDefaultRouteHistory')
  .mockImplementation(() => Promise.resolve(testDefaultRouteHistory()));

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

const defaultProps = {
  networkName: 'test',
  topology: mockTopology(),
  node: mockNode(),
  nodeMap: testNodeMap(),
  site: {
    name: 'test',
    location: {latitude: 0, longitude: 0, altitude: 0, accuracy: 0},
  },
  onClose: jest.fn(() => {}),
  links: {test: 0},
  onUpdateRoutes: jest.fn(() => {}),
  routes: {
    node: 'test_node_name',
  },
  siteNodes: new Set(['test_node_name']),
};

test('renders loading circle initially without crashing', async () => {
  const {getByTestId, getByText} = render(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('test_node_name')).toBeInTheDocument();
  expect(getByTestId('loadingCircle')).toBeInTheDocument();
});

test('renders date picker', () => {
  const {getByText} = render(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Date')).toBeInTheDocument();
  expect(document.getElementById('date')).toBeInTheDocument();
});

test('renders error statement when there are no routes', async () => {
  getDefaultRouteHistoryMock.mockImplementationOnce(() =>
    Promise.resolve(undefined),
  );
  const {getByTestId, getByText} = await renderAsync(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('test_node_name')).toBeInTheDocument();
  expect(getByTestId('noRoutes')).toBeInTheDocument();
  expect(apiServiceRequestMock).toHaveBeenCalled();
  expect(getDefaultRouteHistoryMock).toHaveBeenCalled();
});

test('renders routes when the query returns routes', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Route 3')).toBeInTheDocument();
  expect(getByText('0.4% of the time - 5 hops')).toBeInTheDocument();
});

test('clicking a route calls the map function properly', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  fireEvent.click(getByText('Route 3'));
  expect(getByText('Route 3')).toBeInTheDocument();
  expect(defaultProps.onUpdateRoutes).toHaveBeenCalledWith(
    expectedOnUpdateRouteCall(),
  );
});

test('date change triggers new api call', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Route 2')).toBeInTheDocument();
  const datePicker = document.getElementById('date');
  fireEvent.change(datePicker, {target: {value: '10/10/2010'}});
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(2);
});

test('invalid date change does not trigger new api call', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Route 2')).toBeInTheDocument();
  const datePicker = document.getElementById('date');
  fireEvent.change(datePicker, {target: {value: '2010-10-20'}});
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(1);
});
