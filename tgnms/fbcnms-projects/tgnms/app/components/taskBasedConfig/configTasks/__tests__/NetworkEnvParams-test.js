/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkEnvParams from '../NetworkEnvParams';
import {TestApp} from '../../../../tests/testHelpers';
import {render} from '@testing-library/react';

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <NetworkEnvParams />
    </TestApp>,
  );
  expect(getByText('Environment Parameters')).toBeInTheDocument();
});
