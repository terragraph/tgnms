/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkTestAdvancedParams from '../NetworkTestAdvancedParams';
import nullthrows from '@fbcnms/util/nullthrows';
import {coerceClass} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  onIperfOptionsUpdate: jest.fn(),
  type: 'sequential_link',
};

test('renders without crashing', () => {
  const {getByText} = render(<NetworkTestAdvancedParams {...defaultProps} />);
  expect(getByText('Single iPerf Session Duration')).toBeInTheDocument();
  expect(getByText('Test Push Rate')).toBeInTheDocument();
});

test('changes call update', () => {
  const {getByText} = render(<NetworkTestAdvancedParams {...defaultProps} />);
  expect(getByText('Single iPerf Session Duration')).toBeInTheDocument();
  const duration = nullthrows(document.getElementById('iperfDuration'));
  fireEvent.change(duration, {target: {value: '30'}});
  expect(defaultProps.onIperfOptionsUpdate).toHaveBeenCalled();
});

test('renders with initial options', () => {
  const {getByText} = render(
    <NetworkTestAdvancedParams
      {...defaultProps}
      initialOptions={{timeSec: 20}}
    />,
  );
  expect(getByText('Single iPerf Session Duration')).toBeInTheDocument();
  const duration = coerceClass(
    document?.getElementById('iperfDuration'),
    HTMLInputElement,
  );
  expect(duration.value === 20);
});
