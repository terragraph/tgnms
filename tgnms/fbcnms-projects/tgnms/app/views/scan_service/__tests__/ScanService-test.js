/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as ScanServiceAPIUtil from '../../../apiutils/ScanServiceAPIUtil';
import MaterialTheme from '../../../MaterialTheme';
import ScanService from '../ScanService';
import {SnackbarWrapper, renderAsync} from '../../../tests/testHelpers';
import {act, cleanup, render} from '@testing-library/react';

const getExecutionsMock = jest
  .spyOn(ScanServiceAPIUtil, 'getExecutions')
  .mockImplementation(() => Promise.resolve([]));

const getScheduleMock = jest
  .spyOn(ScanServiceAPIUtil, 'getSchedules')
  .mockImplementation(() => Promise.resolve([]));

afterEach(cleanup);

jest.mock('react-router', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const defaultProps = {
  createScanUrl: jest.fn(),
};

test('renders without crashing', async () => {
  await act(async () => {
    const {getByText} = render(
      <Wrapper>
        <ScanService {...defaultProps} />
      </Wrapper>,
    );
    expect(getByText('Type')).toBeInTheDocument();
    expect(getByText('Schedule Scan')).toBeInTheDocument();
  });
});

test('renders loading initially', async () => {
  await act(async () => {
    const {getByTestId} = render(
      <Wrapper>
        <ScanService {...defaultProps} />
      </Wrapper>,
    );
    expect(getByTestId('loading-box')).toBeInTheDocument();
  });
});

test('renders table after loading', async () => {
  await act(async () => {
    const {queryByTestId} = await renderAsync(
      <Wrapper>
        <ScanService {...defaultProps} />
      </Wrapper>,
    );
    expect(getExecutionsMock).toHaveBeenCalled();
    expect(getScheduleMock).toHaveBeenCalled();
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
