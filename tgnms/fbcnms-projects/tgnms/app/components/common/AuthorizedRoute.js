/**
 * Protect react-router route using permissions, redirect if user does not have
 * ALL of the required permissions
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {Permission} from '../../../shared/auth/Permissions';
import * as React from 'react';
import {Route} from 'react-router-dom';
import {Permissions} from '../../../shared/auth/Permissions';
import {isAuthorized} from '../../helpers/UserHelpers';

export type Props = {
  permissions: Permission | Array<Permission>,
  // use this to unit test whether a redirect occurs
  __testRedirect?: () => any,
  ...React.ElementConfig<typeof Route>,
};

export default function AuthorizedRoute(props: Props) {
  const {
    permissions,
    component,
    render,
    children,
    __testRedirect,
    ...routeProps
  } = props;
  // convert string to array
  const _permissions =
    typeof permissions === 'string' ? [permissions] : permissions;
  const authorized = React.useMemo(
    () => isAuthorized(permissions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    _permissions,
  );

  const redirect =
    typeof __testRedirect === 'undefined'
      ? () => <AuthRedirect permissions={permissions} />
      : __testRedirect;

  const renderProps = {};
  // Keep the same api as Route but wrap with authorization
  if (typeof component === 'function') {
    renderProps.component = authorized ? component : redirect;
  }
  if (typeof render === 'function') {
    renderProps.render = authorized ? render : redirect;
  }
  if (typeof children === 'function') {
    renderProps.children = authorized ? children : redirect;
  }

  return <Route {...routeProps} {...renderProps} />;
}

function AuthRedirect({permissions}) {
  const errorMessage = encodeURIComponent(
    `Permission denied. Please login as a user with the following roles: ${[]
      .concat(permissions)
      .map(permission => Permissions[permission])
      .join()}`,
  );
  /**
   * Use window.location instead of a react-router redirect because
   * the login page is actually a whole separate bundle / ssr page. It's not
   * part of the clientside routing scheme.
   **/
  window.location = `/user/login?errorMessage=${errorMessage}`;
  return null;
}
