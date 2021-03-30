/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import * as React from 'react';
import NetworkListContext from '../../contexts/NetworkListContext';
import {Link} from 'react-router-dom';

export type Props = {
  children?: React.Node,
  component?: string | React.ComponentType<any>,
  linkName: string,
};

export default function DashboardLink({
  children,
  component,
  linkName,
  ...props
}: Props) {
  const networkListContext = React.useContext(NetworkListContext);
  const networkName = networkListContext.getNetworkName() || '';
  const path = buildDashboardPath(networkName, linkName);
  return (
    <Link to={path}>
      {component ? <component {...props}>{children}</component> : children}
    </Link>
  );
}

export const buildDashboardPath = (networkName: string, linkName: string) => {
  const baseUrl = new URL(`/dashboards/${networkName}`, window.location.origin);
  baseUrl.searchParams.append('linkName', linkName);
  return baseUrl.pathname + baseUrl.search;
};
