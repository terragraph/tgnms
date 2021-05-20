/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
    expect(getByText('About')).toBeInTheDocument();
    expect(queryByTestId('about-modal')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-about-modal'));
    expect(queryByTestId('about-modal')).toBeInTheDocument();
  });

  test('does not render about modal when commit vars not set', () => {
    const {queryByText} = renderWithRouter(
      <TestApp>
        <InfoMenu {...defaultProps} />
      </TestApp>,
    );
    expect(queryByText('About')).not.toBeInTheDocument();
  });
});
