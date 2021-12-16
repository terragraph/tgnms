/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
