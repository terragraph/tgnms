/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as MapPanelHelpers from '../MapPanelHelpers';

jest.mock('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil');
const apiServiceRequestMock: any = require('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil')
  .apiServiceRequest;

const mockOnClose = jest.fn();

test('sendTopologyBuilderRequest returns a promise', () => {
  apiServiceRequestMock.mockImplementationOnce(
    () => new Promise(r => setTimeout(r, 100)),
  );
  const result = MapPanelHelpers.sendTopologyBuilderRequest(
    'testName',
    'testEndpoint',
    {},
    mockOnClose,
  );
  expect(result).toEqual(new Promise(() => {}));
});

test('sendTopologyBuilderRequest returns what apiServiceRequest returns', async () => {
  apiServiceRequestMock.mockImplementationOnce(() =>
    Promise.resolve('testResponse'),
  );

  const result = await MapPanelHelpers.sendTopologyBuilderRequest(
    'testName',
    'testEndpoint',
    {},
    mockOnClose,
  );
  expect(result).toEqual('testResponse');
});

test('sendTopologyBuilderRequest calls onClose with success when successful', async () => {
  apiServiceRequestMock.mockImplementationOnce(() => Promise.resolve());
  await MapPanelHelpers.sendTopologyBuilderRequest(
    'testName',
    'testEndpoint',
    {},
    mockOnClose,
  );
  expect(mockOnClose).toHaveBeenCalledWith('success');
});

test('sendTopologyBuilderRequest calls onClose on error with error message', async () => {
  apiServiceRequestMock.mockImplementationOnce(() =>
    Promise.reject({message: 'errorMessage'}),
  );
  await MapPanelHelpers.sendTopologyBuilderRequest(
    'testName',
    'testEndpoint',
    {},
    mockOnClose,
  );
  expect(mockOnClose).toHaveBeenCalledWith('errorMessage');
});
