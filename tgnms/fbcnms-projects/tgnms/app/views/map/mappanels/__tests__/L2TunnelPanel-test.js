/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import L2TunnelPanel from '../L2TunnelPanel';
import React from 'react';
import {
  NetworkContextWrapper,
  TestApp,
  mockPanelControl,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {nodeOverridesConfig: {}, networkOverridesConfig: {}},
    reloadConfig: jest.fn(),
  });

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <L2TunnelPanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Add L2 Tunnel')).toBeInTheDocument();
});

test('clicking close calls onClose', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <L2TunnelPanel {...defaultProps} />,
      </NetworkContextWrapper>
    </TestApp>,
  );
  fireEvent.click(getByText('Cancel'));
});
