/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import BuildingsLayer from '../BuildingsLayer';
import {Layer} from 'react-mapbox-gl';
import {TestApp} from '../../../../tests/testHelpers';
import {render} from '@testing-library/react';

test('renders with default props', () => {
  render(
    <TestApp>
      <BuildingsLayer />
    </TestApp>,
  );
  expect(Layer).toHaveBeenCalled();
});
