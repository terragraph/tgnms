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
import InfoMenu from '../InfoMenu';
import {
  TestApp,
  initWindowConfig,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig();
});

const defaultProps = {
  drawerOpen: false,
};

describe('About modal', () => {
  test('renders about modal when commit vars set', () => {
    initWindowConfig({
      env: {
        COMMIT_DATE: '2020.01.01',
        COMMIT_HASH: 'fdfdsfsdff',
      },
    });
    const {getByText, getByTestId, queryByTestId} = renderWithRouter(
      <TestApp>
        <InfoMenu {...defaultProps} />
      </TestApp>,
    );
    expect(getByText('Help')).toBeInTheDocument();
    expect(queryByTestId('about-modal')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-help-menu'));
    fireEvent.click(getByTestId('toggle-about-modal'));
    expect(queryByTestId('about-modal')).toBeInTheDocument();
  });

  test('does not render about modal when commit vars not set', () => {
    const {getByTestId, queryByTestId} = renderWithRouter(
      <TestApp>
        <InfoMenu {...defaultProps} />
      </TestApp>,
    );
    fireEvent.click(getByTestId('toggle-help-menu'));
    expect(queryByTestId('about-modal')).not.toBeInTheDocument();
  });
});
