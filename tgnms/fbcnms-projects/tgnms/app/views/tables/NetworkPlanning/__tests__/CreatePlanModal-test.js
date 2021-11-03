/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import CreatePlanModal from '../CreatePlanModal';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  mockNetworkPlan,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, within} from '@testing-library/react';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {selectAutocompleteItem} from '@fbcnms/tg-nms/app/tests/testHelpers';
import type {AddJestTypes} from 'jest';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');
const apiMock: $ObjMapi<
  typeof networkPlanningAPIUtilMock,
  AddJestTypes,
> = networkPlanningAPIUtilMock;

describe('CreatePlanModal', () => {
  it('should copy a plan and its input files', async () => {
    const myPlan = mockNetworkPlan({
      id: 10,
      folderId: 111,
      name: 'MyPlan',
      dsmFile: convertType<InputFile>({id: 11}),
      boundaryFile: convertType<InputFile>({id: 22}),
      sitesFile: convertType<InputFile>({id: 33}),
    });
    apiMock.getPlansInFolder.mockImplementation(() => [myPlan]);
    apiMock.getPlan.mockImplementation(() => myPlan);

    const {getByText, getByTestId, getByLabelText} = await renderAsync(
      <TestApp>
        <NetworkPlanningContextProvider
          folders={{
            [1]: {id: 111, name: 'MyFolder'},
          }}>
          <CreatePlanModal isOpen={true} onClose={() => {}} />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );

    // Select the folder.
    const folderAC = within(getByTestId('folderId-autocomplete')).getByRole(
      'textbox',
    );
    selectAutocompleteItem(folderAC, 'MyFolder');

    // Select "Copy Existing"
    await act(async () => fireEvent.click(getByLabelText('Copy Existing')));

    // Select the plan to copy.
    const planAC = within(getByTestId('paramSourceId-autocomplete')).getByRole(
      'textbox',
    );
    selectAutocompleteItem(planAC, 'MyPlan');

    // Copy the plan
    await act(() => {
      fireEvent.click(getByText('Continue'));
    });

    expect(apiMock.createPlan).toBeCalledWith({
      name: 'MyPlan V2',
      folderId: 111,
      dsmFileId: 11,
      boundaryFileId: 22,
      sitesFileId: 33,
    });
  });

  it('should not copy from existing plan', async () => {
    const myPlan = mockNetworkPlan({
      id: 10,
      folderId: 111,
      name: 'MyPlan',
      dsmFile: convertType<InputFile>({id: 11}),
      boundaryFile: convertType<InputFile>({id: 22}),
      sitesFile: convertType<InputFile>({id: 33}),
    });
    apiMock.getPlansInFolder.mockImplementation(() => [myPlan]);
    apiMock.getPlan.mockImplementation(() => myPlan);

    const {getByText, getByTestId, getByLabelText} = await renderAsync(
      <TestApp>
        <NetworkPlanningContextProvider
          folders={{
            [1]: {id: 111, name: 'MyFolder'},
          }}>
          <CreatePlanModal isOpen={true} onClose={() => {}} />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );

    // Select the folder.
    const folderAC = within(getByTestId('folderId-autocomplete')).getByRole(
      'textbox',
    );
    selectAutocompleteItem(folderAC, 'MyFolder');

    // Select "Copy Existing"
    await act(async () => fireEvent.click(getByLabelText('Copy Existing')));

    // Select the plan to copy.
    const planAC = within(getByTestId('paramSourceId-autocomplete')).getByRole(
      'textbox',
    );
    selectAutocompleteItem(planAC, 'MyPlan');

    // Change my mind, select "Create New"
    await act(async () => fireEvent.click(getByLabelText('Create New')));

    // Set new name
    fireEvent.change(getByLabelText('Plan Name'), {
      target: {value: 'My New Plan'},
    });

    // Create the plan
    await act(() => {
      fireEvent.click(getByText('Continue'));
    });

    expect(apiMock.createPlan).toBeCalledWith({
      name: 'My New Plan',
      folderId: 111,
    });
  });
});
