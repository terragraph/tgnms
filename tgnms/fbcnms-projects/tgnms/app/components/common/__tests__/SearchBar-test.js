/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import React from 'react';
import SearchBar from '../SearchBar';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

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
