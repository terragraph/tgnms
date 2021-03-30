/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import NetworkSnmp from '../NetworkSnmp';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

jest
  .spyOn(
    require('../../../../contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue({
    onUpdate: jest.fn(),
    selectedValues: {refreshConfig: false},
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
