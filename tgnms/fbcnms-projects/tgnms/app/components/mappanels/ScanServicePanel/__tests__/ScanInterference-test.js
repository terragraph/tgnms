/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import React from 'react';
import ScanInterference from '../ScanInterference';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  onBack: jest.fn(),
  results: [],
};

test('renders', () => {
  const {getByText} = render(<ScanInterference {...defaultProps} />);
  expect(getByText('Interference')).toBeInTheDocument();
});
