/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import HealthIndicator from '../HealthIndicator';
import React from 'react';
import {render} from '@testing-library/react';

const defaultProps = {
  health: 0,
};

test('renders', () => {
  const {container} = render(<HealthIndicator {...defaultProps} />);
  expect(container.firstChild).toHaveClass(
    'makeStyles-statusIndicator-1 makeStyles-statusIndicator-2',
  );
});
