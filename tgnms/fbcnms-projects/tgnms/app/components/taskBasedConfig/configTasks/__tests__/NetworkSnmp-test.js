/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkSnmp from '../NetworkSnmp';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue({
    onUpdate: jest.fn(),
    selectedValues: {},
    configData: [],
  });

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <NetworkSnmp />
    </TestApp>,
  );
  expect(getByText('SNMP')).toBeInTheDocument();
});
