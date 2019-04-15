/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';
import 'jest-dom/extend-expect';
import {Route} from 'react-router-dom';
import {cleanup} from 'react-testing-library';
import {
  renderWithRouter,
  setTestUser,
  initWindowConfig,
} from '../../../tests/testHelpers';
import {Permissions} from '../../../../shared/auth/Permissions';
import AuthorizedRoute from '../AuthorizedRoute';

beforeEach(() => {
  initWindowConfig({
    env: {
      LOGIN_ENABLED: true,
    },
  });
});

// automatically unmount and cleanup DOM after the test is finished.
afterEach(cleanup);

test('If login is disabled, show protected route', () => {
  initWindowConfig({
    env: {
      LOGIN_ENABLED: false,
    },
  });
  const {getByText, queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['NODE_READ', 'NODE_WRITE']}
        render={() => <span>should be visible</span>}
      />
      <Route path="/" render={() => <span>should also be visible</span>} />
      <Route
        path="/nomatch"
        render={() => <span>should NOT be visible</span>}
      />
    </>,
    {route: '/testpath'},
  );
  expect(getByText('should be visible')).toBeInTheDocument();
  expect(getByText('should also be visible')).toBeInTheDocument();
  expect(queryByText('should NOT be visible')).not.toBeInTheDocument();
});

test('If user has no roles, redirect', () => {
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['NODE_READ', 'NODE_WRITE']}
        render={() => <span>should NOT be visible</span>}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should NOT be visible')).not.toBeInTheDocument();
  expect(mockRedirect).toHaveBeenCalled();
});

test('If user has some of the required roles, redirect', () => {
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions['NODE_WRITE']],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['NODE_READ', 'NODE_WRITE']}
        render={() => <span>should NOT be visible</span>}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should NOT be visible')).not.toBeInTheDocument();
  expect(mockRedirect).toHaveBeenCalled();
});

test('If user has all of the required roles, show protected route', () => {
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions['NODE_WRITE'], Permissions['NODE_READ']],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['NODE_READ', 'NODE_WRITE']}
        render={() => <span>should be visible</span>}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should be visible')).toBeInTheDocument();
  expect(mockRedirect).not.toHaveBeenCalled();
});
