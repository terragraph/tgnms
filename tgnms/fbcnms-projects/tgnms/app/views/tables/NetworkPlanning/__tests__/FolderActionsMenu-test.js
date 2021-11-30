/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as mockNetworkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import FolderActionsMenu from '../FolderActionsMenu';
import {
  TestApp,
  mockInputFile,
  mockNetworkFolder,
  mockNetworkPlan,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil', () => ({
  getPlansInFolder: jest.fn().mockImplementation(() => [
    mockNetworkPlan({
      id: 21,
      dsmFile: mockInputFile({id: 31}),
      sitesFile: mockInputFile({id: 41}),
    }),
    mockNetworkPlan({
      id: 22,
      dsmFile: mockInputFile({id: 31}),
      sitesFile: mockInputFile({id: 42}),
    }),
  ]),
  deletePlan: jest.fn(),
  deleteInputFile: jest.fn(),
  deleteFolder: jest.fn(),
}));

describe('FolderActionsMenu', () => {
  it('should delete a plan', async () => {
    const mockOnComplete = jest.fn();
    const mockFolder = mockNetworkFolder({id: 10});
    const {getByText, getByTestId} = render(
      <TestApp>
        <FolderActionsMenu folder={mockFolder} onComplete={mockOnComplete} />
      </TestApp>,
    );

    // Open menu.
    act(() => {
      fireEvent.click(getByTestId('more-vert-button'));
    });
    // Click delete
    act(() => {
      fireEvent.click(getByText('Delete Project'));
    });
    await act(async () => {
      fireEvent.click(getByText('Delete'));
    });

    expect(mockNetworkPlanningAPIUtil.deleteFolder).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.deleteFolder).toHaveBeenCalledWith({
      folderId: '10',
    });
  });
});
