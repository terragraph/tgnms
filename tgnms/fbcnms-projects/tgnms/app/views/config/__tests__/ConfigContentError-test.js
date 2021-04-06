/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigContentError from '../ConfigContentError';
import {
  CONFIG_PARAM_MODE,
  FORM_CONFIG_MODES,
} from '../../../constants/ConfigConstants';
import {TestApp} from '../../../tests/testHelpers';
import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';
import {render} from '@testing-library/react';

jest
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
  .mockReturnValue(mockConfigTaskContextValue());

test('renders specific mode error', async () => {
  const {getByText} = render(
    <TestApp>
      <ConfigContentError />
    </TestApp>,
  );
  expect(
    getByText(
      `Error when loading ${
        CONFIG_PARAM_MODE[FORM_CONFIG_MODES.NETWORK]
      }. This configuration data is unreachable.`,
    ),
  ).toBeInTheDocument();
});
