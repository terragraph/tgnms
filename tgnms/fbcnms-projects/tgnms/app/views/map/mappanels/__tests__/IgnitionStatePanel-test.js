/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import IgnitionStatePanel from '../IgnitionStatePanel';
import React from 'react';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
  mockPanelControl,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

const mockOpenConfirmation = jest.fn();

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useConfirmationModal'), 'default')
  .mockImplementation(() => ({
    ConfirmationModal: 'test',
    openConfirmation: mockOpenConfirmation,
  }));

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <IgnitionStatePanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Network Ignition')).toBeInTheDocument();
});

test('renders loading if no ignition_state', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({
            ignition_state: {
              igCandidates: [],
              igParams: {},
              lastIgCandidates: [],
              visitedNodeNames: [],
            },
          }),
        }}>
        <IgnitionStatePanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Network Ignition')).toBeInTheDocument();
});

test('clicking enabled and selecting disable causes modal to open', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <IgnitionStatePanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  fireEvent.mouseDown(getByText('Enabled'));
  fireEvent.click(getByText('Disabled'));
  expect(mockOpenConfirmation).toHaveBeenCalled();
});

test('links with ignition turned off render', () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({
            ignition_state: {
              igCandidates: [],
              igParams: {linkAutoIgnite: {testLink1: false, testLink2: true}},
              lastIgCandidates: [],
              visitedNodeNames: [],
            },
          }),
        }}>
        <IgnitionStatePanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('testLink1')).toBeInTheDocument();
  expect(queryByText('testLink2')).not.toBeInTheDocument();
});

test('clicking delete on link calls confirmation modal', () => {
  const {getByTestId} = render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({
            ignition_state: {
              igCandidates: [],
              igParams: {linkAutoIgnite: {testLink1: false, testLink2: true}},
              lastIgCandidates: [],
              visitedNodeNames: [],
            },
          }),
        }}>
        <IgnitionStatePanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  fireEvent.click(getByTestId('testLink1-chip').children[1]);
  expect(mockOpenConfirmation).toHaveBeenCalled();
});
