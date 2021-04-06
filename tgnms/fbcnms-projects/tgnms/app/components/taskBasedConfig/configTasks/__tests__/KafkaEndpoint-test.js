/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import KafkaEndpoint from '../KafkaEndpoint';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <KafkaEndpoint />
    </TestApp>,
  );
  expect(getByText('Endpoint')).toBeInTheDocument();
});
