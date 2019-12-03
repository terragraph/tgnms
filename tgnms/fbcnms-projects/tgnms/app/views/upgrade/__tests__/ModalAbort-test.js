/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as serviceApiUtil from '../../../apiutils/ServiceAPIUtil';
import ModalAbort from '../ModalAbort';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {
  cleanup,
  fireEvent,
  render,
  wait,
  waitForElement,
} from '@testing-library/react';
import {mockUpgradeReqData} from '../../../tests/data/Upgrade';

const apiServiceRequestMock = jest
  .spyOn(serviceApiUtil, 'apiServiceRequest')
  .mockImplementation(() => Promise.resolve());

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

const defaultProps = {
  networkName: 'testNetwork',
  upgradeRequests: [],
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalAbort {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
});

test('opens without crashing', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalAbort {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Abort Upgrade'));
  await waitForElement(() => getByText('Abort Upgrade Requests'));
  expect(getByText('Abort Upgrade Requests')).toBeInTheDocument();
});

test('closes', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ModalAbort {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Abort Upgrade'));
  await waitForElement(() => getByText('Abort Upgrade Requests'));
  fireEvent.click(getByText('Close'));
  await wait(() => {
    expect(queryByText('Abort Upgrade Requests')).not.toBeInTheDocument();
  });
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
});

test('abort button disabled if no image is defined', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalAbort {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Abort Upgrade'));
  await waitForElement(() => getByText('Abort Upgrade Requests'));
  fireEvent.click(getByText('Abort'));
  expect(apiServiceRequestMock).not.toHaveBeenCalled();
});

test('abort disabled if no image is selected', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalAbort {...defaultProps} upgradeRequests={[mockUpgradeReqData()]} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Abort Upgrade'));
  await waitForElement(() => getByText('Abort Upgrade Requests'));
  fireEvent.click(getByText('Abort'));
  expect(apiServiceRequestMock).not.toHaveBeenCalled();
});

test('abort success', async () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <ModalAbort {...defaultProps} upgradeRequests={[mockUpgradeReqData()]} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Abort Upgrade'));
  await waitForElement(() => getByText('Abort Upgrade Requests'));
  fireEvent.click(getByTestId('selectAllBox').childNodes[0].childNodes[0]);
  fireEvent.click(getByText('Abort'));
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(1);
  expect(apiServiceRequestMock).toHaveBeenLastCalledWith(
    'testNetwork',
    'abortUpgrade',
    {abortAll: true, reqIds: []},
  );
  expect(getByText('Abort Upgrade(s) Success')).toBeInTheDocument();
});

test('abort fail', async () => {
  apiServiceRequestMock.mockImplementation(() => Promise.reject('error'));

  const {getByText, getByTestId} = render(
    <TestApp>
      <ModalAbort {...defaultProps} upgradeRequests={[mockUpgradeReqData()]} />
    </TestApp>,
  );
  expect(getByText('Abort Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Abort Upgrade'));
  await waitForElement(() => getByText('Abort Upgrade Requests'));
  fireEvent.click(getByTestId('selectAllBox').childNodes[0].childNodes[0]);
  fireEvent.click(getByText('Abort'));
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(1);
  await waitForElement(() => getByText('Abort Upgrade Failed'));
  expect(getByText('Abort Upgrade Failed')).toBeInTheDocument();
});
