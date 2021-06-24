/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
