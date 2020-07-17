/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import TaskBasedConfigModal from '../TaskBasedConfigModal';
import {
  NetworkContextWrapper,
  SnackbarWrapper,
  TestApp,
} from '../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

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
      <SnackbarWrapper>
        <NetworkContextWrapper>
          <TaskBasedConfigModal {...defaultProps} />
        </NetworkContextWrapper>
      </SnackbarWrapper>
    </TestApp>,
  );
  expect(getByText('Test Title')).toBeInTheDocument();
});

test('clicking close closes modal', async () => {
  const {getByText} = render(
    <TestApp>
      <SnackbarWrapper>
        <NetworkContextWrapper>
          <TaskBasedConfigModal {...defaultProps} />
        </NetworkContextWrapper>
      </SnackbarWrapper>
    </TestApp>,
  );
  expect(getByText('Cancel')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByText('Cancel'));
  });
  expect(defaultProps.onClose).toHaveBeenCalled();
});
