/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import ConfigQuickSettingsForm from '../ConfigQuickSettingsForm';
import React from 'react';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const mockUseConfigTaskContext = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
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
