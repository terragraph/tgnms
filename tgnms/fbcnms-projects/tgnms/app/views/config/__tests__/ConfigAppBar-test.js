/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import ConfigAppBar from '../ConfigAppBar';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const mockUseConfigTaskContext = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(mockConfigTaskContextValue());

const snackbarsMock = {
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
};

const mockUseAlertIfPendingChanges = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/hooks/useSnackbar'),
    'useAlertIfPendingChanges',
  )
  .mockReturnValue(jest.fn(() => false));

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useSnackbars')
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
