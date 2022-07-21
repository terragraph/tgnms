/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {NetworkPlanningContextProvider} from '../NetworkPlanningContext';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

// The context is heavily utilized and tested in other componenets as well.
test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkPlanningContextProvider>test</NetworkPlanningContextProvider>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});
