/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import NodeSoftwareVersion from '../NodeSoftwareVersion';
import React from 'react';
import {TestApp, renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

const defaultProps = {
  version: 'Facebook Terragraph Release RELEASE_M43_PRE-77-g4044506c6-ljoswiak',
};

test('renders empty without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeSoftwareVersion version="" />,
    </TestApp>,
  );
  expect(getByText(',')).toBeInTheDocument();
});

test('renders with props', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeSoftwareVersion {...defaultProps} />,
    </TestApp>,
  );
  expect(getByText('Software Version')).toBeInTheDocument();
  expect(getByText('M43_PRE-77-g4044506c6-ljoswiak')).toBeInTheDocument();
});
