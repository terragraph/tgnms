/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AddL2Tunnel from '../AddL2Tunnel';
import React from 'react';
import {NetworkContextWrapper, TestApp} from '../../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

jest
  .spyOn(require('../../../../hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {nodeOverridesConfig: {}, networkOverridesConfig: {}},
  });

const defaultProps = {
  expanded: true,
  onClose: jest.fn(),
  onPanelChange: jest.fn(),
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <AddL2Tunnel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Add L2 Tunnel')).toBeInTheDocument();
});

test('clicking close calls onClose', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <AddL2Tunnel {...defaultProps} />,
      </NetworkContextWrapper>
    </TestApp>,
  );
  fireEvent.click(getByText('Cancel'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});
