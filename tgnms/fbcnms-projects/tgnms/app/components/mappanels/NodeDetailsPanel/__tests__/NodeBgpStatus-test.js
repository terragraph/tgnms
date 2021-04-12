/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeBgpStatus from '../NodeBgpStatus';
import React from 'react';
import {TestApp, renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

const ipAddress = '2620:10d:c089:ee06::1';
const defaultProps = {
  bgpStatus: {
    [ipAddress]: {
      ipv6Address: 'testAddress',
      online: true,
      asn: 1,
      upDownTime: 'testDownTime',
      stateOrPfxRcd: 'testState',
      advertisedRoutes: [],
      receivedRoutes: [],
    },
  },
};

test('renders empty without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeBgpStatus {...defaultProps} bgpStatus={{}} />,
    </TestApp>,
  );
  expect(getByText('BGP Neighbors')).toBeInTheDocument();
});

test('renders with bgpStatus', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeBgpStatus {...defaultProps} />
    </TestApp>,
  );
  expect(getByText(ipAddress)).toBeInTheDocument();
  expect(getByText('testDownTime')).toBeInTheDocument();
  expect(getByText('testState')).toBeInTheDocument();
});
