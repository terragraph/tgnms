/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ViewDrawer from '../ViewDrawer';
import {
  TestApp,
  initWindowConfig,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

beforeEach(() => {
  initWindowConfig();
});

const defaultProps = {
  drawerOpen: true,
};

describe('Drawer feature flags', () => {
  test('renders while open', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <ViewDrawer {...defaultProps} />
      </TestApp>,
    );
    expect(getByText('Map')).toBeInTheDocument();
  });

  test('renders while closed', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <ViewDrawer drawerOpen={false} />
      </TestApp>,
    );
    expect(getByText('Map')).toBeInTheDocument();
  });

  test('does not render things not defined by featureflag', () => {
    const {queryByText} = renderWithRouter(
      <TestApp>
        <ViewDrawer {...defaultProps} />
      </TestApp>,
    );
    expect(queryByText('Troubleshooting')).not.toBeInTheDocument();
  });

  test('renders options when enabled by featureflag', () => {
    initWindowConfig({
      featureFlags: {
        TROUBLESHOOTING_ENABLED: true,
      },
    });
    const {getByText} = renderWithRouter(
      <TestApp>
        <ViewDrawer {...defaultProps} />
      </TestApp>,
    );
    expect(getByText('Troubleshooting')).toBeInTheDocument();
  });

  test('does not renders options when disabled by featureflag', () => {
    initWindowConfig({
      featureFlags: {
        TROUBLESHOOTING_ENABLED: false,
      },
    });
    const {queryByText} = renderWithRouter(
      <TestApp>
        <ViewDrawer {...defaultProps} />
      </TestApp>,
    );
    expect(queryByText('Troubleshooting')).not.toBeInTheDocument();
  });
});
