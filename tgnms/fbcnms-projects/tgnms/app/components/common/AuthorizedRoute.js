/**
 * Protect react-router route using permissions, redirect if user does not have
 * ALL of the required permissions
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {Permissions} from '@fbcnms/tg-nms/shared/auth/Permissions';
import {Route} from 'react-router-dom';
import {isAuthorized} from '@fbcnms/tg-nms/app/helpers/UserHelpers';
import type {Permission} from '@fbcnms/tg-nms/shared/auth/Permissions';

export type Props = {|
  permissions: Permission | Array<Permission>,
  // use this to unit test whether a redirect occurs
  __testRedirect?: any,
  ...React.ElementConfig<typeof Route>,
|};

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

  // Keep the same api as Route but wrap with authorization
  let componentProp = undefined;
  if (typeof component !== 'undefined') {
    componentProp = authorized ? component : redirect;
  }
  let renderProp = undefined;
  if (typeof render !== 'undefined') {
    renderProp = authorized ? render : redirect;
  }
  let childrenProp = undefined;
  if (typeof children !== 'undefined') {
    childrenProp = authorized ? children : redirect;
  }

  return (
    <Route
      {...routeProps}
      component={componentProp}
      render={renderProp}
      children={childrenProp}
    />
  );
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
