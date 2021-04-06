/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import RadioParams from '../RadioParams';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <RadioParams />
    </TestApp>,
  );
  expect(getByText('Radio Parameters')).toBeInTheDocument();
});
