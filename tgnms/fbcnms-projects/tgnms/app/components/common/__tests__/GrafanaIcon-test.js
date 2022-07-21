/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import GrafanaIcon from '../GrafanaIcon';
import React from 'react';
import {render} from '@testing-library/react';

test('renders', () => {
  const {getByTestId} = render(<GrafanaIcon />);
  expect(getByTestId('grafana-icon')).toBeInTheDocument();
});
