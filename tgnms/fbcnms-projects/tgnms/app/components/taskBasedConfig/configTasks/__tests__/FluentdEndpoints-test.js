/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import FluentdEndpoints from '../FluentdEndpoints';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <FluentdEndpoints />
    </TestApp>,
  );
  expect(getByText('Fluentd Endpoints')).toBeInTheDocument();
});
