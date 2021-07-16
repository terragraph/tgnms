/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NodeConfig from '../NodeConfig';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

const defaultProps = {
  node: {},
};

const mockUpdateNodeConfigs = jest.fn();
jest.mock('@fbcnms/tg-nms/app/contexts/TopologyBuilderContext', () => ({
  useTopologyBuilderContext: () => ({
    updateNodeConfigs: mockUpdateNodeConfigs,
  }),
}));

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {},
  });

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil'),
    'getNodeOverridesConfig',
  )
  .mockReturnValue({});

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/helpers/ConfigHelpers'),
    'getTopologyNodeList',
  )
  .mockReturnValue([{name: 'testNode'}, {name: 'mock filter node'}]);

test('render without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NodeConfig {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Show Node Configuration')).toBeInTheDocument();
});

test('config opens', () => {
  const {getByText} = render(
    <TestApp>
      <NodeConfig {...defaultProps} />
    </TestApp>,
  );
  act(() => {
    fireEvent.click(getByText('Show Node Configuration'));
  });
  expect(getByText('Node Config')).toBeInTheDocument();
});

test('when submit is clicked, update config is called', () => {
  const {getByText} = render(
    <TestApp>
      <NodeConfig {...defaultProps} />
    </TestApp>,
  );
  act(() => {
    fireEvent.click(getByText('Show Node Configuration'));
  });
  act(() => {
    fireEvent.click(getByText('Submit'));
  });
  expect(mockUpdateNodeConfigs).toHaveBeenCalled();
});
