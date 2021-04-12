/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigJson from '../ConfigJson';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const mockValues = mockConfigTaskContextValue({onSetJson: jest.fn()});

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(mockValues);

const snackbarsMock = {
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
};
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigJson />
    </TestApp>,
  );
  expect(getByText(/"overrides": "hello"/i)).toBeInTheDocument();
});

test('valid change text triggers onSetJson', async () => {
  const {getByTestId} = render(
    <TestApp>
      <ConfigJson />
    </TestApp>,
  );
  const input = getByTestId('config-json');
  act(() => {
    fireEvent.change(input, {
      target: {value: '{"result":true, "count":42}'},
    });
  });
  expect(mockValues.onSetJson).toHaveBeenCalled();
});

test('invalid change triggers snackbar', async () => {
  const {getByTestId} = render(
    <TestApp>
      <ConfigJson />
    </TestApp>,
  );
  const input = getByTestId('config-json');
  act(() => {
    fireEvent.change(input, {
      target: {value: '{invalid test'},
    });
  });
  expect(mockValues.onSetJson).not.toHaveBeenCalled();
});
