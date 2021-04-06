/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders with just children', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskGroup>test</ConfigTaskGroup>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders title', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskGroup title={'title'}>test</ConfigTaskGroup>
    </TestApp>,
  );
  expect(getByText('title')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
});

test('renders description', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskGroup description={'description'}>test</ConfigTaskGroup>
    </TestApp>,
  );
  expect(getByText('description')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
});
