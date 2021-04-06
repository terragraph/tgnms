/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import SearchBar from '../SearchBar';
import {TestApp} from '../../../tests/testHelpers';
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
