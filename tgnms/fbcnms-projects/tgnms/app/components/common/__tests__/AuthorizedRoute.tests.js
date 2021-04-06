/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import AuthorizedRoute from '../AuthorizedRoute';
import React from 'react';
import {Permissions} from '../../../../shared/auth/Permissions';
import {Route} from 'react-router-dom';

import {
  initWindowConfig,
  renderWithRouter,
  setTestUser,
} from '../../../tests/testHelpers';
import {withStyles} from '@material-ui/core';

beforeEach(() => {
  initWindowConfig({
    featureFlags: {
      LOGIN_ENABLED: true,
    },
  });
});

test('If login is disabled, show protected route', () => {
  initWindowConfig({
    featureFlags: {
      LOGIN_ENABLED: false,
    },
  });
  const {getByText, queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}
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
        permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}
        render={() => <span>should NOT be visible</span>}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should NOT be visible')).not.toBeInTheDocument();
  expect(mockRedirect).toHaveBeenCalled();
});

test('If user has some of the required roles, allow', () => {
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions['TOPOLOGY_WRITE']],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}
        render={() => <span>should be visible</span>}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should be visible')).toBeInTheDocument();
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('If user has all of the required roles, show protected route', () => {
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions['TOPOLOGY_WRITE'], Permissions['TOPOLOGY_READ']],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}
        render={() => <span>should be visible</span>}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should be visible')).toBeInTheDocument();
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('works with Route component prop', () => {
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions['TOPOLOGY_WRITE'], Permissions['TOPOLOGY_READ']],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}
        component={MockComponent}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should be visible')).toBeInTheDocument();
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('works with Route component prop (withStyles)', () => {
  // test for a fix when using the component prop with the withStyles HOC
  const mockRedirect = jest.fn();
  setTestUser({
    id: '1234',
    name: 'test',
    email: '',
    roles: [Permissions['TOPOLOGY_WRITE'], Permissions['TOPOLOGY_READ']],
  });
  const {queryByText} = renderWithRouter(
    <>
      <AuthorizedRoute
        path="/testpath"
        permissions={['TOPOLOGY_READ', 'TOPOLOGY_WRITE']}
        component={StyledComponent}
        __testRedirect={mockRedirect}
      />
    </>,
    {route: '/testpath'},
  );
  expect(queryByText('should be visible')).toBeInTheDocument();
  expect(mockRedirect).not.toHaveBeenCalled();
});

class MockComponent extends React.Component<{}> {
  render() {
    return <span>should be visible</span>;
  }
}

const StyledComponent = withStyles(() => ({root: {backgroundColor: 'blue'}}))(
  MockComponent,
);
