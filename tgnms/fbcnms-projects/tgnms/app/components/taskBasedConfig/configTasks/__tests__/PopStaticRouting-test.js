/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import PopStaticRouting from '../PopStaticRouting';
import {TestApp} from '../../../../tests/testHelpers';
import {render} from '@testing-library/react';

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <PopStaticRouting />
    </TestApp>,
  );
  expect(getByText('GW Address')).toBeInTheDocument();
});
