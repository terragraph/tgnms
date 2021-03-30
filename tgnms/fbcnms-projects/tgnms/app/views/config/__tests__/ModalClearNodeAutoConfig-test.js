/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import ModalClearNodeAutoConfig from '../ModalClearNodeAutoConfig';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {TestApp} from '../../../tests/testHelpers';
import {
  cleanup,
  fireEvent,
  render,
  waitForElement,
} from '@testing-library/react';

jest.mock('../../../apiutils/ServiceAPIUtil');
const apiServiceRequestMock: any = require('../../../apiutils/ServiceAPIUtil')
  .apiServiceRequest;

afterEach(cleanup);

const defaultProps = {
  isOpen: true,
  nodes: [{name: 'node1'}, {name: 'node2'}],
  onClose: () => {},
  networkName: '',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalClearNodeAutoConfig {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Clear Node Auto Configurations')).toBeInTheDocument();
});

test('closes', () => {
  const onCloseMock = jest.fn();
  const {getByText} = render(
    <TestApp>
      <ModalClearNodeAutoConfig {...defaultProps} onClose={onCloseMock} />,
    </TestApp>,
  );
  fireEvent.click(getByText('Close'));
  expect(onCloseMock).toHaveBeenCalled();
});

test('submit calls success modal on successful api call', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.resolve());
  const {getByText} = render(
    <TestApp>
      <ModalClearNodeAutoConfig {...defaultProps} />
    </TestApp>,
  );
  const inputPath = nullthrows(document.getElementById('nodePath'));
  fireEvent.change(inputPath, {target: {value: '*'}});
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Auto Configs Cleared'));
  expect(getByText('Auto Configs Cleared')).toBeInTheDocument();
});

test('submit calls fail modal on failed api call', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.reject());
  const {getByText} = render(
    <TestApp>
      <ModalClearNodeAutoConfig {...defaultProps} />
    </TestApp>,
  );
  const inputPath = nullthrows(document.getElementById('nodePath'));
  fireEvent.change(inputPath, {target: {value: '*'}});
  fireEvent.click(getByText('Submit'));
  await waitForElement(() => getByText('Clear Config Failed'));
  expect(getByText('Clear Config Failed')).toBeInTheDocument();
});
