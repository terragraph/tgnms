/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import React from 'react';
import UpgradeOperationsToolbar from '../UpgradeOperationsToolbar';
import {TestApp, initWindowConfig} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockUpgradeReqData} from '../../../tests/data/Upgrade';

jest.useFakeTimers();
jest.mock('axios');
jest.mock('copy-to-clipboard');

beforeEach(() => {
  initWindowConfig();
});

afterEach(cleanup);

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
