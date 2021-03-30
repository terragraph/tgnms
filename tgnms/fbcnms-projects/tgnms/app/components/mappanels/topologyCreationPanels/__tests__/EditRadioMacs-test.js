/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import EditRadioMacs from '../EditRadioMacs';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {
  TestApp,
  coerceClass,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  cleanup,
  fireEvent,
  render,
  waitForElement,
} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  label: 'Radio MAC Address',
  macAddr: '38:3a:21:b0:00:00',
  required: false,
  radioMacs: '',
  networkConfig: mockNetworkConfig(),
  networkName: '',
  name: 'test',
  onRadioMacChange: () => {},
  submitButtonStatus: () => {},
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <EditRadioMacs {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Radio MAC Address')).toBeInTheDocument();
  expect(getByText('ADD RADIO MAC ADDRESS')).toBeInTheDocument();
});

test('add node', async () => {
  const {getByText, queryByTestId} = render(
    <TestApp>
      <EditRadioMacs {...defaultProps} />
    </TestApp>,
  );
  expect(queryByTestId('new0Delete')).not.toBeInTheDocument();
  fireEvent.click(getByText('ADD RADIO MAC ADDRESS'));
  await waitForElement(() => queryByTestId('new0Delete'));
  expect(queryByTestId('new0Delete')).toBeInTheDocument();
});

test('delete node', async () => {
  const {queryByTestId} = render(
    <TestApp>
      <EditRadioMacs
        {...defaultProps}
        radioMacs="38:3a:21:b0:00:01,38:3a:21:b0:00:01"
      />
    </TestApp>,
  );
  expect(queryByTestId('38:3a:21:b0:00:01')).toBeInTheDocument();
  expect(queryByTestId('38:3a:21:b0:00:01Delete')).toBeInTheDocument();
  fireEvent.click(nullthrows(queryByTestId('38:3a:21:b0:00:01Delete')));
  expect(queryByTestId('38:3a:21:b0:00:01')).not.toBeInTheDocument();
});

test('change node', async () => {
  const {queryByTestId} = render(
    <TestApp>
      <EditRadioMacs
        {...defaultProps}
        radioMacs="38:3a:21:b0:00:01,38:3a:21:b0:00:01"
      />
    </TestApp>,
  );
  const input = coerceClass(
    nullthrows(document.getElementById('38:3a:21:b0:00:01')),
    HTMLInputElement,
  );
  expect(queryByTestId('38:3a:21:b0:00:01')).toBeInTheDocument();
  expect(input.value).toBe('38:3a:21:b0:00:01');
  fireEvent.change(input, {
    target: {value: '38:3a:21:b0:00:02'},
  });
  expect(input.value).toBe('38:3a:21:b0:00:02');
});

test('onRadioMacChange test', async () => {
  const onRadioMacChange = jest.fn(() => {});
  const {queryByTestId} = render(
    <TestApp>
      <EditRadioMacs
        {...defaultProps}
        radioMacs="38:3a:21:b0:00:01,38:3a:21:b0:00:01"
        onRadioMacChange={onRadioMacChange}
      />
    </TestApp>,
  );
  expect(onRadioMacChange).not.toBeCalled();
  expect(queryByTestId('38:3a:21:b0:00:01')).toBeInTheDocument();
  expect(queryByTestId('38:3a:21:b0:00:01Delete')).toBeInTheDocument();
  fireEvent.click(nullthrows(queryByTestId('38:3a:21:b0:00:01Delete')));
  expect(onRadioMacChange).toBeCalled();
});
