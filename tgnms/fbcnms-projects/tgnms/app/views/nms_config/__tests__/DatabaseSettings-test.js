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
import DatabaseSettings from '../DatabaseSettings';
import {
  SettingsFormContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

test('renders', () => {
  const {getByLabelText} = render(
    <TestApp>
      <SettingsFormContextWrapper
        settings={[
          {
            dataType: 'STRING',
            key: 'MYSQL_HOST',
          },
        ]}>
        <DatabaseSettings />
      </SettingsFormContextWrapper>
    </TestApp>,
  );
  expect(getByLabelText('MySQL Host')).toBeInTheDocument();
});
