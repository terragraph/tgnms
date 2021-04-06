/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import DefaultRouteHistoryPanel from '../DefaultRouteHistoryPanel';
import nullthrows from '@fbcnms/util/nullthrows';
import {
  MuiPickersWrapper,
  NetworkContextWrapper,
  RoutesContextWrapper,
  TestApp,
  mockNetworkConfig,
  mockPanelControl,
  renderAsync,
} from '../../../tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';
import {
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

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

test('renders loading circle initially without crashing', () => {
  const {getByTestId, getByText} = render(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Default Routes')).toBeInTheDocument();
  expect(getByTestId('loadingCircle')).toBeInTheDocument();
});

test('renders date picker', () => {
  const {getByText} = render(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Date')).toBeInTheDocument();
  expect(document.getElementById('date')).toBeInTheDocument();
});

test('renders routes when the query returns routes', async () => {
  const {getByText} = await renderAsync(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Route 3')).toBeInTheDocument();
  expect(
    getByText('0.139% of the time - 4 wireless hop(s)'),
  ).toBeInTheDocument();
});

test('clicking a route calls the map function properly', async () => {
  const {getByText} = await renderAsync(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  fireEvent.click(getByText('Route 3'));
  expect(getByText('Route 3')).toBeInTheDocument();
});

test('date change triggers new api call', async () => {
  const {getByText} = await renderAsync(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Route 2')).toBeInTheDocument();
  const datePicker = nullthrows(document.getElementById('date'));
  fireEvent.change(datePicker, {target: {value: '10/10/2010'}});
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(5);
});

test('invalid date change does not trigger new api call', async () => {
  const {getByText} = await renderAsync(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('Route 2')).toBeInTheDocument();
  const datePicker = nullthrows(document.getElementById('date'));
  fireEvent.change(datePicker, {target: {value: '2010-10-20'}});
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(3);
});

test('renders error statement when there are no routes', async () => {
  getDefaultRouteHistoryMock.mockImplementation(() =>
    Promise.resolve(undefined),
  );
  const {getByTestId} = await renderAsync(
    <Wrapper>
      <DefaultRouteHistoryPanel {...defaultProps} />
    </Wrapper>,
  );
  expect(getByTestId('noRoutes')).toBeInTheDocument();
  expect(apiServiceRequestMock).toHaveBeenCalled();
  expect(getDefaultRouteHistoryMock).toHaveBeenCalled();
});

function Wrapper({children}: {children: React.Node}) {
  return (
    <TestApp>
      <MuiPickersWrapper>
        <RoutesContextWrapper
          contextValue={{
            node: 'test_node_name',
            links: {test: 0},
            onUpdateRoutes: jest.fn(() => {}),
          }}>
          <NetworkContextWrapper
            contextValue={{
              networkName: 'test',
              nodeMap: testNodeMap(),
              siteToNodesMap: {test: new Set(['test_node_name'])},
              networkConfig: mockNetworkConfig(),
            }}>
            {children}
          </NetworkContextWrapper>
        </RoutesContextWrapper>
      </MuiPickersWrapper>
    </TestApp>
  );
}
