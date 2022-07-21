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
import BuildingsLayer from '../BuildingsLayer';
import {Layer} from 'react-mapbox-gl';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

test('renders with default props', () => {
  render(
    <TestApp>
      <BuildingsLayer />
    </TestApp>,
  );
  expect(Layer).toHaveBeenCalled();
});
