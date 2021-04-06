/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeSoftwareVersion from '../NodeSoftwareVersion';
import React from 'react';
import {TestApp, renderWithRouter} from '../../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';

afterEach(cleanup);

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
