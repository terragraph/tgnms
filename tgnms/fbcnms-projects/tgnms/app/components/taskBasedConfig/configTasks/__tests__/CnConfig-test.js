/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import CnConfig from '../CnConfig';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <CnConfig />
    </TestApp>,
  );
  expect(getByText('CPE Interface')).toBeInTheDocument();
});
