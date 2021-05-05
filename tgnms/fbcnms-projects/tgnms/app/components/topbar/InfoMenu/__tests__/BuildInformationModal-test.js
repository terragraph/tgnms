/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import BuildInformationModal from '../BuildInformationModal';
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
  buildInformationOpen: true,
  toggleBuildModal: jest.fn(),
  version: 'testVersion',
  commitDate: 'date',
  commitHash: 'hash',
};

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <BuildInformationModal {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('About')).toBeInTheDocument();
});

describe('About modal', () => {
  test('close calls toggleBuildModal', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <BuildInformationModal {...defaultProps} />
      </TestApp>,
    );
    expect(getByText('Close')).toBeInTheDocument();
    fireEvent.click(getByText('Close'));
    expect(defaultProps.toggleBuildModal).toHaveBeenCalled();
  });

  test('renders submit bug when ISSUES_URL is set', () => {
    initWindowConfig({
      env: {
        ISSUES_URL: 'x',
      },
    });
    const {getByText} = renderWithRouter(
      <TestApp>
        <BuildInformationModal {...defaultProps} />
      </TestApp>,
    );
    expect(getByText('Submit Bug')).toBeInTheDocument();
  });
});
