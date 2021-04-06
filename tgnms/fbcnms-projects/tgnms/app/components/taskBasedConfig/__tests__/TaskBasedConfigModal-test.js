/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import TaskBasedConfigModal from '../TaskBasedConfigModal';
import {
  NetworkContextWrapper,
  TestApp,
  renderAsync,
} from '../../../tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

jest
  .spyOn(require('../../../hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {},
  });

jest
  .spyOn(require('../../../apiutils/ConfigAPIUtil'), 'getNodeOverridesConfig')
  .mockReturnValue({});

jest
  .spyOn(require('../../../helpers/ConfigHelpers'), 'getTopologyNodeList')
  .mockReturnValue([{name: 'testNode'}, {name: 'mock filter node'}]);

const defaultProps = {
  open: true,
  modalTitle: 'Test Title',
  onClose: jest.fn(),
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <TaskBasedConfigModal {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Test Title')).toBeInTheDocument();
});

test('clicking close closes modal', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <NetworkContextWrapper>
        <TaskBasedConfigModal {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Cancel')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByText('Cancel'));
  });
  expect(defaultProps.onClose).toHaveBeenCalled();
});
