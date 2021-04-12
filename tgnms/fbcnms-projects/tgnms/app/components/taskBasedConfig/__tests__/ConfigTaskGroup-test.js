/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

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
