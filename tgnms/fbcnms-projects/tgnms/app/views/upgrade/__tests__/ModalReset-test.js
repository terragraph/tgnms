/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import ModalReset from '../ModalReset';
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

const apiServiceRequestMock = jest
  .spyOn(serviceApiUtil, 'apiServiceRequest')
  .mockImplementation(() => Promise.resolve());

afterEach(cleanup);

const defaultProps = {
  selected: ['testNode'],
  networkName: 'Tower C',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalReset {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Reset')).toBeInTheDocument();
});

test('opens without crashing', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalReset {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Reset')).toBeInTheDocument();
  fireEvent.click(getByText('Reset'));
  await waitForElement(() => getByText('Reset Upgrade Status'));
  expect(getByText('Reset Upgrade Status')).toBeInTheDocument();
});

test('closes', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ModalReset {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Reset')).toBeInTheDocument();
  fireEvent.click(getByText('Reset'));
  await waitForElement(() => getByText('Reset Upgrade Status'));
  fireEvent.click(getByText('Cancel'));
  await wait(() => {
    expect(queryByText('Reset Upgrade Status')).not.toBeInTheDocument();
  });
  expect(getByText('Reset')).toBeInTheDocument();
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
      <ModalReset {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Reset')).toBeInTheDocument();
  fireEvent.click(getByText('Reset'));
  await waitForElement(() => getByText('Reset Upgrade Status'));
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Reset Status Submitted'));
  expect(apiServiceRequestMock).toHaveBeenCalledTimes(1);
  expect(apiServiceRequestMock).toHaveBeenLastCalledWith(
    'Tower C',
    'sendUpgradeRequest',
    {
      nodes: ['testNode'],
      ugType: 10,
      urReq: {
        upgradeReqId: 'NMS1557831718135',
        urType: 30,
      },
    },
  );
  expect(getByText('Reset Status Submitted')).toBeInTheDocument();
});

test('submit fail', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.reject());
  const {getByText} = render(
    <TestApp>
      <ModalReset {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Reset')).toBeInTheDocument();
  fireEvent.click(getByText('Reset'));
  await waitForElement(() => getByText('Reset Upgrade Status'));
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Reset Status Failed'));
  expect(getByText('Reset Status Failed')).toBeInTheDocument();
});
