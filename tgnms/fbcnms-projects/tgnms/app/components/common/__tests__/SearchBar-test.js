/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import SearchBar from '../SearchBar';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  value: '',
};

test('renders empty without crashing', () => {
  const {getByPlaceholderText} = render(
    <TestApp>
      <SearchBar {...defaultProps} />
    </TestApp>,
  );
  expect(getByPlaceholderText('Search')).toBeInTheDocument();
});
