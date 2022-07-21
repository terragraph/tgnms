/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import ModalClearNodeAutoConfig from '../ModalClearNodeAutoConfig';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render, waitFor} from '@testing-library/react';

jest.mock('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil');
const apiServiceRequestMock: any = require('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil')
  .apiServiceRequest;

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

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

test('submit calls success snackbar on successful api call', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.resolve({}));
  const {getByText} = render(
    <TestApp>
      <ModalClearNodeAutoConfig {...defaultProps} />
    </TestApp>,
  );
  const inputPath = nullthrows(document.getElementById('nodePath'));
  fireEvent.change(inputPath, {target: {value: '*'}});
  fireEvent.click(getByText('Submit'));
  await waitFor(() => expect(snackbarsMock.success).toHaveBeenCalled());
  expect(snackbarsMock.success).toHaveBeenCalled();
});

test('submit calls fail snackbar on failed api call', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.reject({}));
  const {getByText} = render(
    <TestApp>
      <ModalClearNodeAutoConfig {...defaultProps} />
    </TestApp>,
  );
  const inputPath = nullthrows(document.getElementById('nodePath'));
  fireEvent.change(inputPath, {target: {value: '*'}});
  fireEvent.click(getByText('Submit'));
  await waitFor(() => expect(snackbarsMock.error).toHaveBeenCalled());
  expect(snackbarsMock.error).toHaveBeenCalled();
});
