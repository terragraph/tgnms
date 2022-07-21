/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import HealthTextSquare from '../HealthTextSquare';
import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import React from 'react';
import {render} from '@testing-library/react';

const defaultProps = {
  text: 'testText',
  health: 0,
};

test('renders', () => {
  const {getByText} = render(
    <MaterialTheme>
      <HealthTextSquare {...defaultProps} />
    </MaterialTheme>,
  );
  expect(getByText('TESTTEXT')).toBeInTheDocument();
});
