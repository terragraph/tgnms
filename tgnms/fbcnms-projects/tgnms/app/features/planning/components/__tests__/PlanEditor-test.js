/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as apiUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import PlanEditor from '../PlanEditor';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  coerceClass,
  mockInputFile,
  mockNetworkPlan,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {manageInputFileUpload} from '@fbcnms/tg-nms/app/tests/helpers/planningHelpers';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');

const commonProps: $Shape<React.ElementConfig<typeof PlanEditor>> = {
  folderId: '1',
  plan: mockNetworkPlan(),
  onPlanUpdated: jest.fn(),
  onPlanLaunched: jest.fn(),
};

const FILES_BY_ROLE: {[string]: Array<InputFile>} = {
  [FILE_ROLE.DSM_GEOTIFF]: [
    {
      id: 1,
      name: 'dsm-1',
      role: FILE_ROLE.DSM_GEOTIFF,
    },
    {
      id: 2,
      name: 'dsm-2',
      role: FILE_ROLE.DSM_GEOTIFF,
    },
  ],
  [FILE_ROLE.URBAN_SITE_FILE]: [
    {
      id: 3,
      name: 'sites-1',
      role: FILE_ROLE.URBAN_SITE_FILE,
    },
    {
      id: 4,
      name: 'sites-2',
      role: FILE_ROLE.URBAN_SITE_FILE,
    },
  ],
  [FILE_ROLE.BOUNDARY_FILE]: [
    {
      id: 5,
      name: 'boundary-1',
      role: FILE_ROLE.BOUNDARY_FILE,
    },
    {
      id: 6,
      name: 'boundary-2',
      role: FILE_ROLE.BOUNDARY_FILE,
    },
  ],
};
jest
  .spyOn(apiUtilMock, 'getInputFiles')
  .mockImplementation(({role}) => Promise.resolve(FILES_BY_ROLE[role]));
test('initializes the form with the plan', async () => {
  const mockPlan = mockNetworkPlan({
    dsmFile: mockInputFile({
      id: 1,
      name: 'dsm.tiff',
    }),
    sitesFile: mockInputFile({
      id: 2,
      name: 'sites.csv',
    }),
    boundaryFile: mockInputFile({
      id: 3,
      name: 'boundary.kml',
    }),
  });
  const {getByLabelText} = await renderTest({plan: mockPlan});
  expect(coerceClass(getByLabelText('Plan Name'), HTMLInputElement).value).toBe(
    'test plan',
  );
  expect(coerceClass(getByLabelText('DSM File'), HTMLInputElement).value).toBe(
    mockPlan.dsmFile?.name?.toString(),
  );
  expect(
    coerceClass(getByLabelText(/^Sites File$/i), HTMLInputElement).value,
  ).toBe(mockPlan.sitesFile?.name.toString());
  expect(
    coerceClass(getByLabelText('Boundary File'), HTMLInputElement).value,
  ).toBe(mockPlan.boundaryFile?.name?.toString());
});

test('shows a loading spinner when the plan is launching', async () => {
  const mockPlan = mockNetworkPlan({
    state: NETWORK_PLAN_STATE.UPLOADING_INPUTS, // in launching state
  });
  const {queryByText, queryByTestId} = await renderTest({plan: mockPlan});
  expect(queryByText('Start Plan')).not.toBeInTheDocument();
  expect(queryByTestId('launch-loading-circle')).toBeInTheDocument();
});

test('Uploading new files adds them to the form state', async () => {
  const updatePlanMock = jest
    .spyOn(apiUtilMock, 'updatePlan')
    .mockImplementation(() => Promise.resolve());
  let _fileidCounter = 1;
  jest
    .spyOn(apiUtilMock, 'createInputFile')
    .mockImplementation(file => ({id: _fileidCounter++, ...file}));
  jest
    .spyOn(apiUtilMock, 'uploadInputFileData')
    .mockImplementationOnce(() => Promise.resolve());
  const renderResult = await renderTest();
  const {getByLabelText} = renderResult;

  await manageInputFileUpload(
    renderResult,
    renderResult.getByLabelText(/dsm file/i),
    {
      name: 'dsm.tiff',
      size: 100000,
    },
  );
  await manageInputFileUpload(
    renderResult,
    renderResult.getByLabelText(/sites file/i),
    {
      name: 'sites-file.csv',
      size: 1000,
    },
  );
  await manageInputFileUpload(
    renderResult,
    renderResult.getByLabelText(/boundary file/i),
    {
      name: 'boundary.kml',
      size: 10000,
    },
  );
  // let the debounce trigger and save the plan.
  await new Promise(resolve => setTimeout(resolve, 1000));

  expect(coerceClass(getByLabelText('DSM File'), HTMLInputElement).value).toBe(
    'dsm.tiff',
  );
  expect(
    coerceClass(getByLabelText(/^Sites File$/i), HTMLInputElement).value,
  ).toBe('sites-file.csv');
  expect(
    coerceClass(getByLabelText('Boundary File'), HTMLInputElement).value,
  ).toBe('boundary.kml');
  expect(updatePlanMock).toHaveBeenCalledWith({
    id: 1,
    name: 'test plan',
    dsmFileId: 1,
    sitesFileId: 2,
    boundaryFileId: 3,
  });
});

function renderTest(props?: $Shape<React.ElementConfig<typeof PlanEditor>>) {
  return renderAsync(
    <TestApp>
      <NetworkPlanningContextProvider>
        <PlanEditor {...commonProps} {...props} />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
