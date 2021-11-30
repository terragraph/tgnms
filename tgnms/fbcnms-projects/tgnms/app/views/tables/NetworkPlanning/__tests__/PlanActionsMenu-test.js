/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as mockNetworkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import PlanActionsMenu from '../PlanActionsMenu';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkPlan,
  testHistory,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {act, fireEvent, render} from '@testing-library/react';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil', () => ({
  createPlan: jest.fn().mockImplementation(plan => ({id: '100', ...plan})),
  deletePlan: jest.fn(),
  deleteInputFile: jest.fn(),
}));

describe('PlanActionsMenu', () => {
  it('should duplicate a plan', async () => {
    const mockOnComplete = jest.fn();
    const mockPlan = mockNetworkPlan({
      name: 'MyPlan',
      dsmFile: convertType<InputFile>({id: '10'}),
      sitesFile: convertType<InputFile>({id: '20'}),
      boundaryFile: convertType<InputFile>({id: '30'}),
    });
    const history = testHistory(PLANNING_BASE_PATH + '/folder/1');
    const {getByText, getByTestId} = render(
      <TestApp history={history}>
        <NetworkContextWrapper>
          <NetworkPlanningContextProvider>
            <PlanActionsMenu plan={mockPlan} onComplete={mockOnComplete} />
          </NetworkPlanningContextProvider>
        </NetworkContextWrapper>
      </TestApp>,
    );

    // Open menu.
    act(() => {
      fireEvent.click(getByTestId('more-vert-button'));
    });
    // Click duplicate
    await act(async () => {
      fireEvent.click(getByText('Duplicate'));
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.createPlan).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.createPlan).toHaveBeenCalledWith({
      name: 'MyPlan V2',
      folderId: 1,
      dsmFileId: '10',
      sitesFileId: '20',
      boundaryFileId: '30',
    });
  });
  it('should delete a plan', async () => {
    const mockOnComplete = jest.fn();
    const mockPlan = mockNetworkPlan({
      name: 'MyPlan',
      dsmFile: convertType<InputFile>({id: '10'}),
      sitesFile: convertType<InputFile>({id: '20'}),
      boundaryFile: convertType<InputFile>({id: '30'}),
    });
    const history = testHistory(PLANNING_BASE_PATH + '/folder/1');
    const {getByText, getByTestId} = render(
      <TestApp history={history}>
        <NetworkContextWrapper>
          <NetworkPlanningContextProvider>
            <PlanActionsMenu plan={mockPlan} onComplete={mockOnComplete} />
          </NetworkPlanningContextProvider>
        </NetworkContextWrapper>
      </TestApp>,
    );

    // Open menu.
    act(() => {
      fireEvent.click(getByTestId('more-vert-button'));
    });
    // Click delete
    act(() => {
      fireEvent.click(getByText('Delete Plan'));
    });
    await act(async () => {
      fireEvent.click(getByText('Delete'));
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.deletePlan).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.deletePlan).toHaveBeenCalledWith({
      id: mockPlan.id,
    });
  });
});
