/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ModalFullUpgrade from '../ModalFullUpgrade';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {TestApp} from '../../../tests/testHelpers';
import {
  act,
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
  controllerVersion: {major: 1, minor: 0},
  excluded: [],
  selected: ['testNode'],
  networkName: 'Tower C',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalFullUpgrade {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Upgrade')).toBeInTheDocument();
});

test('opens without crashing', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalFullUpgrade {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Full Upgrade'));
  await waitForElement(() => getByText('Full Upgrade Nodes'));
  expect(getByText('Full Upgrade Nodes')).toBeInTheDocument();
});

test('closes', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ModalFullUpgrade {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Full Upgrade'));
  await waitForElement(() => getByText('Nodes for upgrade:'));
  fireEvent.click(getByText('Cancel'));
  await wait(() => {
    expect(queryByText('Nodes for upgrade:')).not.toBeInTheDocument();
  });
  expect(getByText('Full Upgrade')).toBeInTheDocument();
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
      <ModalFullUpgrade {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Full Upgrade'));
  await waitForElement(() => getByText('Nodes for upgrade:'));
  const selectedImageInput = nullthrows(
    document.getElementById('imageSelector'),
  );
  fireEvent.click(selectedImageInput);
  fireEvent.keyDown(selectedImageInput, {key: 'ArrowDown', code: 40});
  fireEvent.keyDown(selectedImageInput, {key: 'Enter', code: 13});
  await act(async () => {
    fireEvent.click(getByText('Submit'));
  });
  await waitForElement(() => getByText('Full Upgrade Submitted'));
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(2);
  expect(apiServiceRequestMock).toHaveBeenLastCalledWith(
    'Tower C',
    'sendUpgradeRequest',
    {
      excludeNodes: [],
      limit: 0,
      nodes: [],
      retryLimit: 3,
      skipFailure: true,
      skipLinks: [],
      skipPopFailure: false,
      timeout: 180,
      ugType: 20,
      urReq: {
        scheduleToCommit: 0,
        upgradeReqId: 'NMS1557831718135.2',
        urType: 20,
      },
      version: '',
    },
  );
  expect(getByText('Full Upgrade Submitted')).toBeInTheDocument();
});

test('submit fail', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.reject());
  const {getByText} = render(
    <TestApp>
      <ModalFullUpgrade {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Upgrade')).toBeInTheDocument();
  fireEvent.click(getByText('Full Upgrade'));
  await waitForElement(() => getByText('Nodes for upgrade:'));
  const selectedImageInput = nullthrows(
    document.getElementById('imageSelector'),
  );
  fireEvent.click(selectedImageInput);
  fireEvent.keyDown(selectedImageInput, {key: 'ArrowDown', code: 40});
  fireEvent.keyDown(selectedImageInput, {key: 'Enter', code: 13});
  await act(async () => {
    fireEvent.click(getByText('Submit'));
  });
  await waitForElement(() => getByText('Full Upgrade Failed'));
  expect(getByText('Full Upgrade Failed')).toBeInTheDocument();
});
