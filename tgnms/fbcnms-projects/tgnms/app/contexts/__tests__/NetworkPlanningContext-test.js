/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
