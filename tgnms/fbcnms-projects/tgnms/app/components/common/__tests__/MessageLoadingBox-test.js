/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import MessageLoadingBox from '../MessageLoadingBox';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  fullScreen: true,
  text: 'testing text',
};

test('renders without crashing', () => {
  const {getByText} = render(<MessageLoadingBox {...defaultProps} />);
  expect(getByText('testing text')).toBeInTheDocument();
});
