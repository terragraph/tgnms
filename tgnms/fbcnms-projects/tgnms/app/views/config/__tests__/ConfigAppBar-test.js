/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigAppBar from '../ConfigAppBar';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const mockUseConfigTaskContext = jest
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
  .mockReturnValue(mockConfigTaskContextValue());

const snackbarsMock = {
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
};

const mockUseAlertIfPendingChanges = jest
  .spyOn(require('../../../hooks/useSnackbar'), 'useAlertIfPendingChanges')
  .mockReturnValue(jest.fn(() => false));

jest
  .spyOn(require('../../../hooks/useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

const defaultProps = {
  onChangeEditMode: jest.fn(),
  rawJsonEditor: false,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigAppBar {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('NETWORK')).toBeInTheDocument();
  expect(getByText('NODE')).toBeInTheDocument();
});

test('change table without crashing', async () => {
  const {getByText} = render(
    <TestApp>
      <ConfigAppBar {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('NODE'));
  expect(defaultProps.onChangeEditMode).toHaveBeenCalled();
});

test('cant change table if there is a draft value', async () => {
  mockUseConfigTaskContext.mockReturnValue(
    mockConfigTaskContextValue({draftChanges: {test: 'test'}}),
  );
  mockUseAlertIfPendingChanges.mockReturnValue(jest.fn(() => true));

  const {getByText} = render(
    <TestApp>
      <ConfigAppBar {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('NODE'));
  expect(defaultProps.onChangeEditMode).not.toHaveBeenCalled();
});

test('click cancel', async () => {
  const useConfigTaskContextMockValues = mockConfigTaskContextValue({
    draftChanges: {test: 'test'},
    onCancel: jest.fn(),
  });

  mockUseConfigTaskContext.mockReturnValue(useConfigTaskContextMockValues);

  const {getByText} = render(
    <TestApp>
      <ConfigAppBar {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Cancel')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByText('Cancel'));
  });

  expect(useConfigTaskContextMockValues.onCancel).toHaveBeenCalled();
});

test('click submit', async () => {
  mockUseConfigTaskContext.mockReturnValue(
    mockConfigTaskContextValue({draftChanges: {test: 'test'}}),
  );

  const {getByTestId, getByText} = render(
    <TestApp>
      <ConfigAppBar {...defaultProps} />
    </TestApp>,
  );
  act(() => {
    fireEvent.click(getByText('Submit'));
  });

  expect(getByTestId('modal-config-submit')).toBeInTheDocument();
});
