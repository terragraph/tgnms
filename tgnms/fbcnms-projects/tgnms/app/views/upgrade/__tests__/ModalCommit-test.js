/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import ModalCommit from '../ModalCommit';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {
  cleanup,
  fireEvent,
  render,
  wait,
  waitForElement,
} from '@testing-library/react';

import * as serviceApiUtil from '../../../apiutils/ServiceAPIUtil';
import * as upgradeHelpers from '../../../helpers/UpgradeHelpers';

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

afterEach(cleanup);

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
  await waitForElement(() => getByText('Commit Nodes'));
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
  await waitForElement(() => getByText('Nodes to commit for upgrade:'));
  fireEvent.click(getByText('Cancel'));
  await wait(() => {
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
  await waitForElement(() => getByText('Nodes to commit for upgrade:'));
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Commit Upgrade Submitted'));
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
  await waitForElement(() => getByText('Nodes to commit for upgrade:'));
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Commit Upgrade Failed'));
  expect(getByText('Commit Upgrade Failed')).toBeInTheDocument();
});
