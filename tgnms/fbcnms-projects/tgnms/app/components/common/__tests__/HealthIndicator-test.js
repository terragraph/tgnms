/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import HealthIndicator from '../HealthIndicator';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';
const defaultProps = {
  health: 0,
};

test('renders', () => {
  const {container} = render(
    <TestApp>
      <HealthIndicator {...defaultProps} />
    </TestApp>,
  );
  expect(container.firstChild).toHaveClass(
    'makeStyles-statusIndicator-1 makeStyles-statusIndicator-2',
  );
});
