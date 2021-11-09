/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ModalCommit from '../ModalCommit';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render, waitFor} from '@testing-library/react';

import * as serviceApiUtil from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import * as upgradeHelpers from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';

const apiServiceRequestMock = jest
  .spyOn(serviceApiUtil, 'apiServiceRequest')
  .mockImplementation(() => Promise.resolve());

jest
  .spyOn(upgradeHelpers, 'fetchUpgradeImages')
  .mockImplementation((networkName, onResponse) =>
    onResponse([
      {
        name: 'testImage',
        magnetUri: 'testImage',
        md5: 'testImage',
        hardwareBoardIds: ['testImage'],
      },
    ]),
  );

const defaultProps = {
  excluded: [],
  selected: ['testNode'],
  networkName: 'Tower C',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalCommit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Commit')).toBeInTheDocument();
});

test('opens without crashing', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalCommit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Commit')).toBeInTheDocument();
  fireEvent.click(getByText('Commit'));
  await waitFor(() => getByText('Commit Nodes'));
  expect(getByText('Commit Nodes')).toBeInTheDocument();
});

test('closes', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ModalCommit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Commit')).toBeInTheDocument();
  fireEvent.click(getByText('Commit'));
  await waitFor(() => getByText('Nodes to commit for upgrade:'));
  fireEvent.click(getByText('Cancel'));
  await waitFor(() => {
    expect(queryByText('Nodes to commit')).not.toBeInTheDocument();
  });
  expect(getByText('Commit')).toBeInTheDocument();
});

test('submit success', async () => {
  const currentDate = new Date('2019-05-14T11:01:58.135Z');
  global.Date = class extends Date {
    constructor(date) {
      if (date) {
        return super(date);
      }
      return currentDate;
    }
  };

  const {getByText} = render(
    <TestApp>
      <ModalCommit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Commit')).toBeInTheDocument();
  fireEvent.click(getByText('Commit'));
  await waitFor(() => getByText('Nodes to commit for upgrade:'));
  fireEvent.click(getByText('Submit'));
  await waitFor(() => getByText('Commit Upgrade Submitted'));
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(1);
  expect(apiServiceRequestMock).toHaveBeenLastCalledWith(
    'Tower C',
    'sendUpgradeRequest',
    {
      excludeNodes: [],
      limit: 0,
      nodes: [],
      retryLimit: 3,
      skipFailure: false,
      skipLinks: [],
      skipPopFailure: false,
      timeout: 180,
      ugType: 20,
      urReq: {
        scheduleToCommit: 0,
        upgradeReqId: 'NMS1557831718135',
        urType: 20,
      },
      version: '',
    },
  );
  expect(getByText('Commit Upgrade Submitted')).toBeInTheDocument();
});

test('submit fail', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.reject());
  const {getByText} = render(
    <TestApp>
      <ModalCommit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Commit')).toBeInTheDocument();
  fireEvent.click(getByText('Commit'));
  await waitFor(() => getByText('Nodes to commit for upgrade:'));
  fireEvent.click(getByText('Submit'));
  await waitFor(() => getByText('Commit Upgrade Failed'));
  expect(getByText('Commit Upgrade Failed')).toBeInTheDocument();
});
