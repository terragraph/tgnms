/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkTestAdvancedParams from '../NetworkTestAdvancedParams';
import nullthrows from '@fbcnms/util/nullthrows';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {coerceClass} from '../../../tests/testHelpers';

afterEach(cleanup);

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
