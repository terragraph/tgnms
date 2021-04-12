/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import StatsAgentParams from '../StatsAgentParams';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <StatsAgentParams />
    </TestApp>,
  );
  expect(getByText('Stats Agent Parameters')).toBeInTheDocument();
});
