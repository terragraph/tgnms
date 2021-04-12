/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import UpgradeOperationsToolbar from '../UpgradeOperationsToolbar';
import {TestApp, initWindowConfig} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockUpgradeReqData} from '@fbcnms/tg-nms/app/tests/data/Upgrade';
import {render} from '@testing-library/react';

jest.useFakeTimers();
jest.mock('axios');
jest.mock('copy-to-clipboard');

beforeEach(() => {
  initWindowConfig();
});

const defaultProps = {
  currentRequest: mockUpgradeReqData(),
  pendingRequests: [],
  networkName: 'testNetwork',
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <UpgradeOperationsToolbar {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Current Request:')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
});
