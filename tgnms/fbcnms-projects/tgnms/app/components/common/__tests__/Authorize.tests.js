/**
 * Show / hide individual components based on user permissions. redirect if user
 * does not have ALL of the required permissions.
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {render, cleanup} from '@testing-library/react';
import 'jest-dom/extend-expect';
import {Permissions} from '../../../../shared/auth/Permissions';
import {initWindowConfig, setTestUser} from '../../../tests/testHelpers';

import Authorize from '../Authorize';

beforeEach(() => {
  initWindowConfig({
    env: {
      LOGIN_ENABLED: true,
    },
  });
});

// automatically unmount and cleanup DOM after the test is finished.
afterEach(cleanup);

test('If login is disabled, allow all', () => {
  initWindowConfig({
    env: {
      LOGIN_ENABLED: false,
    },
  });
  const {getByText} = render(
    <Authorize permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}>
      <span>should be visible</span>
    </Authorize>,
  );
  expect(getByText('should be visible')).toBeInTheDocument();
});

test('If user has no roles, disallow', () => {
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [],
  });
  const {queryByText} = render(
    <Authorize permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}>
      <span>should not be visible</span>
    </Authorize>,
  );

  expect(queryByText('should not be visible')).not.toBeInTheDocument();
});
test('If user has some of the required roles, allow', () => {
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions.TOPOLOGY_READ],
  });
  const {queryByText} = render(
    <Authorize permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}>
      <span>should be visible</span>
    </Authorize>,
  );
  expect(queryByText('should be visible')).toBeInTheDocument();
});

test('If user has all of the required roles, allow', () => {
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions.TOPOLOGY_READ, Permissions.TOPOLOGY_WRITE],
  });
  const {getByText} = render(
    <Authorize permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}>
      <span>should be visible</span>
    </Authorize>,
  );
  expect(getByText('should be visible')).toBeInTheDocument();
});
