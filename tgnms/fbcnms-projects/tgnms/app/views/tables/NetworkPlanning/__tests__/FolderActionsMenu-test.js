/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
import {act, fireEvent, render, within} from '@testing-library/react';

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
  updateFolder: jest.fn(),
}));

describe('FolderActionsMenu', () => {
  it('should delete a project', async () => {
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
      fireEvent.click(within(getByTestId('delete-modal')).getByText('Delete'));
    });

    expect(mockNetworkPlanningAPIUtil.deleteFolder).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.deleteFolder).toHaveBeenCalledWith({
      folderId: '10',
    });
  });
  it('should rename a project', async () => {
    const mockOnComplete = jest.fn();
    const mockFolder = mockNetworkFolder({id: 10, name: 'MyName'});
    const {getByText, getByTestId, getByPlaceholderText} = render(
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
      fireEvent.click(getByText('Rename'));
    });
    act(() => {
      fireEvent.change(getByPlaceholderText('Project Name'), {
        target: {value: 'My New Name'},
      });
    });
    await act(async () => {
      fireEvent.click(within(getByTestId('rename-modal')).getByText('Rename'));
    });
    expect(mockNetworkPlanningAPIUtil.updateFolder).toHaveBeenCalledTimes(1);
    expect(mockNetworkPlanningAPIUtil.updateFolder).toHaveBeenCalledWith({
      id: mockFolder.id,
      name: 'My New Name',
    });
  });

  it('should open the create a plan modal', async () => {
    const mockOnComplete = jest.fn();
    const mockFolder = mockNetworkFolder({id: 10, name: 'MyName'});
    const {getByText, getByTestId} = render(
      <TestApp>
        <FolderActionsMenu folder={mockFolder} onComplete={mockOnComplete} />
      </TestApp>,
    );
    act(() => {
      fireEvent.click(getByTestId('more-vert-button'));
    });
    await act(async () => {
      fireEvent.click(getByText('Add Plan'));
    });
    expect(
      within(getByTestId('create-plan-modal')).queryByText(
        'Please select a project first',
      ),
    ).not.toBeInTheDocument();
  });
});
