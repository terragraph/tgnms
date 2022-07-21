/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import TgMapboxNavIcon from '../TgMapboxNavIcon';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {render} from '@testing-library/react';

const defaultProps = {
  resultType: TOPOLOGY_ELEMENT.NODE,
};

test('renders', () => {
  const {getByTestId} = render(<TgMapboxNavIcon {...defaultProps} />);
  expect(getByTestId('node-search-icon')).toBeInTheDocument();
});
