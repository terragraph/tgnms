/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigQuickSettingsForm from '../ConfigQuickSettingsForm';
import React from 'react';
import {FORM_CONFIG_MODES} from '../../../constants/ConfigConstants';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const mockUseConfigTaskContext = jest
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
  .mockReturnValue(mockConfigTaskContextValue());

test('network renders', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigQuickSettingsForm />
    </TestApp>,
  );
  expect(getByText('Network')).toBeInTheDocument();
  expect(getByText('System Parameters')).toBeInTheDocument();
});

test('pop renders', () => {
  mockUseConfigTaskContext.mockReturnValue(
    mockConfigTaskContextValue({
      editMode: FORM_CONFIG_MODES.NODE,
      selectedValues: {nodeInfo: {isPop: true}},
    }),
  );

  const {getByText} = render(
    <TestApp>
      <ConfigQuickSettingsForm />
    </TestApp>,
  );
  expect(getByText('POP Node')).toBeInTheDocument();
});
