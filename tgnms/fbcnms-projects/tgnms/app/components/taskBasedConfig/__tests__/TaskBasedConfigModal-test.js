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
import TaskBasedConfigModal from '../TaskBasedConfigModal';
import {
  NetworkContextWrapper,
  TestApp,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {},
    reloadConfig: jest.fn(),
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
