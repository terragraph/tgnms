/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as MapPanelHelpers from '../MapPanelHelpers';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {mockLink, mockNode} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

jest.mock('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil');
const apiServiceRequestMock: any = require('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil')
  .apiServiceRequest;

test('test empty link array for getNodeLinks', () => {
  const result = MapPanelHelpers.getNodeLinks(
    mockNode(),
    [],
    LinkTypeValueMap.WIRELESS,
  );
  expect(result.length).toEqual(0);
});

test('links from the node are returned from topology links array', () => {
  const result = MapPanelHelpers.getNodeLinks(
    mockNode({name: 'nodeTest'}),
    [
      mockLink({a_node_name: 'nodeTest', link_type: LinkTypeValueMap.WIRELESS}),
      mockLink({a_node_name: 'nodeTest', link_type: LinkTypeValueMap.ETHERNET}),
      mockLink({a_node_name: 'notTest', link_type: LinkTypeValueMap.WIRELESS}),
      mockLink({a_node_name: 'spam', link_type: LinkTypeValueMap.WIRELESS}),
      mockLink({z_node_name: 'nodeTest', link_type: LinkTypeValueMap.WIRELESS}),
    ],
    LinkTypeValueMap.WIRELESS,
  );
  expect(result.length).toEqual(2);
  expect(result[0].a_node_name).toEqual('nodeTest');
  expect(result[1].z_node_name).toEqual('nodeTest');
});

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
