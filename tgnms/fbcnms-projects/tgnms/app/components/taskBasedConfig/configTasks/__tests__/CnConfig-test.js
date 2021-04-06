/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import CnConfig from '../CnConfig';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <CnConfig />
    </TestApp>,
  );
  expect(getByText('CPE Interface')).toBeInTheDocument();
});
