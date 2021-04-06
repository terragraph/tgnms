/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NodeSelector from '../NodeSelector';
import {FORM_CONFIG_MODES} from '../../../constants/ConfigConstants';
import {TestApp} from '../../../tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

jest
  .spyOn(require('../../../apiutils/ConfigAPIUtil'), 'getNodeOverridesConfig')
  .mockReturnValue({});

jest
  .spyOn(require('../../../helpers/ConfigHelpers'), 'getTopologyNodeList')
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
