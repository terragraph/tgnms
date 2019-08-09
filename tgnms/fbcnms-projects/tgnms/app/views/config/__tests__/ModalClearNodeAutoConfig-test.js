/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import ModalClearNodeAutoConfig from '../ModalClearNodeAutoConfig';
import React from 'react';
import {apiServiceRequest} from '../../../apiutils/ServiceAPIUtil';
import {
  cleanup,
  fireEvent,
  render,
  waitForElement,
} from '@testing-library/react';

jest.mock('../../../apiutils/ServiceAPIUtil');
afterEach(cleanup);

const defaultProps = {
  isOpen: true,
  nodes: [{name: 'node1'}, {name: 'node2'}],
  onClose: () => {},
  networkName: '',
};

test('renders without crashing', () => {
  const {getByText} = render(<ModalClearNodeAutoConfig {...defaultProps} />);
  expect(getByText('Clear Node Auto Configurations')).toBeInTheDocument();
});

test('closes', () => {
  const onCloseMock = jest.fn();
  const {getByText} = render(
    <ModalClearNodeAutoConfig {...defaultProps} onClose={onCloseMock} />,
  );
  fireEvent.click(getByText('Close'));
  expect(onCloseMock).toHaveBeenCalled();
});

test('submit calls success modal on successful api call', async () => {
  apiServiceRequest.mockImplementationOnce(() => Promise.resolve());
  const {getByText} = render(<ModalClearNodeAutoConfig {...defaultProps} />);
  const inputPath = document.getElementById('nodePath');
  fireEvent.change(inputPath, {target: {value: '*'}});
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Auto Configs Cleared'));
  expect(getByText('Auto Configs Cleared')).toBeInTheDocument();
});

test('submit calls fail modal on failed api call', async () => {
  apiServiceRequest.mockImplementationOnce(() => Promise.reject());
  const {getByText} = render(<ModalClearNodeAutoConfig {...defaultProps} />);
  const inputPath = document.getElementById('nodePath');
  fireEvent.change(inputPath, {target: {value: '*'}});
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Clear Config Failed'));
  expect(getByText('Clear Config Failed')).toBeInTheDocument();
});
