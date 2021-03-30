/**
 * Show / hide individual components based on user permissions.
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as React from 'react';
import {isAuthorized} from '../../helpers/UserHelpers';
import type {Permission} from '../../../shared/auth/Permissions';

export type Props = {
  permissions: Permission | Array<Permission>,
  children: React.Node,
};

function Authorize(props: Props) {
  const {permissions} = props;
  // convert string to array
  const _permissions =
    typeof permissions === 'string' ? [permissions] : permissions;
  const authorized = React.useMemo(
    () => isAuthorized(_permissions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    _permissions,
  );

  if (!authorized) {
    /**
     * for now, we'll just hide it completely. In the future, we may want to
     * implement logic such as greying out with an overlay, or making invisible
     * but still taking up the same amount of space.
     */
    return null;
  }
  return props.children;
}

export default Authorize;
