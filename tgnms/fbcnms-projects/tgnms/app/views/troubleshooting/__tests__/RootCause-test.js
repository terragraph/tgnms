/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import RootCause from '../RootCause';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {Route} from 'react-router-dom';
import {fireEvent, render} from '@testing-library/react';
import {mockNetworkContext} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/NetworkContext'),
    'useNetworkContext',
  )
  .mockImplementation(jest.fn(() => mockNetworkContext()));

test('renders', () => {
  const {getByLabelText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <Route path="/" render={r => <RootCause {...r} />} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByLabelText('Time')).toBeInTheDocument();
  expect(getByLabelText('View')).toBeInTheDocument();
});

test('changing time works', () => {
  const {getByText, getAllByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <Route path="/" render={r => <RootCause {...r} />} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  fireEvent.mouseDown(getByText('This week'));
  fireEvent.click(getByText('Today'));
  expect(getAllByText('Today').length == 2);
  expect(getByText('Now')).toBeInTheDocument();
});

test('changing view works', () => {
  const {getByText, getAllByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <Route path="/" render={r => <RootCause {...r} />} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  fireEvent.mouseDown(getAllByText('Network')[0]);
  fireEvent.click(getByText('All Nodes'));
  expect(getAllByText('All Nodes').length == 2);
});
