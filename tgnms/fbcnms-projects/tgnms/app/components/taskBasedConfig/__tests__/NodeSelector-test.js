/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NodeSelector from '../NodeSelector';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

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

const defaultProps = {
  onSelectNode: jest.fn(),
  selectedNodeName: 'testNode',
  mode: FORM_CONFIG_MODES.NODE,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSelector {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Select Node')).toBeInTheDocument();
});

test('onClick calls onSelect with node name', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSelector {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testNode')).toBeInTheDocument();
  fireEvent.click(getByText('testNode'));
  expect(defaultProps.onSelectNode).toHaveBeenCalledWith({name: 'testNode'});
});

test('filter filters name', () => {
  const {getByPlaceholderText, getByText, queryByText} = render(
    <TestApp>
      <NodeSelector {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testNode')).toBeInTheDocument();

  fireEvent.change(getByPlaceholderText('Filter'), {target: {value: 'm'}});

  expect(queryByText('testNode')).not.toBeInTheDocument();
  expect(getByText('mock filter node')).toBeInTheDocument();
});
