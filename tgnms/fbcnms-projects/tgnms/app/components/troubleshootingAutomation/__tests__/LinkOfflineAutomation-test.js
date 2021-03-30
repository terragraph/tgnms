/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import LinkOfflineAutomation from '../LinkOfflineAutomation';
import {TestApp} from '../../../tests/testHelpers';
import {render} from '@testing-library/react';

test('renders without crashing', () => {
  const {getByTitle} = render(
    <TestApp>
      <LinkOfflineAutomation />
    </TestApp>,
  );
  expect(getByTitle('Link Offline')).toBeInTheDocument();
});
