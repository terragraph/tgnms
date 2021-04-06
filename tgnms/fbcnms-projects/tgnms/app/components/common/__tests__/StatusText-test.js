/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import StatusText from '../StatusText';
import {render} from '@testing-library/react';

test('renders with null status for unknown', () => {
  const {getByText} = render(<StatusText status={null} />);
  expect(getByText('Unknown')).toBeInTheDocument();
  expect(getByText('Unknown').style.color === 'gray');
});

test('renders with true input', () => {
  const {getByText} = render(<StatusText status={true} />);
  expect(getByText('Online')).toBeInTheDocument();
  expect(getByText('Online').style.color === 'green');
});

test('renders with false input', () => {
  const {getByText} = render(<StatusText status={false} />);
  expect(getByText('Offline')).toBeInTheDocument();
  expect(getByText('Offline').style.color === 'red');
});

test('renders with change to text', () => {
  const {getByText} = render(<StatusText status={true} trueText="true text" />);
  expect(getByText('true text')).toBeInTheDocument();
  expect(getByText('true text').style.color === 'green');
});
