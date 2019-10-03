/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import EditRadioMacs from '../EditRadioMacs';
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  waitForElement,
} from '@testing-library/react';
import {mockNetworkConfig} from '../../../tests/testHelpers';

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
  const {getByText} = render(<EditRadioMacs {...defaultProps} />);
  expect(getByText('Radio MAC Address')).toBeInTheDocument();
  expect(getByText('ADD RADIO MAC ADDRESS')).toBeInTheDocument();
});

test('add node', async () => {
  const {getByText, queryByTestId} = render(
    <EditRadioMacs {...defaultProps} />,
  );
  expect(queryByTestId('new0Delete')).not.toBeInTheDocument();
  fireEvent.click(getByText('ADD RADIO MAC ADDRESS'));
  await waitForElement(() => queryByTestId('new0Delete'));
  expect(queryByTestId('new0Delete')).toBeInTheDocument();
});

test('delete node', async () => {
  const {queryByTestId} = render(
    <EditRadioMacs
      {...defaultProps}
      radioMacs="38:3a:21:b0:00:01,38:3a:21:b0:00:01"
    />,
  );
  expect(queryByTestId('38:3a:21:b0:00:01')).toBeInTheDocument();
  expect(queryByTestId('38:3a:21:b0:00:01Delete')).toBeInTheDocument();
  fireEvent.click(queryByTestId('38:3a:21:b0:00:01Delete'));
  expect(queryByTestId('38:3a:21:b0:00:01')).not.toBeInTheDocument();
});

test('change node', async () => {
  const {queryByTestId} = render(
    <EditRadioMacs
      {...defaultProps}
      radioMacs="38:3a:21:b0:00:01,38:3a:21:b0:00:01"
    />,
  );
  const input = document.getElementById('38:3a:21:b0:00:01');
  expect(queryByTestId('38:3a:21:b0:00:01')).toBeInTheDocument();
  // $FlowFixMe - flow can't detect input value
  expect(input.value).toBe('38:3a:21:b0:00:01');
  fireEvent.change(input, {
    target: {value: '38:3a:21:b0:00:02'},
  });
  // $FlowFixMe - flow can't detect input value
  expect(input.value).toBe('38:3a:21:b0:00:02');
});

test('onRadioMacChange test', async () => {
  const onRadioMacChange = jest.fn(() => {});
  const {queryByTestId} = render(
    <EditRadioMacs
      {...defaultProps}
      radioMacs="38:3a:21:b0:00:01,38:3a:21:b0:00:01"
      onRadioMacChange={onRadioMacChange}
    />,
  );
  expect(onRadioMacChange).not.toBeCalled();
  expect(queryByTestId('38:3a:21:b0:00:01')).toBeInTheDocument();
  expect(queryByTestId('38:3a:21:b0:00:01Delete')).toBeInTheDocument();
  fireEvent.click(queryByTestId('38:3a:21:b0:00:01Delete'));
  expect(onRadioMacChange).toBeCalled();
});
