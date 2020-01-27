/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import BuildingsLayer from '../BuildingsLayer';
import {Layer} from 'react-mapbox-gl';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders with default props', () => {
  render(
    <TestApp>
      <BuildingsLayer />
    </TestApp>,
  );
  expect(Layer).toHaveBeenCalled();
});
