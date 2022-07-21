/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SiteAdvanced from '../SiteAdvanced';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  onChange: jest.fn(),
  location: {latitude: 0, longitude: 0, altitude: 0, accuracy: 0},
};

test('render without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <SiteAdvanced {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Latitude')).toBeInTheDocument();
});

test('change calls onChange', () => {
  const {getByTestId} = render(
    <TestApp>
      <SiteAdvanced {...defaultProps} />
    </TestApp>,
  );
  fireEvent.change(getByTestId('latitude-input').children[1].children[0], {
    target: {value: 10},
  });
  expect(defaultProps.onChange).toHaveBeenCalled();
});
