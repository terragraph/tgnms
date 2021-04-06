/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import PopKvstoreParams from '../PopKvstoreParams';
import {TestApp} from '../../../../tests/testHelpers';
import {render} from '@testing-library/react';

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <PopKvstoreParams />
    </TestApp>,
  );
  expect(getByText('Key-Value Store Parameters')).toBeInTheDocument();
});
