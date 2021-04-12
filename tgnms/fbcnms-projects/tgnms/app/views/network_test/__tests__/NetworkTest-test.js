/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as networkTestAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import NetworkTest from '../NetworkTest';
import {
  SnackbarWrapper,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, render} from '@testing-library/react';

const getExecutionsMock = jest
  .spyOn(networkTestAPIUtil, 'getExecutions')
  .mockImplementation(() => Promise.resolve([]));

const getTestScheduleMock = jest
  .spyOn(networkTestAPIUtil, 'getSchedules')
  .mockImplementation(() => Promise.resolve([]));

jest.mock('react-router', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const defaultProps = {
  createTestUrl: jest.fn(),
};

test('renders without crashing', async () => {
  await act(async () => {
    const {getByText} = render(
      <Wrapper>
        <NetworkTest {...defaultProps} />
      </Wrapper>,
    );
    expect(getByText('Type')).toBeInTheDocument();
    expect(getByText('Schedule Network Test')).toBeInTheDocument();
  });
});

test('renders loading initially', async () => {
  await act(async () => {
    const {getByTestId} = render(
      <Wrapper>
        <NetworkTest {...defaultProps} />
      </Wrapper>,
    );
    expect(getByTestId('loading-box')).toBeInTheDocument();
  });
});

test('renders table after loading', async () => {
  await act(async () => {
    const {queryByTestId} = await renderAsync(
      <Wrapper>
        <NetworkTest {...defaultProps} />
      </Wrapper>,
    );
    expect(getExecutionsMock).toHaveBeenCalled();
    expect(getTestScheduleMock).toHaveBeenCalled();
    expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  });
});

function Wrapper({children}: {children: React.Node}) {
  return (
    <SnackbarWrapper>
      <MaterialTheme>{children}</MaterialTheme>
    </SnackbarWrapper>
  );
}
