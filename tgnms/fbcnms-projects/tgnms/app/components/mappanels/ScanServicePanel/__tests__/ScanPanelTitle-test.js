/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import React from 'react';
import ScanPanelTitle from '../ScanPanelTitle';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  onBack: jest.fn(),
  startDate: new Date(),
  title: 'Test Title',
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ScanPanelTitle {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Test Title')).toBeInTheDocument();
});
