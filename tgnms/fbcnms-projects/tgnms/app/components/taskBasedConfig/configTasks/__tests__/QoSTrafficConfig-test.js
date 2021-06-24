/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import QoSTrafficConfig from '../QoSTrafficConfig';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const mockConfigTaskContext = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(
    mockConfigTaskContextValue({
      draftChanges: {cpeParams: {cpeInterfaces: 'testInterface'}},
    }),
  );

const mockIsFeatureEnabled = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <QoSTrafficConfig />
    </TestApp>,
  );
  expect(getByText('QoS Config')).toBeInTheDocument();
});

test('as policing only for defined CPE interfaces', () => {
  const {getByText} = render(
    <TestApp>
      <QoSTrafficConfig />
    </TestApp>,
  );
  expect(
    getByText('Policing Classification for testInterface'),
  ).toBeInTheDocument();
});

test('if no CPE interfaces, no options for policing ', () => {
  mockConfigTaskContext.mockReturnValue(mockConfigTaskContextValue());
  const {queryByText} = render(
    <TestApp>
      <QoSTrafficConfig />
    </TestApp>,
  );
  expect(queryByText('testInterface')).not.toBeInTheDocument();
  expect(
    queryByText('Policing Classification for testInterface'),
  ).not.toBeInTheDocument();
});

test('does not render if feature is disabled', () => {
  mockIsFeatureEnabled.mockReturnValue(false);
  const {queryByText} = render(
    <TestApp>
      <QoSTrafficConfig />
    </TestApp>,
  );
  expect(queryByText('QoS Config')).not.toBeInTheDocument();
});
