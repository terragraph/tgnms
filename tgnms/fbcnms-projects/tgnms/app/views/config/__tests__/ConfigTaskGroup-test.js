/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders with just children', () => {
  const {getByText} = render(<ConfigTaskGroup>test</ConfigTaskGroup>);
  expect(getByText('test')).toBeInTheDocument();
});

test('renders title', () => {
  const {getByText} = render(
    <ConfigTaskGroup title={'title'}>test</ConfigTaskGroup>,
  );
  expect(getByText('title')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
});

test('renders description', () => {
  const {getByText} = render(
    <ConfigTaskGroup description={'description'}>test</ConfigTaskGroup>,
  );
  expect(getByText('description')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
});
