/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import LinkInterference from '../LinkInterference';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  linkInterference: {
    assetName: 'test',
    interference: [],
    totalINR: 10,
    health: 2,
  },
};

test('renders no interfence if no interfence exists', () => {
  const {getByText} = render(<LinkInterference />);
  expect(getByText('No Interference!')).toBeInTheDocument();
});

test('renders interfence', () => {
  const {getByText} = render(<LinkInterference {...defaultProps} />);
  expect(getByText('test')).toBeInTheDocument();
  expect(getByText('10 dB')).toBeInTheDocument();
});
