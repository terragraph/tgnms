/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import PopOffline from '../PopOffline';
import {TestApp} from '../../../tests/testHelpers';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

test('renders without crashing', () => {
  const {getByTitle} = render(
    <TestApp>
      <PopOffline />
    </TestApp>,
  );
  expect(getByTitle('PoP Node Offline')).toBeInTheDocument();
});
