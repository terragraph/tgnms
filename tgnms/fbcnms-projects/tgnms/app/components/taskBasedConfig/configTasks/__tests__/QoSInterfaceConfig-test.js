/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import QoSInterfaceConfig from '../QoSInterfaceConfig';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(mockConfigTaskContextValue());

const defaultProps = {
  cpeInterface: 'test',
};

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <QoSInterfaceConfig {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Policing Classification for test')).toBeInTheDocument();
});

test('default renders on simple format', async () => {
  const {getByText} = render(
    <TestApp>
      <QoSInterfaceConfig {...defaultProps} />
    </TestApp>,
  );
  expect(
    getByText(/All Traffic Classes will have the same CIR/i),
  ).toBeInTheDocument();
});

test('clicking Custom switches to custom format', async () => {
  const {getByText} = render(
    <TestApp>
      <QoSInterfaceConfig {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Custom'));
  expect(
    getByText(/Configure custom CIR and EIR for each Traffic Class/i),
  ).toBeInTheDocument();
});
