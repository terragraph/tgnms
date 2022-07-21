/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

/*
 * Show / hide individual components based on user permissions.
 */

import * as React from 'react';
import {isAuthorized} from '@fbcnms/tg-nms/app/helpers/UserHelpers';
import type {Permission} from '@fbcnms/tg-nms/shared/auth/Permissions';

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
